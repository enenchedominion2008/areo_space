import crypto from 'node:crypto';
import type http from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import {
  CYBER_MODS,
  JET_SKINS,
  JETS,
  PILOT_RANKS,
  TRAIL_COLORS,
  type CyberModId,
  type JetId,
  type JetSkinId,
  type PilotRankId,
  type TrailColorId,
} from '../src/game/types.ts';
import {
  MAX_COOP_PLAYERS,
  type CoopClientToServerMessage,
  type CoopServerToClientMessage,
  type OpenRoomListing,
  type RoomPlayerInfo,
  type RoomPlayerProfile,
  type RoomStatePayload,
  type RoomStatus,
} from '../src/game/multiplayerTypes.ts';

interface ClientConn {
  playerId: string;
  ws: WebSocket;
  roomCode: string | null;
  alive: boolean;
  missedPings: number;
}

interface CoopRoom {
  code: string;
  status: RoomStatus;
  startLevel: number;
  hostId: string;
  players: RoomPlayerInfo[];
  createdAt: number;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const VALID_JETS = new Set(Object.keys(JETS));
const VALID_SKINS = new Set(Object.keys(JET_SKINS));
const VALID_TRAILS = new Set(Object.keys(TRAIL_COLORS));
const VALID_MODS = new Set(Object.keys(CYBER_MODS));
const VALID_RANKS = new Set(Object.keys(PILOT_RANKS));
const VALID_ABILITIES = new Set(['afterburner', 'special', 'shield_pulse', 'roll', 'missile']);

function sanitizePilotName(raw: unknown): string {
  if (typeof raw !== 'string') return 'VANGUARD-01';
  const cleaned = raw.replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 18);
  return cleaned || 'VANGUARD-01';
}

function sanitizeProfile(raw: unknown): RoomPlayerProfile {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const jetId: JetId = typeof obj.jetId === 'string' && VALID_JETS.has(obj.jetId) ? (obj.jetId as JetId) : 'vanguard';
  const skinId: JetSkinId =
    typeof obj.skinId === 'string' && VALID_SKINS.has(obj.skinId) ? (obj.skinId as JetSkinId) : 'factory';
  const trailId: TrailColorId =
    typeof obj.trailId === 'string' && VALID_TRAILS.has(obj.trailId) ? (obj.trailId as TrailColorId) : 'jet_default';
  const pilotRank: PilotRankId =
    typeof obj.pilotRank === 'string' && VALID_RANKS.has(obj.pilotRank) ? (obj.pilotRank as PilotRankId) : 'cadet';

  const equippedMods: CyberModId[] = [];
  if (Array.isArray(obj.equippedMods)) {
    for (const item of obj.equippedMods) {
      if (typeof item === 'string' && VALID_MODS.has(item) && !equippedMods.includes(item as CyberModId)) {
        equippedMods.push(item as CyberModId);
        if (equippedMods.length >= 2) break;
      }
    }
  }

  return {
    pilotName: sanitizePilotName(obj.pilotName),
    pilotRank,
    jetId,
    skinId,
    trailId,
    equippedMods,
  };
}

function normalizeRoomCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{4}$/.test(code) ? code : null;
}

function clampNumber(val: unknown, min: number, max: number, fallback = 0): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, val));
}

export function attachCoopWebSocketServer(httpServer: http.Server): () => void {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 32 * 1024,
  });

  const clients = new Map<string, ClientConn>();
  const rooms = new Map<string, CoopRoom>();
  const pendingLobbyRemovals = new Map<string, ReturnType<typeof setTimeout>>();

  function clearPendingRemoval(roomCode: string, pId: string): void {
    const key = `${roomCode}:${pId}`;
    const timer = pendingLobbyRemovals.get(key);
    if (timer) {
      clearTimeout(timer);
      pendingLobbyRemovals.delete(key);
    }
  }

  function generateRoomCode(): string {
    for (let attempt = 0; attempt < 40; attempt++) {
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
      }
      if (!rooms.has(code)) return code;
    }
    return crypto.randomBytes(2).toString('hex').toUpperCase();
  }

  function sendTo(ws: WebSocket, msg: CoopServerToClientMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function toRoomPayload(room: CoopRoom): RoomStatePayload {
    return {
      code: room.code,
      status: room.status,
      startLevel: room.startLevel,
      hostId: room.hostId,
      maxPlayers: MAX_COOP_PLAYERS,
      players: room.players.map((p) => ({ ...p, equippedMods: [...p.equippedMods] })),
    };
  }

  function broadcastRoomState(room: CoopRoom): void {
    const payload = toRoomPayload(room);
    for (const p of room.players) {
      const conn = clients.get(p.playerId);
      if (conn) {
        sendTo(conn.ws, { type: 'room:state', room: payload, yourId: p.playerId });
      }
    }
  }

  function sendOpenRooms(ws: WebSocket): void {
    const list: OpenRoomListing[] = [];
    for (const room of rooms.values()) {
      if (room.status === 'lobby' && room.players.length > 0 && room.players.length < MAX_COOP_PLAYERS) {
        const host = room.players.find((p) => p.playerId === room.hostId) || room.players[0];
        list.push({
          code: room.code,
          hostName: host.pilotName,
          hostRank: host.pilotRank || 'cadet',
          hostJet: host.jetId,
          startLevel: room.startLevel,
          playersCount: room.players.length,
          maxPlayers: MAX_COOP_PLAYERS,
        });
      }
    }
    sendTo(ws, { type: 'room:list_result', rooms: list });
  }

  function broadcastOpenRoomsToIdle(): void {
    for (const conn of clients.values()) {
      if (!conn.roomCode) {
        sendOpenRooms(conn.ws);
      }
    }
  }

  function removePlayerFromRoom(conn: ClientConn, reason: string, immediate = false): void {
    if (!conn.roomCode) return;
    const roomCode = conn.roomCode;
    const room = rooms.get(roomCode);
    conn.roomCode = null;
    if (!room) return;

    const leaving = room.players.find((p) => p.playerId === conn.playerId);
    if (!leaving) return;

    // Give lobby pilots a 45-second grace window on accidental drops (e.g. mobile app-switch to share code)
    if (!immediate && room.status === 'lobby') {
      leaving.connected = false;
      clearPendingRemoval(roomCode, conn.playerId);
      const timer = setTimeout(() => {
        pendingLobbyRemovals.delete(`${roomCode}:${conn.playerId}`);
        const liveRoom = rooms.get(roomCode);
        if (!liveRoom || liveRoom.status !== 'lobby') return;
        const target = liveRoom.players.find((p) => p.playerId === conn.playerId);
        if (!target || target.connected) return;

        liveRoom.players = liveRoom.players.filter((p) => p.playerId !== conn.playerId);
        if (liveRoom.players.length === 0) {
          rooms.delete(roomCode);
          broadcastOpenRoomsToIdle();
          return;
        }
        const survivor = liveRoom.players[0];
        survivor.slot = 1;
        liveRoom.hostId = survivor.playerId;
        broadcastRoomState(liveRoom);
        broadcastOpenRoomsToIdle();
      }, 45000);
      pendingLobbyRemovals.set(`${roomCode}:${conn.playerId}`, timer);
      broadcastRoomState(room);
      return;
    }

    clearPendingRemoval(roomCode, conn.playerId);
    room.players = room.players.filter((p) => p.playerId !== conn.playerId);

    if (room.players.length === 0) {
      rooms.delete(room.code);
      broadcastOpenRoomsToIdle();
      return;
    }

    // Remaining pilot
    const survivor = room.players[0];
    survivor.slot = 1;
    room.hostId = survivor.playerId;

    const survivorConn = clients.get(survivor.playerId);
    if (room.status === 'playing') {
      room.status = 'lobby';
      survivor.ready = false;
      if (survivorConn) {
        sendTo(survivorConn.ws, {
          type: 'coop:partner_left',
          reason: `${leaving.pilotName} disconnected (${reason})`,
        });
      }
    }

    broadcastRoomState(room);
    broadcastOpenRoomsToIdle();
  }

  function relayToPartner(room: CoopRoom, senderId: string, msg: CoopServerToClientMessage): void {
    for (const p of room.players) {
      if (p.playerId !== senderId) {
        const partnerConn = clients.get(p.playerId);
        if (partnerConn) {
          sendTo(partnerConn.ws, msg);
        }
      }
    }
  }

  wss.on('connection', (ws: WebSocket) => {
    const playerId = crypto.randomUUID();
    const conn: ClientConn = { playerId, ws, roomCode: null, alive: true, missedPings: 0 };
    clients.set(playerId, conn);

    sendTo(ws, { type: 'ws:welcome', playerId });
    sendOpenRooms(ws);

    ws.on('pong', () => {
      conn.alive = true;
      conn.missedPings = 0;
    });

    ws.on('message', (rawData) => {
      conn.alive = true;
      conn.missedPings = 0;

      let msg: CoopClientToServerMessage;
      try {
        msg = JSON.parse(rawData.toString()) as CoopClientToServerMessage;
      } catch {
        sendTo(ws, { type: 'room:error', message: 'Invalid WebSocket message format' });
        return;
      }
      if (!msg || typeof msg.type !== 'string') return;

      if (msg.type === 'ws:ping') {
        sendTo(ws, { type: 'ws:pong' });
        return;
      }

      if (msg.type === 'room:list') {
        sendOpenRooms(ws);
        return;
      }

      if (msg.type === 'room:create') {
        if (conn.roomCode) {
          removePlayerFromRoom(conn, 'switched rooms', true);
        }
        const profile = sanitizeProfile(msg.profile);
        const startLevel = Math.round(clampNumber(msg.startLevel, 1, 30, 1));
        const code = generateRoomCode();
        const playerInfo: RoomPlayerInfo = {
          ...profile,
          playerId,
          slot: 1,
          ready: true,
          connected: true,
        };
        const room: CoopRoom = {
          code,
          status: 'lobby',
          startLevel,
          hostId: playerId,
          players: [playerInfo],
          createdAt: Date.now(),
        };
        rooms.set(code, room);
        conn.roomCode = code;
        broadcastRoomState(room);
        broadcastOpenRoomsToIdle();
        return;
      }

      if (msg.type === 'room:join') {
        const code = normalizeRoomCode(msg.code);
        if (!code) {
          sendTo(ws, { type: 'room:error', message: 'Enter a valid 4-character room code.' });
          return;
        }
        const targetRoom = rooms.get(code);
        if (!targetRoom) {
          sendTo(ws, { type: 'room:error', message: `Squadron room ${code} not found.` });
          return;
        }
        if (targetRoom.players.some((p) => p.playerId === playerId)) {
          broadcastRoomState(targetRoom);
          return;
        }
        if (targetRoom.players.length >= MAX_COOP_PLAYERS) {
          sendTo(ws, {
            type: 'room:error',
            message: `Room ${code} is full (2/2 pilots already connected).`,
          });
          return;
        }
        if (targetRoom.status !== 'lobby') {
          sendTo(ws, {
            type: 'room:error',
            message: `Room ${code} is currently mid-mission.`,
          });
          return;
        }

        if (conn.roomCode) {
          removePlayerFromRoom(conn, 'joined another room', true);
        }

        const profile = sanitizeProfile(msg.profile);
        const slot: 1 | 2 = targetRoom.players.some((p) => p.slot === 1) ? 2 : 1;
        const playerInfo: RoomPlayerInfo = {
          ...profile,
          playerId,
          slot,
          ready: false,
          connected: true,
        };
        targetRoom.players.push(playerInfo);
        targetRoom.players.sort((a, b) => a.slot - b.slot);
        conn.roomCode = code;
        broadcastRoomState(targetRoom);
        broadcastOpenRoomsToIdle();
        return;
      }

      if (msg.type === 'room:rejoin') {
        const code = normalizeRoomCode(msg.code);
        const prevId = typeof msg.previousPlayerId === 'string' ? msg.previousPlayerId : '';
        if (!code || !prevId) return;
        const targetRoom = rooms.get(code);
        if (!targetRoom || targetRoom.status !== 'lobby') {
          sendOpenRooms(ws);
          return;
        }
        const existing = targetRoom.players.find((p) => p.playerId === prevId);
        if (!existing) {
          sendOpenRooms(ws);
          return;
        }
        clearPendingRemoval(code, prevId);
        const clean = sanitizeProfile(msg.profile);
        if (targetRoom.hostId === prevId) {
          targetRoom.hostId = playerId;
        }
        existing.playerId = playerId;
        existing.connected = true;
        existing.pilotName = clean.pilotName;
        existing.pilotRank = clean.pilotRank;
        existing.jetId = clean.jetId;
        existing.skinId = clean.skinId;
        existing.trailId = clean.trailId;
        existing.equippedMods = clean.equippedMods;
        conn.roomCode = code;
        broadcastRoomState(targetRoom);
        broadcastOpenRoomsToIdle();
        return;
      }

      if (msg.type === 'room:leave') {
        removePlayerFromRoom(conn, 'left squadron', true);
        sendOpenRooms(ws);
        return;
      }

      // All remaining actions require an active room
      if (!conn.roomCode) return;
      const room = rooms.get(conn.roomCode);
      if (!room) {
        conn.roomCode = null;
        return;
      }
      const sender = room.players.find((p) => p.playerId === playerId);
      if (!sender) return;

      if (msg.type === 'room:profile') {
        const clean = sanitizeProfile(msg.profile);
        sender.pilotName = clean.pilotName;
        sender.pilotRank = clean.pilotRank;
        sender.jetId = clean.jetId;
        sender.skinId = clean.skinId;
        sender.trailId = clean.trailId;
        sender.equippedMods = clean.equippedMods;
        broadcastRoomState(room);
        if (room.status === 'lobby') broadcastOpenRoomsToIdle();
        return;
      }

      if (msg.type === 'room:ready') {
        if (room.status !== 'lobby') return;
        sender.ready = Boolean(msg.ready);
        broadcastRoomState(room);
        return;
      }

      if (msg.type === 'room:set_level') {
        if (room.status !== 'lobby' || playerId !== room.hostId) return;
        room.startLevel = Math.round(clampNumber(msg.startLevel, 1, 30, 1));
        broadcastRoomState(room);
        broadcastOpenRoomsToIdle();
        return;
      }

      if (msg.type === 'game:start') {
        if (room.status !== 'lobby' || playerId !== room.hostId) return;
        if (room.players.length !== MAX_COOP_PLAYERS) {
          sendTo(ws, {
            type: 'room:error',
            message: 'Waiting for Pilot 2 to connect (2 pilots required).',
          });
          return;
        }
        const guest = room.players.find((p) => p.playerId !== room.hostId);
        if (guest && !guest.connected) {
          sendTo(ws, {
            type: 'room:error',
            message: `${guest.pilotName} is reconnecting — wait a moment before launch.`,
          });
          return;
        }
        if (guest && !guest.ready) {
          sendTo(ws, {
            type: 'room:error',
            message: `${guest.pilotName} must click READY before launch.`,
          });
          return;
        }
        room.status = 'playing';
        const payload = toRoomPayload(room);
        for (const p of room.players) {
          const c = clients.get(p.playerId);
          if (c) sendTo(c.ws, { type: 'game:started', room: payload });
        }
        broadcastOpenRoomsToIdle();
        return;
      }

      if (msg.type === 'game:return_lobby') {
        if (playerId !== room.hostId) return;
        room.status = 'lobby';
        for (const p of room.players) {
          p.ready = p.playerId === room.hostId;
        }
        const payload = toRoomPayload(room);
        for (const p of room.players) {
          const c = clients.get(p.playerId);
          if (c) sendTo(c.ws, { type: 'game:returned_lobby', room: payload });
        }
        broadcastOpenRoomsToIdle();
        return;
      }

      if (room.status !== 'playing') return;

      if (msg.type === 'coop:player_state') {
        const s = msg.state;
        if (!s || typeof s !== 'object') return;
        relayToPartner(room, playerId, {
          type: 'coop:player_state',
          state: {
            playerId,
            slot: sender.slot,
            x: clampNumber(s.x, -20, 20, 0),
            y: clampNumber(s.y, -12, 12, 0),
            z: clampNumber(s.z, -30, 20, 0),
            rotZ: clampNumber(s.rotZ, -10, 10, 0),
            rotX: clampNumber(s.rotX, -4, 4, 0),
            health: Math.round(clampNumber(s.health, 0, 500, 100)),
            maxHealth: Math.round(clampNumber(s.maxHealth, 1, 500, 100)),
            shield: Math.round(clampNumber(s.shield, 0, 500, 100)),
            maxShield: Math.round(clampNumber(s.maxShield, 1, 500, 100)),
            score: Math.round(clampNumber(s.score, 0, 100_000_000, 0)),
            kills: Math.round(clampNumber(s.kills, 0, 100_000, 0)),
            afterburner: Boolean(s.afterburner),
            specialActive: Boolean(s.specialActive),
            shieldPulse: Boolean(s.shieldPulse),
            wingmenActive: Boolean(s.wingmenActive),
            downed: Boolean(s.downed),
            respawnTimeLeft: clampNumber(s.respawnTimeLeft, 0, 30, 0),
          },
        });
        return;
      }

      if (msg.type === 'coop:shoot') {
        if (!Array.isArray(msg.bolts)) return;
        relayToPartner(room, playerId, {
          type: 'coop:shoot',
          slot: sender.slot,
          bolts: msg.bolts.slice(0, 16),
        });
        return;
      }

      if (msg.type === 'coop:ability') {
        if (typeof msg.kind !== 'string' || !VALID_ABILITIES.has(msg.kind)) return;
        relayToPartner(room, playerId, {
          type: 'coop:ability',
          slot: sender.slot,
          kind: msg.kind,
        });
        return;
      }

      if (msg.type === 'coop:damage_enemy') {
        if (playerId === room.hostId) return;
        const hostConn = clients.get(room.hostId);
        if (hostConn) {
          sendTo(hostConn.ws, {
            type: 'coop:damage_enemy',
            enemyId: Math.round(clampNumber(msg.enemyId, 0, 1_000_000, 0)),
            damage: clampNumber(msg.damage, 0, 500, 0),
            hitX: clampNumber(msg.hitX, -30, 30, 0),
            hitY: clampNumber(msg.hitY, -20, 20, 0),
            hitZ: clampNumber(msg.hitZ, -160, 40, -20),
            shooterSlot: sender.slot,
          });
        }
        return;
      }

      if (msg.type === 'coop:claim_fragment') {
        if (playerId === room.hostId) return;
        const hostConn = clients.get(room.hostId);
        if (hostConn) {
          sendTo(hostConn.ws, {
            type: 'coop:claim_fragment',
            fragmentId: Math.round(clampNumber(msg.fragmentId, 0, 1_000_000, 0)),
            collectorSlot: sender.slot,
          });
        }
        return;
      }

      if (msg.type === 'coop:revive_partner') {
        relayToPartner(room, playerId, {
          type: 'coop:revive_partner',
          targetSlot: msg.targetSlot === 1 ? 1 : 2,
        });
        return;
      }

      // Host-authoritative broadcasts -> Guest
      if (playerId !== room.hostId) return;

      if (msg.type === 'coop:world_sync') {
        relayToPartner(room, playerId, { type: 'coop:world_sync', world: msg.world });
      } else if (msg.type === 'coop:enemy_hit_confirm') {
        relayToPartner(room, playerId, {
          type: 'coop:enemy_hit_confirm',
          enemyId: msg.enemyId,
          killed: msg.killed,
          killerSlot: msg.killerSlot,
          scoreAward: msg.scoreAward,
          x: msg.x,
          y: msg.y,
          z: msg.z,
          kind: msg.kind,
        });
      } else if (msg.type === 'coop:enemy_fire') {
        if (!Array.isArray(msg.bolts)) return;
        relayToPartner(room, playerId, { type: 'coop:enemy_fire', bolts: msg.bolts.slice(0, 32) });
      } else if (msg.type === 'coop:bomb_spawn') {
        relayToPartner(room, playerId, { type: 'coop:bomb_spawn', bomb: msg.bomb });
      } else if (msg.type === 'coop:area_hazard') {
        if (!Array.isArray(msg.hazards)) return;
        relayToPartner(room, playerId, { type: 'coop:area_hazard', hazards: msg.hazards.slice(0, 8) });
      } else if (msg.type === 'coop:match_end') {
        room.status = 'lobby';
        for (const p of room.players) {
          p.ready = p.playerId === room.hostId;
        }
        relayToPartner(room, playerId, { type: 'coop:match_end', summary: msg.summary });
      }
    });

    ws.on('close', () => {
      clients.delete(playerId);
      removePlayerFromRoom(conn, 'connection closed');
    });

    ws.on('error', () => {
      clients.delete(playerId);
      removePlayerFromRoom(conn, 'socket error');
    });
  });

  const onUpgrade = (req: http.IncomingMessage, socket: import('node:stream').Duplex, head: Buffer) => {
    const pathname = (req.url || '').split('?')[0].replace(/\/+$/, '') || '/';
    if (pathname !== '/ws') return;
    socket.on('error', () => {});
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  };

  httpServer.on('upgrade', onUpgrade);

  const heartbeat = setInterval(() => {
    for (const [id, conn] of clients.entries()) {
      if (!conn.alive) {
        conn.missedPings += 1;
        if (conn.missedPings >= 3) {
          conn.ws.terminate();
          clients.delete(id);
          removePlayerFromRoom(conn, 'timeout');
          continue;
        }
      } else {
        conn.missedPings = 0;
      }
      conn.alive = false;
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.ping();
      }
    }
  }, 30000);

  return () => {
    clearInterval(heartbeat);
    for (const timer of pendingLobbyRemovals.values()) {
      clearTimeout(timer);
    }
    pendingLobbyRemovals.clear();
    httpServer.off('upgrade', onUpgrade);
    wss.close();
  };
}
