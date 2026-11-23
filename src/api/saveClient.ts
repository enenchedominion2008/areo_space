import {
  CYBER_MODS,
  JET_SKINS,
  TRAIL_COLORS,
  type BackendState,
  type CyberModId,
  type GameCheckpointPayload,
  type JetId,
  type JetSkinId,
  type SaveSlotRecord,
  type TrailColorId,
} from '../game/types';

const OFFLINE_CACHE_KEY = 'vanguard_vector_offline_state_v1';

function createDefaultState(): BackendState {
  return {
    profile: {
      id: 1,
      pilot_name: 'VANGUARD-01',
      selected_jet: 'vanguard',
      selected_skin: 'factory',
      selected_trail: 'jet_default',
      unlocked_skins: ['factory'],
      unlocked_trails: ['jet_default'],
      unlocked_mods: [],
      equipped_mods: [],
      high_score: 0,
      best_wave: 1,
      total_kills: 0,
      total_runs: 0,
      credits: 0,
      hull_upgrade: 0,
      shield_upgrade: 0,
      laser_upgrade: 0,
      updated_at: new Date().toISOString(),
    },
    slots: [],
    leaderboard: [],
  };
}

function readCachedState(): BackendState {
  try {
    const raw = window.localStorage.getItem(OFFLINE_CACHE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as BackendState;
    if (!parsed || !parsed.profile) return createDefaultState();
    return parsed;
  } catch {
    return createDefaultState();
  }
}

function writeCachedState(state: BackendState): void {
  try {
    window.localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors
  }
}

class HttpStatusError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new HttpStatusError(res.status, errBody.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function isNetworkOrGatewayError(err: unknown): boolean {
  if (err instanceof HttpStatusError) {
    return err.status >= 502;
  }
  return true;
}

export async function fetchBackendState(): Promise<BackendState> {
  try {
    const state = await requestJson<BackendState>('/api/state');
    writeCachedState(state);
    return state;
  } catch (err) {
    if (!isNetworkOrGatewayError(err)) throw err;
    return readCachedState();
  }
}

export async function saveCheckpointToPython(
  slotId: string,
  pilotName: string,
  checkpoint: GameCheckpointPayload
): Promise<{ ok: boolean; slot_id: string; updated_at: string; state: BackendState }> {
  try {
    const res = await requestJson<{ ok: boolean; slot_id: string; updated_at: string; state: BackendState }>('/api/save', {
      method: 'POST',
      body: JSON.stringify({
        slot_id: slotId,
        pilot_name: pilotName,
        selected_jet: checkpoint.jetId,
        wave: checkpoint.wave,
        score: checkpoint.score,
        multiplier: checkpoint.multiplier,
        health: checkpoint.health,
        max_health: checkpoint.maxHealth,
        shield: checkpoint.shield,
        max_shield: checkpoint.maxShield,
        laser_level: checkpoint.laserLevel,
        kills: checkpoint.kills,
        sector_mode: checkpoint.sectorMode,
        payload: checkpoint,
      }),
    });
    writeCachedState(res.state);
    return res;
  } catch (err) {
    if (!isNetworkOrGatewayError(err)) throw err;
    const now = new Date().toISOString();
    const state = readCachedState();
    const record: SaveSlotRecord = {
      slot_id: slotId,
      pilot_name: pilotName,
      selected_jet: checkpoint.jetId,
      wave: checkpoint.wave,
      score: checkpoint.score,
      multiplier: checkpoint.multiplier,
      health: checkpoint.health,
      max_health: checkpoint.maxHealth,
      shield: checkpoint.shield,
      max_shield: checkpoint.maxShield,
      laser_level: checkpoint.laserLevel,
      kills: checkpoint.kills,
      sector_mode: checkpoint.sectorMode,
      payload: checkpoint,
      updated_at: now,
    };
    const slots = [record, ...state.slots.filter((s) => s.slot_id !== slotId)];
    const nextState: BackendState = {
      ...state,
      slots,
      profile: {
        ...state.profile,
        pilot_name: pilotName,
        selected_jet: checkpoint.jetId,
        high_score: Math.max(state.profile.high_score, checkpoint.score),
        best_wave: Math.max(state.profile.best_wave, checkpoint.wave),
        updated_at: now,
      },
    };
    writeCachedState(nextState);
    return { ok: true, slot_id: slotId, updated_at: now, state: nextState };
  }
}

export async function loadCheckpointFromPython(slotId: string): Promise<SaveSlotRecord> {
  try {
    const res = await requestJson<{ slot: SaveSlotRecord }>(`/api/load?slot=${encodeURIComponent(slotId)}`);
    return res.slot;
  } catch (err) {
    if (!isNetworkOrGatewayError(err)) throw err;
    const found = readCachedState().slots.find((s) => s.slot_id === slotId);
    if (!found) throw new Error('Checkpoint not found offline');
    return found;
  }
}

export async function deleteCheckpointFromPython(slotId: string): Promise<BackendState> {
  try {
    const res = await requestJson<{ ok: boolean; state: BackendState }>(
      `/api/save?slot=${encodeURIComponent(slotId)}`,
      { method: 'DELETE' }
    );
    writeCachedState(res.state);
    return res.state;
  } catch (err) {
    if (!isNetworkOrGatewayError(err)) throw err;
    const state = readCachedState();
    const nextState: BackendState = {
      ...state,
      slots: state.slots.filter((s) => s.slot_id !== slotId),
    };
    writeCachedState(nextState);
    return nextState;
  }
}

export async function submitScoreToPython(params: {
  pilotName: string;
  selectedJet: JetId;
  score: number;
  wave: number;
  kills: number;
  maxMultiplier: number;
  accuracy: number;
  clearAutosave?: boolean;
}): Promise<{ ok: boolean; earned_credits: number; state: BackendState }> {
  try {
    const res = await requestJson<{ ok: boolean; earned_credits: number; state: BackendState }>('/api/score', {
      method: 'POST',
      body: JSON.stringify({
        pilot_name: params.pilotName,
        selected_jet: params.selectedJet,
        score: params.score,
        wave: params.wave,
        kills: params.kills,
        max_multiplier: params.maxMultiplier,
        accuracy: params.accuracy,
        clear_autosave: params.clearAutosave ?? true,
      }),
    });
    writeCachedState(res.state);
    return res;
  } catch (err) {
    if (!isNetworkOrGatewayError(err)) throw err;
    const now = new Date().toISOString();
    const earned = Math.max(15, Math.floor(params.score / 220) + params.kills * 6 + params.wave * 25);
    const state = readCachedState();
    const nextState: BackendState = {
      ...state,
      slots: params.clearAutosave ? state.slots.filter((s) => s.slot_id !== 'autosave') : state.slots,
      leaderboard: [
        {
          id: Date.now(),
          pilot_name: params.pilotName,
          selected_jet: params.selectedJet,
          score: params.score,
          wave: params.wave,
          kills: params.kills,
          max_multiplier: params.maxMultiplier,
          accuracy: params.accuracy,
          created_at: now,
        },
        ...state.leaderboard,
      ]
        .sort((a, b) => b.score - a.score)
        .slice(0, 15),
      profile: {
        ...state.profile,
        pilot_name: params.pilotName,
        selected_jet: params.selectedJet,
        high_score: Math.max(state.profile.high_score, params.score),
        best_wave: Math.max(state.profile.best_wave, params.wave),
        total_kills: state.profile.total_kills + params.kills,
        total_runs: state.profile.total_runs + 1,
        credits: state.profile.credits + earned,
        updated_at: now,
      },
    };
    writeCachedState(nextState);
    return { ok: true, earned_credits: earned, state: nextState };
  }
}

export async function purchaseUpgradeFromPython(
  type: 'hull_upgrade' | 'shield_upgrade' | 'laser_upgrade'
): Promise<BackendState> {
  try {
    const res = await requestJson<{ ok: boolean; state: BackendState }>('/api/upgrade', {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
    writeCachedState(res.state);
    return res.state;
  } catch (err) {
    if (!isNetworkOrGatewayError(err)) throw err;
    const state = readCachedState();
    const currentLvl = state.profile[type];
    if (currentLvl >= 5) throw new Error('Maximum upgrade tier reached');
    const cost = 120 * (currentLvl + 1);
    if (state.profile.credits < cost) throw new Error(`Need ${cost} credits`);
    const nextState: BackendState = {
      ...state,
      profile: {
        ...state.profile,
        [type]: currentLvl + 1,
        credits: state.profile.credits - cost,
        updated_at: new Date().toISOString(),
      },
    };
    writeCachedState(nextState);
    return nextState;
  }
}

export async function selectJetInPython(jetId: JetId): Promise<BackendState> {
  try {
    const res = await requestJson<{ ok: boolean; state: BackendState }>('/api/jet', {
      method: 'POST',
      body: JSON.stringify({ jet_id: jetId }),
    });
    writeCachedState(res.state);
    return res.state;
  } catch (err) {
    if (!isNetworkOrGatewayError(err)) throw err;
    const state = readCachedState();
    const nextState: BackendState = {
      ...state,
      profile: {
        ...state.profile,
        selected_jet: jetId,
        updated_at: new Date().toISOString(),
      },
    };
    writeCachedState(nextState);
    return nextState;
  }
}

export async function setCosmeticInPython(
  kind: 'skin' | 'trail',
  id: JetSkinId | TrailColorId
): Promise<BackendState> {
  try {
    const res = await requestJson<{ ok: boolean; state: BackendState }>('/api/cosmetic', {
      method: 'POST',
      body: JSON.stringify({ kind, id }),
    });
    writeCachedState(res.state);
    return res.state;
  } catch (err) {
    if (!isNetworkOrGatewayError(err)) throw err;
    const state = readCachedState();
    let credits = state.profile.credits;
    if (kind === 'skin') {
      const skinId = id as JetSkinId;
      const spec = JET_SKINS[skinId];
      if (!spec) throw new Error('Unknown skin');
      const unlocked = [...state.profile.unlocked_skins];
      if (!unlocked.includes(skinId)) {
        if (credits < spec.cost) throw new Error(`Need ${spec.cost} credits`);
        credits -= spec.cost;
        unlocked.push(skinId);
      }
      const nextState: BackendState = {
        ...state,
        profile: {
          ...state.profile,
          selected_skin: skinId,
          unlocked_skins: unlocked,
          credits,
          updated_at: new Date().toISOString(),
        },
      };
      writeCachedState(nextState);
      return nextState;
    } else {
      const trailId = id as TrailColorId;
      const spec = TRAIL_COLORS[trailId];
      if (!spec) throw new Error('Unknown trail');
      const unlocked = [...state.profile.unlocked_trails];
      if (!unlocked.includes(trailId)) {
        if (credits < spec.cost) throw new Error(`Need ${spec.cost} credits`);
        credits -= spec.cost;
        unlocked.push(trailId);
      }
      const nextState: BackendState = {
        ...state,
        profile: {
          ...state.profile,
          selected_trail: trailId,
          unlocked_trails: unlocked,
          credits,
          updated_at: new Date().toISOString(),
        },
      };
      writeCachedState(nextState);
      return nextState;
    }
  }
}

export async function manageModInPython(
  modId: CyberModId,
  action: 'buy' | 'toggle'
): Promise<BackendState> {
  try {
    const res = await requestJson<{ ok: boolean; state: BackendState }>('/api/mod', {
      method: 'POST',
      body: JSON.stringify({ mod_id: modId, action }),
    });
    writeCachedState(res.state);
    return res.state;
  } catch (err) {
    if (!isNetworkOrGatewayError(err)) throw err;
    const state = readCachedState();
    const spec = CYBER_MODS[modId];
    if (!spec) throw new Error('Unknown cyber-mod id');
    let credits = state.profile.credits;
    const unlocked = [...state.profile.unlocked_mods];
    let equipped = [...state.profile.equipped_mods];

    if (!unlocked.includes(modId)) {
      if (credits < spec.cost) throw new Error(`Need ${spec.cost} credits`);
      credits -= spec.cost;
      unlocked.push(modId);
      if (equipped.length < 2) equipped.push(modId);
    } else if (action === 'toggle') {
      if (equipped.includes(modId)) {
        equipped = equipped.filter((m) => m !== modId);
      } else {
        if (equipped.length >= 2) equipped.shift();
        equipped.push(modId);
      }
    }

    const nextState: BackendState = {
      ...state,
      profile: {
        ...state.profile,
        unlocked_mods: unlocked,
        equipped_mods: equipped,
        credits,
        updated_at: new Date().toISOString(),
      },
    };
    writeCachedState(nextState);
    return nextState;
  }
}

export async function reviveRunWithCredits(): Promise<BackendState> {
  try {
    const res = await requestJson<{ ok: boolean; cost: number; state: BackendState }>('/api/revive', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    writeCachedState(res.state);
    return res.state;
  } catch (err) {
    if (!isNetworkOrGatewayError(err)) throw err;
    const state = readCachedState();
    if (state.profile.credits < 1000) throw new Error('Need 1000 credits to continue');
    const nextState: BackendState = {
      ...state,
      profile: {
        ...state.profile,
        credits: state.profile.credits - 1000,
        updated_at: new Date().toISOString(),
      },
    };
    writeCachedState(nextState);
    return nextState;
  }
}

export async function updatePilotNameInPython(pilotName: string): Promise<BackendState> {
  const cleanName = pilotName.trim().slice(0, 24) || 'VANGUARD-01';
  try {
    const res = await requestJson<{ ok: boolean; state: BackendState }>('/api/pilot', {
      method: 'POST',
      body: JSON.stringify({ pilot_name: cleanName }),
    });
    writeCachedState(res.state);
    return res.state;
  } catch (err) {
    if (!isNetworkOrGatewayError(err)) throw err;
    const state = readCachedState();
    const nextState: BackendState = {
      ...state,
      profile: {
        ...state.profile,
        pilot_name: cleanName,
        updated_at: new Date().toISOString(),
      },
    };
    writeCachedState(nextState);
    return nextState;
  }
}
