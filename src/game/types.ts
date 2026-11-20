export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover' | 'victory';

export type JetId =
  | 'vanguard'
  | 'phantom'
  | 'valkyrie'
  | 'chrono'
  | 'cyber_kitsune'
  | 'ronin_x'
  | 'netrunner'
  | 'shogun_mk9';

export type ArenaThemeId =
  | 'emerald_trench'
  | 'cobalt_tunnel'
  | 'crimson_magma'
  | 'violet_void'
  | 'obsidian_citadel';

export type EnemyKind = 'scout' | 'gunship' | 'bomber' | 'dreadnought';

export type BombKind = 'cluster' | 'mine' | 'torpedo';

export type WeaponPattern = 'twin' | 'spread' | 'stream' | 'plasma' | 'seeker';

export type FragmentKind = 'spread' | 'stream' | 'plasma' | 'seeker' | 'shield' | 'hull';

export interface JetSpec {
  id: JetId;
  name: string;
  codename: string;
  role: string;
  primaryColor: string;
  accentHex: number;
  speedMult: number;
  hullBonus: number;
  shieldBonus: number;
  damageMult: number;
  specialName: string;
  specialDesc: string;
  specialCooldown: number;
  specialDuration: number;
}

export const JETS: Record<JetId, JetSpec> = {
  vanguard: {
    id: 'vanguard',
    name: 'VX-9 VANGUARD',
    codename: 'Violet Striker',
    role: 'Balanced Interceptor',
    primaryColor: '#e879f9',
    accentHex: 0xd946ef,
    speedMult: 1.0,
    hullBonus: 0,
    shieldBonus: 0,
    damageMult: 1.0,
    specialName: 'HYPER OVERDRIVE',
    specialDesc: 'Unleashes 2x fire rate + quad overdrive laser burst for 5s.',
    specialCooldown: 11,
    specialDuration: 5,
  },
  phantom: {
    id: 'phantom',
    name: 'SF-12 PHANTOM',
    codename: 'Cyan Ghost',
    role: 'High-Agility Stealth',
    primaryColor: '#38bdf8',
    accentHex: 0x38bdf8,
    speedMult: 1.24,
    hullBonus: -10,
    shieldBonus: 20,
    damageMult: 0.95,
    specialName: 'EMP SHOCKWAVE',
    specialDesc: 'Detonates a cyan pulse that clears all enemy bombs/bolts & damages hostiles.',
    specialCooldown: 13,
    specialDuration: 1.2,
  },
  valkyrie: {
    id: 'valkyrie',
    name: 'KR-7 VALKYRIE',
    codename: 'Crimson Siege',
    role: 'Heavy Gunship',
    primaryColor: '#fb7185',
    accentHex: 0xf43f5e,
    speedMult: 0.88,
    hullBonus: 35,
    shieldBonus: 15,
    damageMult: 1.2,
    specialName: 'MISSILE SALVO',
    specialDesc: 'Launches 8 homing crimson warheads that lock onto active ships & bosses.',
    specialCooldown: 10,
    specialDuration: 1.5,
  },
  chrono: {
    id: 'chrono',
    name: 'AX-0 CHRONO',
    codename: 'Emerald Prism',
    role: 'Tactical Aegis',
    primaryColor: '#34d399',
    accentHex: 0x10b981,
    speedMult: 1.06,
    hullBonus: 10,
    shieldBonus: 35,
    damageMult: 1.05,
    specialName: 'AEGIS TIME-FIELD',
    specialDesc: 'Grants invulnerability, restores +35 shield & slows enemies/bombs by 55% for 5s.',
    specialCooldown: 14,
    specialDuration: 5,
  },
  cyber_kitsune: {
    id: 'cyber_kitsune',
    name: 'KX-4 KITSUNE',
    codename: 'Neon Katana',
    role: 'Cyberpunk Split-Blade',
    primaryColor: '#ff2e93',
    accentHex: 0xff2e93,
    speedMult: 1.18,
    hullBonus: 0,
    shieldBonus: 15,
    damageMult: 1.12,
    specialName: 'NEON BLADE WAVE',
    specialDesc: 'Slices the lane with 6 piercing pink cyber-slashes & 2.5s phase invulnerability.',
    specialCooldown: 10,
    specialDuration: 2.5,
  },
  ronin_x: {
    id: 'ronin_x',
    name: 'RN-88 RONIN',
    codename: 'Acid Street-Racer',
    role: 'Asymmetrical Rail-Fighter',
    primaryColor: '#a3e635',
    accentHex: 0xa3e635,
    speedMult: 1.12,
    hullBonus: 15,
    shieldBonus: 0,
    damageMult: 1.18,
    specialName: 'RAILGUN OVERLOAD',
    specialDesc: 'Surges weapon output by 2.4x with hyper-velocity acid-lime piercing bolts for 4.5s.',
    specialCooldown: 12,
    specialDuration: 4.5,
  },
  netrunner: {
    id: 'netrunner',
    name: 'NR-0 NETRUNNER',
    codename: 'Holo-Spider',
    role: 'Cyber-Warfare X-Wing',
    primaryColor: '#22d3ee',
    accentHex: 0x06b6d4,
    speedMult: 1.1,
    hullBonus: 5,
    shieldBonus: 25,
    damageMult: 1.08,
    specialName: 'DATA VIRUS SWARM',
    specialDesc: 'Hacks & freezes all enemies for 3.5s, vaporizing bombs and dealing shock damage.',
    specialCooldown: 13,
    specialDuration: 3.5,
  },
  shogun_mk9: {
    id: 'shogun_mk9',
    name: 'SG-9 SHOGUN',
    codename: 'Obsidian Oni',
    role: 'Cyber-Samurai Heavy',
    primaryColor: '#fbbf24',
    accentHex: 0xfbbf24,
    speedMult: 0.94,
    hullBonus: 40,
    shieldBonus: 30,
    damageMult: 1.25,
    specialName: 'ORBITAL MATRIX',
    specialDesc: 'Deploys dual golden cyber-drones firing seeker beams for 6s & restores +25 shield.',
    specialCooldown: 14,
    specialDuration: 6,
  },
};

export interface ArenaTheme {
  id: ArenaThemeId;
  name: string;
  bgHex: number;
  fogDensity: number;
  gridColor: string;
  floorBgColor: string;
  wireHex: number;
  cliffColorHex: number;
  cliffEmissiveHex: number;
  hasTunnel: boolean;
  openSpace: boolean;
}

export const ARENA_THEMES: Record<ArenaThemeId, ArenaTheme> = {
  emerald_trench: {
    id: 'emerald_trench',
    name: 'EMERALD CYBER-TRENCH',
    bgHex: 0x02060d,
    fogDensity: 0.0075,
    gridColor: '#00ff88',
    floorBgColor: '#020b08',
    wireHex: 0x00ff88,
    cliffColorHex: 0x05281c,
    cliffEmissiveHex: 0x00331e,
    hasTunnel: false,
    openSpace: false,
  },
  cobalt_tunnel: {
    id: 'cobalt_tunnel',
    name: 'COBALT HYPER-TUNNEL',
    bgHex: 0x020817,
    fogDensity: 0.008,
    gridColor: '#38bdf8',
    floorBgColor: '#030d1d',
    wireHex: 0x38bdf8,
    cliffColorHex: 0x08203e,
    cliffEmissiveHex: 0x041e42,
    hasTunnel: true,
    openSpace: false,
  },
  crimson_magma: {
    id: 'crimson_magma',
    name: 'CRIMSON MAGMA RIFT',
    bgHex: 0x120305,
    fogDensity: 0.0078,
    gridColor: '#ff5522',
    floorBgColor: '#190504',
    wireHex: 0xff6b35,
    cliffColorHex: 0x360c08,
    cliffEmissiveHex: 0x451205,
    hasTunnel: false,
    openSpace: false,
  },
  violet_void: {
    id: 'violet_void',
    name: 'VIOLET VOID NEBULA',
    bgHex: 0x090214,
    fogDensity: 0.0068,
    gridColor: '#d946ef',
    floorBgColor: '#0f031f',
    wireHex: 0xe879f9,
    cliffColorHex: 0x24093d,
    cliffEmissiveHex: 0x2a0845,
    hasTunnel: false,
    openSpace: true,
  },
  obsidian_citadel: {
    id: 'obsidian_citadel',
    name: 'OBSIDIAN GOLD CITADEL',
    bgHex: 0x090804,
    fogDensity: 0.0072,
    gridColor: '#fbbf24',
    floorBgColor: '#120e04',
    wireHex: 0xfbbf24,
    cliffColorHex: 0x2b220c,
    cliffEmissiveHex: 0x382806,
    hasTunnel: true,
    openSpace: false,
  },
};

export interface LevelConfig {
  level: number;
  arena: ArenaThemeId;
  title: string;
  bossTitle: string;
  squadCount: number;
  bossHp: number;
  scrollSpeed: number;
}

const ARENA_ORDER: ArenaThemeId[] = [
  'emerald_trench',
  'cobalt_tunnel',
  'crimson_magma',
  'violet_void',
  'obsidian_citadel',
];

const BOSS_NAMES: string[] = [
  'VIPER ALPHA CRUISER',
  'TRENCH WARDEN MK-II',
  'IRONCLAD DESTROYER',
  'EMERALD BASTION CORE',
  'COBALT INTERDICTOR',
  'HYPERION TWIN-BOOM',
  'TEMPEST DREADNOUGHT',
  'SUBSPACE LEVIATHAN',
  'MAGMA FORGE TITAN',
  'INFERNO BOMBARDIER',
  'SCORCHED HYDRA',
  'VOLCANIC COLOSSUS',
  'VOID HARBINGER',
  'NEBULA PHANTOM CORE',
  'STAR-EATER CARRIER',
  'ABYSSAL SOVEREIGN',
  'CITADEL SENTINEL',
  'AURIC WARLORD',
  'SOLAR APEX CRUISER',
  'OMEGA CITADEL OVERLORD',
];

export const LEVELS: LevelConfig[] = Array.from({ length: 20 }, (_, idx) => {
  const level = idx + 1;
  const arena = ARENA_ORDER[Math.floor(idx / 4) % ARENA_ORDER.length];
  return {
    level,
    arena,
    title: `SECTOR ${Math.floor(idx / 4) + 1}-${(idx % 4) + 1}`,
    bossTitle: BOSS_NAMES[idx],
    squadCount: 5 + Math.floor(level * 1.1),
    bossHp: Math.round(44 + level * 14 + (level === 20 ? 80 : 0)),
    scrollSpeed: 40 + level * 1.5,
  };
});

export type EnemyBoltPattern = 'aimed' | 'spread' | 'tracking';

export interface RadarBlip {
  nx: number;
  nz: number;
  kind: EnemyKind | 'bomb';
}

export interface HudSnapshot {
  phase: GamePhase;
  jetId: JetId;
  score: number;
  highScore: number;
  multiplier: number;
  maxMultiplier: number;
  comboTimer: number;
  wave: number; // 1..20 level
  totalLevels: number;
  waveProgress: number;
  waveTotal: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  laserLevel: number; // 1..5 bullet stream tier
  weaponPattern: WeaponPattern;
  specialName: string;
  specialCooldown: number;
  specialMaxCooldown: number;
  specialActiveTimer: number;
  afterburnerCooldown: number;
  afterburnerMaxCooldown: number;
  afterburnerActiveTimer: number;
  missileCooldown: number;
  missileMaxCooldown: number;
  shieldPulseCooldown: number;
  shieldPulseMaxCooldown: number;
  shieldPulseActiveTimer: number;
  barrelRollCooldown: number;
  sectorMode: ArenaThemeId;
  arenaName: string;
  dangerAlert: boolean;
  hitFlash: number;
  bannerText: string | null;
  bossName: string | null;
  bossHpRatio: number;
  radarBlips: RadarBlip[];
}

export interface GameCheckpointPayload {
  wave: number;
  jetId: JetId;
  score: number;
  multiplier: number;
  maxMultiplier: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  laserLevel: number;
  weaponPattern: WeaponPattern;
  sectorMode: ArenaThemeId;
  shipX: number;
  shipY: number;
  waveProgress: number;
  waveTotal: number;
}

export interface PilotProfile {
  id: number;
  pilot_name: string;
  selected_jet: JetId;
  high_score: number;
  best_wave: number;
  total_kills: number;
  total_runs: number;
  credits: number;
  hull_upgrade: number;
  shield_upgrade: number;
  laser_upgrade: number;
  updated_at: string;
}

export interface SaveSlotRecord {
  slot_id: string;
  pilot_name: string;
  selected_jet: JetId;
  wave: number;
  score: number;
  multiplier: number;
  health: number;
  max_health: number;
  shield: number;
  max_shield: number;
  laser_level: number;
  kills: number;
  sector_mode: ArenaThemeId;
  payload: GameCheckpointPayload;
  updated_at: string;
}

export interface LeaderboardEntry {
  id: number;
  pilot_name: string;
  selected_jet: JetId;
  score: number;
  wave: number;
  kills: number;
  max_multiplier: number;
  accuracy: number;
  created_at: string;
}

export interface BackendState {
  profile: PilotProfile;
  slots: SaveSlotRecord[];
  leaderboard: LeaderboardEntry[];
}
