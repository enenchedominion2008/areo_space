import type { BackendState, GameCheckpointPayload, JetId, SaveSlotRecord } from '../game/types';

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
    throw new Error(errBody.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchBackendState(): Promise<BackendState> {
  return requestJson<BackendState>('/api/state');
}

export async function saveCheckpointToPython(
  slotId: string,
  pilotName: string,
  checkpoint: GameCheckpointPayload
): Promise<{ ok: boolean; slot_id: string; updated_at: string; state: BackendState }> {
  return requestJson('/api/save', {
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
}

export async function loadCheckpointFromPython(slotId: string): Promise<SaveSlotRecord> {
  const res = await requestJson<{ slot: SaveSlotRecord }>(`/api/load?slot=${encodeURIComponent(slotId)}`);
  return res.slot;
}

export async function deleteCheckpointFromPython(slotId: string): Promise<BackendState> {
  const res = await requestJson<{ ok: boolean; state: BackendState }>(
    `/api/save?slot=${encodeURIComponent(slotId)}`,
    { method: 'DELETE' }
  );
  return res.state;
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
  return requestJson('/api/score', {
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
}

export async function purchaseUpgradeFromPython(
  type: 'hull_upgrade' | 'shield_upgrade' | 'laser_upgrade'
): Promise<BackendState> {
  const res = await requestJson<{ ok: boolean; state: BackendState }>('/api/upgrade', {
    method: 'POST',
    body: JSON.stringify({ type }),
  });
  return res.state;
}

export async function selectJetInPython(jetId: JetId): Promise<BackendState> {
  const res = await requestJson<{ ok: boolean; state: BackendState }>('/api/jet', {
    method: 'POST',
    body: JSON.stringify({ jet_id: jetId }),
  });
  return res.state;
}

export async function reviveRunWithCredits(): Promise<BackendState> {
  const res = await requestJson<{ ok: boolean; cost: number; state: BackendState }>('/api/revive', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return res.state;
}

export async function updatePilotNameInPython(pilotName: string): Promise<BackendState> {
  const res = await requestJson<{ ok: boolean; state: BackendState }>('/api/pilot', {
    method: 'POST',
    body: JSON.stringify({ pilot_name: pilotName }),
  });
  return res.state;
}
