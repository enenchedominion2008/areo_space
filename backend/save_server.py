#!/usr/bin/env python3
"""
Vanguard Vector - Python SQLite Save-State & Telemetry Backend
Zero external dependencies (uses Python 3 standard library: http.server, sqlite3, json).
"""

import argparse
import json
import os
import sqlite3
import sys
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

DB_PATH = os.environ.get(
    "DB_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "game_saves.db"),
)
DB_LOCK = threading.Lock()
VALID_JETS = (
    "vanguard",
    "phantom",
    "valkyrie",
    "chrono",
    "cyber_kitsune",
    "ronin_x",
    "netrunner",
    "shogun_mk9",
)
SKIN_COSTS = {
    "factory": 0,
    "carbon_stealth": 250,
    "solar_gold": 400,
    "holo_magenta": 500,
    "arctic_chrome": 650,
}
TRAIL_COSTS = {
    "jet_default": 0,
    "cyan_ion": 150,
    "crimson_flare": 200,
    "acid_emerald": 250,
    "solar_gold": 300,
    "ultraviolet": 350,
}
MOD_COSTS = {
    "shield_siphon": 220,
    "extended_overdrive": 260,
    "twin_homing_pods": 320,
    "afterburner_capacitor": 240,
    "reactive_plating": 280,
    "fragment_magnet": 180,
}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_column(cur: sqlite3.Cursor, table: str, column: str, definition: str) -> None:
    cur.execute(f"PRAGMA table_info({table})")
    cols = {row[1] for row in cur.fetchall()}
    if column not in cols:
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def init_db() -> None:
    db_directory = os.path.dirname(os.path.abspath(DB_PATH))
    os.makedirs(db_directory, exist_ok=True)
    with DB_LOCK:
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS pilot_profile (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    pilot_name TEXT NOT NULL DEFAULT 'VANGUARD-01',
                    selected_jet TEXT NOT NULL DEFAULT 'vanguard',
                    high_score INTEGER NOT NULL DEFAULT 0,
                    best_wave INTEGER NOT NULL DEFAULT 1,
                    total_kills INTEGER NOT NULL DEFAULT 0,
                    total_runs INTEGER NOT NULL DEFAULT 0,
                    credits INTEGER NOT NULL DEFAULT 0,
                    hull_upgrade INTEGER NOT NULL DEFAULT 0,
                    shield_upgrade INTEGER NOT NULL DEFAULT 0,
                    laser_upgrade INTEGER NOT NULL DEFAULT 0,
                    updated_at TEXT NOT NULL
                )
                """
            )
            ensure_column(cur, "pilot_profile", "selected_jet", "TEXT NOT NULL DEFAULT 'vanguard'")
            ensure_column(cur, "pilot_profile", "selected_skin", "TEXT NOT NULL DEFAULT 'factory'")
            ensure_column(cur, "pilot_profile", "selected_trail", "TEXT NOT NULL DEFAULT 'jet_default'")
            ensure_column(cur, "pilot_profile", "unlocked_skins_json", "TEXT NOT NULL DEFAULT '[\"factory\"]'")
            ensure_column(cur, "pilot_profile", "unlocked_trails_json", "TEXT NOT NULL DEFAULT '[\"jet_default\"]'")
            ensure_column(cur, "pilot_profile", "unlocked_mods_json", "TEXT NOT NULL DEFAULT '[]'")
            ensure_column(cur, "pilot_profile", "equipped_mods_json", "TEXT NOT NULL DEFAULT '[]'")

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS save_slots (
                    slot_id TEXT PRIMARY KEY,
                    pilot_name TEXT NOT NULL,
                    selected_jet TEXT NOT NULL DEFAULT 'vanguard',
                    wave INTEGER NOT NULL,
                    score INTEGER NOT NULL,
                    multiplier INTEGER NOT NULL,
                    health REAL NOT NULL,
                    max_health REAL NOT NULL,
                    shield REAL NOT NULL,
                    max_shield REAL NOT NULL,
                    laser_level INTEGER NOT NULL,
                    kills INTEGER NOT NULL,
                    sector_mode TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            ensure_column(cur, "save_slots", "selected_jet", "TEXT NOT NULL DEFAULT 'vanguard'")

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS high_scores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    pilot_name TEXT NOT NULL,
                    selected_jet TEXT NOT NULL DEFAULT 'vanguard',
                    score INTEGER NOT NULL,
                    wave INTEGER NOT NULL,
                    kills INTEGER NOT NULL,
                    max_multiplier INTEGER NOT NULL,
                    accuracy REAL NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                )
                """
            )
            ensure_column(cur, "high_scores", "selected_jet", "TEXT NOT NULL DEFAULT 'vanguard'")

            cur.execute("SELECT id FROM pilot_profile WHERE id = 1")
            if cur.fetchone() is None:
                cur.execute(
                    """
                    INSERT INTO pilot_profile (
                        id, pilot_name, selected_jet, high_score, best_wave, total_kills, total_runs,
                        credits, hull_upgrade, shield_upgrade, laser_upgrade, updated_at
                    ) VALUES (1, 'VANGUARD-01', 'vanguard', 0, 1, 0, 0, 0, 0, 0, 0, ?)
                    """,
                    (utc_now_iso(),),
                )
            conn.commit()
        finally:
            conn.close()


def fetch_full_state() -> dict:
    with DB_LOCK:
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM pilot_profile WHERE id = 1")
            profile_row = cur.fetchone()
            profile = dict(profile_row) if profile_row else {}
            if profile:
                def parse_list(key: str, fallback: list) -> list:
                    raw = profile.pop(key, None)
                    if not raw:
                        return list(fallback)
                    try:
                        parsed = json.loads(raw)
                        return parsed if isinstance(parsed, list) else list(fallback)
                    except Exception:
                        return list(fallback)

                profile["unlocked_skins"] = parse_list("unlocked_skins_json", ["factory"])
                profile["unlocked_trails"] = parse_list("unlocked_trails_json", ["jet_default"])
                profile["unlocked_mods"] = parse_list("unlocked_mods_json", [])
                profile["equipped_mods"] = parse_list("equipped_mods_json", [])
                profile.setdefault("selected_skin", "factory")
                profile.setdefault("selected_trail", "jet_default")

            cur.execute(
                """
                SELECT slot_id, pilot_name, selected_jet, wave, score, multiplier, health, max_health,
                       shield, max_shield, laser_level, kills, sector_mode, payload_json, updated_at
                FROM save_slots
                ORDER BY updated_at DESC
                """
            )
            slots = []
            for row in cur.fetchall():
                item = dict(row)
                try:
                    item["payload"] = json.loads(item.pop("payload_json"))
                except Exception:
                    item["payload"] = {}
                slots.append(item)

            cur.execute(
                """
                SELECT id, pilot_name, selected_jet, score, wave, kills, max_multiplier, accuracy, created_at
                FROM high_scores
                ORDER BY score DESC, wave DESC
                LIMIT 10
                """
            )
            leaderboard = [dict(r) for r in cur.fetchall()]
            return {
                "profile": profile,
                "slots": slots,
                "leaderboard": leaderboard,
            }
        finally:
            conn.close()


class SaveStateHandler(BaseHTTPRequestHandler):
    server_version = "VanguardPythonSaveServer/2.0"

    def log_message(self, format: str, *args) -> None:
        pass

    def send_json(self, status: int, data: dict) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path == "/api/health":
            self.send_json(
                200,
                {
                    "ok": True,
                    "backend": "python3-sqlite",
                    "python_version": sys.version.split()[0],
                    "db_path": os.path.basename(DB_PATH),
                },
            )
            return

        if path == "/api/state":
            self.send_json(200, fetch_full_state())
            return

        if path == "/api/load":
            slot_id = query.get("slot", ["autosave"])[0]
            with DB_LOCK:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    cur.execute("SELECT * FROM save_slots WHERE slot_id = ?", (slot_id,))
                    row = cur.fetchone()
                    if row is None:
                        self.send_json(404, {"error": f"Save slot '{slot_id}' not found"})
                        return
                    data = dict(row)
                    data["payload"] = json.loads(data.pop("payload_json"))
                    self.send_json(200, {"slot": data})
                finally:
                    conn.close()
            return

        self.send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        try:
            body = self.read_json_body()
        except Exception as exc:
            self.send_json(400, {"error": f"Invalid JSON payload: {exc}"})
            return

        if path == "/api/save":
            slot_id = str(body.get("slot_id") or "autosave")[:32]
            pilot_name = str(body.get("pilot_name") or "VANGUARD-01")[:24]
            selected_jet = str(body.get("selected_jet") or "vanguard")
            if selected_jet not in VALID_JETS:
                selected_jet = "vanguard"
            wave = max(1, min(30, int(body.get("wave", 1))))
            score = max(0, int(body.get("score", 0)))
            multiplier = max(1, int(body.get("multiplier", 1)))
            health = float(body.get("health", 100))
            max_health = float(body.get("max_health", 100))
            shield = float(body.get("shield", 100))
            max_shield = float(body.get("max_shield", 100))
            laser_level = max(1, int(body.get("laser_level", 1)))
            kills = max(0, int(body.get("kills", 0)))
            sector_mode = str(body.get("sector_mode") or "emerald_trench")[:32]
            payload = body.get("payload") or {}
            now = utc_now_iso()

            with DB_LOCK:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    cur.execute(
                        """
                        INSERT INTO save_slots (
                            slot_id, pilot_name, selected_jet, wave, score, multiplier,
                            health, max_health, shield, max_shield,
                            laser_level, kills, sector_mode, payload_json, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(slot_id) DO UPDATE SET
                            pilot_name = excluded.pilot_name,
                            selected_jet = excluded.selected_jet,
                            wave = excluded.wave,
                            score = excluded.score,
                            multiplier = excluded.multiplier,
                            health = excluded.health,
                            max_health = excluded.max_health,
                            shield = excluded.shield,
                            max_shield = excluded.max_shield,
                            laser_level = excluded.laser_level,
                            kills = excluded.kills,
                            sector_mode = excluded.sector_mode,
                            payload_json = excluded.payload_json,
                            updated_at = excluded.updated_at
                        """,
                        (
                            slot_id,
                            pilot_name,
                            selected_jet,
                            wave,
                            score,
                            multiplier,
                            health,
                            max_health,
                            shield,
                            max_shield,
                            laser_level,
                            kills,
                            sector_mode,
                            json.dumps(payload),
                            now,
                        ),
                    )
                    cur.execute(
                        """
                        UPDATE pilot_profile
                        SET pilot_name = ?,
                            selected_jet = ?,
                            high_score = MAX(high_score, ?),
                            best_wave = MAX(best_wave, ?),
                            updated_at = ?
                        WHERE id = 1
                        """,
                        (pilot_name, selected_jet, score, wave, now),
                    )
                    conn.commit()
                finally:
                    conn.close()

            self.send_json(200, {"ok": True, "slot_id": slot_id, "updated_at": now, "state": fetch_full_state()})
            return

        if path == "/api/score":
            pilot_name = str(body.get("pilot_name") or "VANGUARD-01")[:24]
            selected_jet = str(body.get("selected_jet") or "vanguard")
            if selected_jet not in VALID_JETS:
                selected_jet = "vanguard"
            score = max(0, int(body.get("score", 0)))
            wave = max(1, min(30, int(body.get("wave", 1))))
            kills = max(0, int(body.get("kills", 0)))
            max_multiplier = max(1, int(body.get("max_multiplier", 1)))
            accuracy = max(0.0, min(100.0, float(body.get("accuracy", 0.0))))
            earned_credits = max(15, score // 220 + kills * 6 + wave * 25)
            clear_autosave = bool(body.get("clear_autosave", False))
            now = utc_now_iso()

            with DB_LOCK:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    cur.execute(
                        """
                        INSERT INTO high_scores (
                            pilot_name, selected_jet, score, wave, kills, max_multiplier, accuracy, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (pilot_name, selected_jet, score, wave, kills, max_multiplier, accuracy, now),
                    )
                    cur.execute(
                        """
                        UPDATE pilot_profile
                        SET pilot_name = ?,
                            selected_jet = ?,
                            high_score = MAX(high_score, ?),
                            best_wave = MAX(best_wave, ?),
                            total_kills = total_kills + ?,
                            total_runs = total_runs + 1,
                            credits = credits + ?,
                            updated_at = ?
                        WHERE id = 1
                        """,
                        (pilot_name, selected_jet, score, wave, kills, earned_credits, now),
                    )
                    if clear_autosave:
                        cur.execute("DELETE FROM save_slots WHERE slot_id = 'autosave'")
                    conn.commit()
                finally:
                    conn.close()

            self.send_json(200, {"ok": True, "earned_credits": earned_credits, "state": fetch_full_state()})
            return

        if path == "/api/upgrade":
            upgrade_type = str(body.get("type") or "")
            if upgrade_type not in ("hull_upgrade", "shield_upgrade", "laser_upgrade"):
                self.send_json(400, {"error": "Invalid upgrade type"})
                return

            with DB_LOCK:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    cur.execute("SELECT * FROM pilot_profile WHERE id = 1")
                    profile = dict(cur.fetchone())
                    current_lvl = int(profile[upgrade_type])
                    max_lvl = 5
                    if current_lvl >= max_lvl:
                        self.send_json(400, {"error": "Maximum upgrade tier reached"})
                        return
                    cost = 120 * (current_lvl + 1)
                    if int(profile["credits"]) < cost:
                        self.send_json(400, {"error": f"Need {cost} credits"})
                        return

                    cur.execute(
                        f"""
                        UPDATE pilot_profile
                        SET {upgrade_type} = {upgrade_type} + 1,
                            credits = credits - ?,
                            updated_at = ?
                        WHERE id = 1
                        """,
                        (cost, utc_now_iso()),
                    )
                    conn.commit()
                finally:
                    conn.close()

            self.send_json(200, {"ok": True, "state": fetch_full_state()})
            return

        if path == "/api/jet":
            jet_id = str(body.get("jet_id") or "vanguard")
            if jet_id not in VALID_JETS:
                self.send_json(400, {"error": "Unknown jet id"})
                return
            with DB_LOCK:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    cur.execute(
                        "UPDATE pilot_profile SET selected_jet = ?, updated_at = ? WHERE id = 1",
                        (jet_id, utc_now_iso()),
                    )
                    conn.commit()
                finally:
                    conn.close()
            self.send_json(200, {"ok": True, "state": fetch_full_state()})
            return

        if path == "/api/pilot":
            pilot_name = str(body.get("pilot_name") or "VANGUARD-01").strip()[:24] or "VANGUARD-01"
            with DB_LOCK:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    cur.execute(
                        "UPDATE pilot_profile SET pilot_name = ?, updated_at = ? WHERE id = 1",
                        (pilot_name, utc_now_iso()),
                    )
                    conn.commit()
                finally:
                    conn.close()
            self.send_json(200, {"ok": True, "state": fetch_full_state()})
            return

        if path == "/api/revive":
            revive_cost = 1000
            with DB_LOCK:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    cur.execute("SELECT credits FROM pilot_profile WHERE id = 1")
                    row = cur.fetchone()
                    current_credits = int(row["credits"]) if row else 0
                    if current_credits < revive_cost:
                        self.send_json(
                            400,
                            {
                                "error": f"Need {revive_cost} credits to continue (current: {current_credits})"
                            },
                        )
                        return

                    cur.execute(
                        "UPDATE pilot_profile SET credits = credits - ?, updated_at = ? WHERE id = 1",
                        (revive_cost, utc_now_iso()),
                    )
                    conn.commit()
                finally:
                    conn.close()

            self.send_json(200, {"ok": True, "cost": revive_cost, "state": fetch_full_state()})
            return

        if path == "/api/cosmetic":
            kind = str(body.get("kind") or "")
            item_id = str(body.get("id") or "")
            if kind == "skin" and item_id in SKIN_COSTS:
                cost = SKIN_COSTS[item_id]
                unlocked_col = "unlocked_skins_json"
                selected_col = "selected_skin"
                default_list = ["factory"]
            elif kind == "trail" and item_id in TRAIL_COSTS:
                cost = TRAIL_COSTS[item_id]
                unlocked_col = "unlocked_trails_json"
                selected_col = "selected_trail"
                default_list = ["jet_default"]
            else:
                self.send_json(400, {"error": "Unknown cosmetic kind or id"})
                return

            with DB_LOCK:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    cur.execute("SELECT * FROM pilot_profile WHERE id = 1")
                    profile = dict(cur.fetchone())
                    try:
                        unlocked = json.loads(profile.get(unlocked_col) or "[]")
                        if not isinstance(unlocked, list):
                            unlocked = list(default_list)
                    except Exception:
                        unlocked = list(default_list)

                    credits_left = int(profile["credits"])
                    if item_id not in unlocked:
                        if credits_left < cost:
                            self.send_json(400, {"error": f"Need {cost} credits"})
                            return
                        credits_left -= cost
                        unlocked.append(item_id)

                    cur.execute(
                        f"""
                        UPDATE pilot_profile
                        SET {selected_col} = ?,
                            {unlocked_col} = ?,
                            credits = ?,
                            updated_at = ?
                        WHERE id = 1
                        """,
                        (item_id, json.dumps(unlocked), credits_left, utc_now_iso()),
                    )
                    conn.commit()
                finally:
                    conn.close()

            self.send_json(200, {"ok": True, "state": fetch_full_state()})
            return

        if path == "/api/mod":
            mod_id = str(body.get("mod_id") or "")
            action = str(body.get("action") or "toggle")
            if mod_id not in MOD_COSTS:
                self.send_json(400, {"error": "Unknown cyber-mod id"})
                return

            with DB_LOCK:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    cur.execute("SELECT * FROM pilot_profile WHERE id = 1")
                    profile = dict(cur.fetchone())
                    try:
                        unlocked = json.loads(profile.get("unlocked_mods_json") or "[]")
                        if not isinstance(unlocked, list):
                            unlocked = []
                    except Exception:
                        unlocked = []
                    try:
                        equipped = json.loads(profile.get("equipped_mods_json") or "[]")
                        if not isinstance(equipped, list):
                            equipped = []
                    except Exception:
                        equipped = []

                    credits_left = int(profile["credits"])
                    if mod_id not in unlocked:
                        cost = MOD_COSTS[mod_id]
                        if credits_left < cost:
                            self.send_json(400, {"error": f"Need {cost} credits"})
                            return
                        credits_left -= cost
                        unlocked.append(mod_id)
                        if len(equipped) < 2:
                            equipped.append(mod_id)
                    elif action == "toggle":
                        if mod_id in equipped:
                            equipped = [m for m in equipped if m != mod_id]
                        else:
                            if len(equipped) >= 2:
                                equipped.pop(0)
                            equipped.append(mod_id)

                    cur.execute(
                        """
                        UPDATE pilot_profile
                        SET unlocked_mods_json = ?,
                            equipped_mods_json = ?,
                            credits = ?,
                            updated_at = ?
                        WHERE id = 1
                        """,
                        (json.dumps(unlocked), json.dumps(equipped), credits_left, utc_now_iso()),
                    )
                    conn.commit()
                finally:
                    conn.close()

            self.send_json(200, {"ok": True, "state": fetch_full_state()})
            return

        self.send_json(404, {"error": "Not found"})

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/save":
            query = parse_qs(parsed.query)
            slot_id = query.get("slot", [""])[0]
            if not slot_id:
                self.send_json(400, {"error": "Missing slot query param"})
                return
            with DB_LOCK:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    cur.execute("DELETE FROM save_slots WHERE slot_id = ?", (slot_id,))
                    conn.commit()
                finally:
                    conn.close()
            self.send_json(200, {"ok": True, "state": fetch_full_state()})
            return

        self.send_json(404, {"error": "Not found"})


def main() -> None:
    parser = argparse.ArgumentParser(description="Vanguard Vector Python Save Backend")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=3001)
    args = parser.parse_args()

    init_db()
    server = ThreadingHTTPServer((args.host, args.port), SaveStateHandler)
    print(f"[python-backend] SQLite save server listening on http://{args.host}:{args.port} (db: {DB_PATH})", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
