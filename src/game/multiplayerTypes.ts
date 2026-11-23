import type {
  ArenaThemeId,
  BombKind,
  CyberModId,
  EnemyBoltPattern,
  EnemyKind,
  FragmentKind,
  JetId,
  JetSkinId,
  TrailColorId,
} from './types';

export const MAX_COOP_PLAYERS = 2;

export type RoomStatus = 'lobby' | 'playing';
export type BossChasePhase = 'none' | 'entering' | 'active' | 'exiting';
export type PendingAttackKind = 'none' | 'aimed' | 'spread' | 'tracking' | 'area';

export interface RoomPlayerProfile {
  pilotName: string;
  jetId: JetId;
  skinId: JetSkinId;
  trailId: TrailColorId;
  equippedMods: CyberModId[];
}

export interface RoomPlayerInfo extends RoomPlayerProfile {
  playerId: string;
  slot: 1 | 2;
  ready: boolean;
  connected: boolean;
}

export interface RoomStatePayload {
  code: string;
  status: RoomStatus;
  startLevel: number;
  hostId: string;
  maxPlayers: 2;
  players: RoomPlayerInfo[];
}

export interface OpenRoomListing {
  code: string;
  hostName: string;
  hostJet: JetId;
  startLevel: number;
  playersCount: number;
  maxPlayers: 2;
}

export interface CoopPlayerFlightState {
  playerId?: string;
  slot: 1 | 2;
  x: number;
  y: number;
  z: number;
  rotZ: number;
  rotX: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  score: number;
  kills: number;
  afterburner: boolean;
  specialActive: boolean;
  shieldPulse: boolean;
  wingmenActive: boolean;
  downed: boolean;
  respawnTimeLeft: number;
}

export interface CoopEnemySync {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  pendingAttack: PendingAttackKind;
  telegraphTimer: number;
  hitFlash: boolean;
}

export interface CoopFragmentSync {
  id: number;
  kind: FragmentKind;
  x: number;
  y: number;
  z: number;
}

export interface CoopWorldSync {
  wave: number;
  sectorMode: ArenaThemeId;
  waveKills: number;
  waveTotal: number;
  bossName: string | null;
  bossHpRatio: number;
  bossChasePhase: BossChasePhase;
  bossChaseTimer: number;
  enemies: CoopEnemySync[];
  fragments: CoopFragmentSync[];
}

export interface CoopBoltVisual {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  colorHex: number;
  scale: number;
  isMissile: boolean;
}

export interface CoopEnemyBoltPayload {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  pattern: EnemyBoltPattern;
  scale: number;
  isHeavy: boolean;
}

export interface CoopBombPayload {
  kind: BombKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  hp: number;
  fuseTimer: number;
}

export interface CoopAreaHazardPayload {
  x: number;
  y: number;
  radius: number;
  warningDuration: number;
  damage: number;
}

export interface CoopMatchEndPayload {
  victory: boolean;
  wave: number;
  teamScore: number;
  p1Score: number;
  p2Score: number;
  p1Kills: number;
  p2Kills: number;
  p1Name: string;
  p2Name: string;
}

export type CoopClientToServerMessage =
  | { type: 'room:list' }
  | { type: 'room:create'; profile: RoomPlayerProfile; startLevel?: number }
  | { type: 'room:join'; code: string; profile: RoomPlayerProfile }
  | { type: 'room:leave' }
  | { type: 'room:profile'; profile: RoomPlayerProfile }
  | { type: 'room:ready'; ready: boolean }
  | { type: 'room:set_level'; startLevel: number }
  | { type: 'game:start' }
  | { type: 'game:return_lobby' }
  | { type: 'coop:player_state'; state: CoopPlayerFlightState }
  | { type: 'coop:shoot'; bolts: CoopBoltVisual[] }
  | { type: 'coop:ability'; kind: 'afterburner' | 'special' | 'shield_pulse' | 'roll' | 'missile' }
  | { type: 'coop:world_sync'; world: CoopWorldSync }
  | { type: 'coop:damage_enemy'; enemyId: number; damage: number; hitX: number; hitY: number; hitZ: number }
  | {
      type: 'coop:enemy_hit_confirm';
      enemyId: number;
      killed: boolean;
      killerSlot: 1 | 2;
      scoreAward: number;
      x: number;
      y: number;
      z: number;
      kind: EnemyKind;
    }
  | { type: 'coop:claim_fragment'; fragmentId: number }
  | { type: 'coop:enemy_fire'; bolts: CoopEnemyBoltPayload[] }
  | { type: 'coop:bomb_spawn'; bomb: CoopBombPayload }
  | { type: 'coop:area_hazard'; hazards: CoopAreaHazardPayload[] }
  | { type: 'coop:revive_partner'; targetSlot: 1 | 2 }
  | { type: 'coop:match_end'; summary: CoopMatchEndPayload };

export type CoopServerToClientMessage =
  | { type: 'ws:welcome'; playerId: string }
  | { type: 'room:list_result'; rooms: OpenRoomListing[] }
  | { type: 'room:state'; room: RoomStatePayload; yourId: string }
  | { type: 'room:error'; message: string }
  | { type: 'game:started'; room: RoomStatePayload }
  | { type: 'game:returned_lobby'; room: RoomStatePayload }
  | { type: 'coop:partner_left'; reason: string }
  | { type: 'coop:player_state'; state: CoopPlayerFlightState }
  | { type: 'coop:shoot'; slot: 1 | 2; bolts: CoopBoltVisual[] }
  | { type: 'coop:ability'; slot: 1 | 2; kind: 'afterburner' | 'special' | 'shield_pulse' | 'roll' | 'missile' }
  | { type: 'coop:world_sync'; world: CoopWorldSync }
  | { type: 'coop:damage_enemy'; enemyId: number; damage: number; hitX: number; hitY: number; hitZ: number; shooterSlot: 1 | 2 }
  | {
      type: 'coop:enemy_hit_confirm';
      enemyId: number;
      killed: boolean;
      killerSlot: 1 | 2;
      scoreAward: number;
      x: number;
      y: number;
      z: number;
      kind: EnemyKind;
    }
  | { type: 'coop:claim_fragment'; fragmentId: number; collectorSlot: 1 | 2 }
  | { type: 'coop:enemy_fire'; bolts: CoopEnemyBoltPayload[] }
  | { type: 'coop:bomb_spawn'; bomb: CoopBombPayload }
  | { type: 'coop:area_hazard'; hazards: CoopAreaHazardPayload[] }
  | { type: 'coop:revive_partner'; targetSlot: 1 | 2 }
  | { type: 'coop:match_end'; summary: CoopMatchEndPayload };
