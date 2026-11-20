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
  | 'neon_megacity'
  | 'cobalt_tunnel'
  | 'cryo_prism'
  | 'biolum_abyss'
  | 'crimson_magma'
  | 'hyperion_foundry'
  | 'quantum_grid'
  | 'synthwave_horizon'
  | 'violet_void'
  | 'astral_helix'
  | 'solar_corona'
  | 'singularity_horizon'
  | 'obsidian_citadel'
  | 'zenith_omega';

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
    specialDesc: '2x fire rate, quad overdrive + wing lasers, +25% boost speed & +20 shield for 5s.',
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
    specialName: 'EMP GHOST CLOAK',
    specialDesc: 'Clears all enemy bolts/bombs, damages hostiles & grants 3s invulnerable speed cloak.',
    specialCooldown: 12,
    specialDuration: 3.0,
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
    specialName: 'SIEGE SALVO',
    specialDesc: 'Fires 12 homing warheads, restores +25 shield & boosts weapon power +40% for 3.5s.',
    specialCooldown: 10,
    specialDuration: 3.5,
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
    specialDesc: 'Invulnerability, +50 shield, +35% fire rate & slows enemies/bombs by 60% for 5s.',
    specialCooldown: 13,
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
    specialName: 'FOXFIRE BLADE',
    specialDesc: '8 piercing cyber-slashes, 3s phase invulnerability, speed boost & foxfire seekers.',
    specialCooldown: 10,
    specialDuration: 3.0,
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
    specialName: 'NITRO RAILGUN',
    specialDesc: '2.6x railgun damage, +30% fire rate, twin rail beams & +25% nitro speed for 5s.',
    specialCooldown: 12,
    specialDuration: 5.0,
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
    specialName: 'DATA SIPHON SWARM',
    specialDesc: 'Freezes enemies 4s, clears bolts/bombs, deals shock damage & siphons up to +40 shield.',
    specialCooldown: 12,
    specialDuration: 4.0,
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
    specialName: 'SHOGUN MATRIX',
    specialDesc: 'Dual golden seeker drones for 6.5s, 2s opening shield barrier & +40 shield restore.',
    specialCooldown: 13,
    specialDuration: 6.5,
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
    fogDensity: 0.0074,
    gridColor: '#00ff88',
    floorBgColor: '#020b08',
    wireHex: 0x00ff88,
    cliffColorHex: 0x05281c,
    cliffEmissiveHex: 0x00331e,
    hasTunnel: false,
    openSpace: false,
  },
  neon_megacity: {
    id: 'neon_megacity',
    name: 'NEON SKYWAY MEGACITY',
    bgHex: 0x090314,
    fogDensity: 0.0076,
    gridColor: '#ff2e93',
    floorBgColor: '#0e041a',
    wireHex: 0x22d3ee,
    cliffColorHex: 0x16092e,
    cliffEmissiveHex: 0x240a42,
    hasTunnel: true,
    openSpace: false,
  },
  cobalt_tunnel: {
    id: 'cobalt_tunnel',
    name: 'COBALT HYPER-TUNNEL',
    bgHex: 0x020817,
    fogDensity: 0.0078,
    gridColor: '#38bdf8',
    floorBgColor: '#030d1d',
    wireHex: 0x38bdf8,
    cliffColorHex: 0x08203e,
    cliffEmissiveHex: 0x041e42,
    hasTunnel: true,
    openSpace: false,
  },
  cryo_prism: {
    id: 'cryo_prism',
    name: 'CRYO PRISM GLACIER',
    bgHex: 0x031018,
    fogDensity: 0.0068,
    gridColor: '#67e8f9',
    floorBgColor: '#051924',
    wireHex: 0xa5f3fc,
    cliffColorHex: 0x0c3447,
    cliffEmissiveHex: 0x0e475e,
    hasTunnel: false,
    openSpace: false,
  },
  biolum_abyss: {
    id: 'biolum_abyss',
    name: 'BIOLUMINESCENT ABYSS',
    bgHex: 0x020b14,
    fogDensity: 0.007,
    gridColor: '#2dd4bf',
    floorBgColor: '#03131e',
    wireHex: 0x5eead4,
    cliffColorHex: 0x082a3b,
    cliffEmissiveHex: 0x083b45,
    hasTunnel: false,
    openSpace: false,
  },
  crimson_magma: {
    id: 'crimson_magma',
    name: 'CRIMSON MAGMA RIFT',
    bgHex: 0x120305,
    fogDensity: 0.0076,
    gridColor: '#ff5522',
    floorBgColor: '#190504',
    wireHex: 0xff6b35,
    cliffColorHex: 0x360c08,
    cliffEmissiveHex: 0x451205,
    hasTunnel: false,
    openSpace: false,
  },
  hyperion_foundry: {
    id: 'hyperion_foundry',
    name: 'HYPERION ORBITAL FOUNDRY',
    bgHex: 0x100804,
    fogDensity: 0.0075,
    gridColor: '#f59e0b',
    floorBgColor: '#180c05',
    wireHex: 0xfb923c,
    cliffColorHex: 0x2d1a0b,
    cliffEmissiveHex: 0x3d1f07,
    hasTunnel: true,
    openSpace: false,
  },
  quantum_grid: {
    id: 'quantum_grid',
    name: 'QUANTUM MATRIX GRID',
    bgHex: 0x030c12,
    fogDensity: 0.0066,
    gridColor: '#2dd4bf',
    floorBgColor: '#03121a',
    wireHex: 0xa3e635,
    cliffColorHex: 0x09242d,
    cliffEmissiveHex: 0x0a3336,
    hasTunnel: true,
    openSpace: false,
  },
  synthwave_horizon: {
    id: 'synthwave_horizon',
    name: 'SYNTHWAVE RETRO HORIZON',
    bgHex: 0x130318,
    fogDensity: 0.0068,
    gridColor: '#f472b6',
    floorBgColor: '#1b0524',
    wireHex: 0x38bdf8,
    cliffColorHex: 0x2a0938,
    cliffEmissiveHex: 0x3a0c4a,
    hasTunnel: false,
    openSpace: false,
  },
  violet_void: {
    id: 'violet_void',
    name: 'VIOLET VOID NEBULA',
    bgHex: 0x090214,
    fogDensity: 0.0065,
    gridColor: '#d946ef',
    floorBgColor: '#0f031f',
    wireHex: 0xe879f9,
    cliffColorHex: 0x24093d,
    cliffEmissiveHex: 0x2a0845,
    hasTunnel: false,
    openSpace: true,
  },
  astral_helix: {
    id: 'astral_helix',
    name: 'ASTRAL HELIX CORRIDOR',
    bgHex: 0x04071a,
    fogDensity: 0.0066,
    gridColor: '#818cf8',
    floorBgColor: '#070c26',
    wireHex: 0xfbbf24,
    cliffColorHex: 0x111942,
    cliffEmissiveHex: 0x162052,
    hasTunnel: true,
    openSpace: false,
  },
  solar_corona: {
    id: 'solar_corona',
    name: 'SOLAR CORONA FURNACE',
    bgHex: 0x140902,
    fogDensity: 0.0072,
    gridColor: '#fb923c',
    floorBgColor: '#1c0b03',
    wireHex: 0xfacc15,
    cliffColorHex: 0x3b1806,
    cliffEmissiveHex: 0x4f2104,
    hasTunnel: false,
    openSpace: false,
  },
  singularity_horizon: {
    id: 'singularity_horizon',
    name: 'SINGULARITY EVENT HORIZON',
    bgHex: 0x07010f,
    fogDensity: 0.0064,
    gridColor: '#f43f5e',
    floorBgColor: '#0c0214',
    wireHex: 0xfb7185,
    cliffColorHex: 0x1e0726,
    cliffEmissiveHex: 0x2b082e,
    hasTunnel: false,
    openSpace: true,
  },
  obsidian_citadel: {
    id: 'obsidian_citadel',
    name: 'OBSIDIAN GOLD CITADEL',
    bgHex: 0x090804,
    fogDensity: 0.007,
    gridColor: '#fbbf24',
    floorBgColor: '#120e04',
    wireHex: 0xfbbf24,
    cliffColorHex: 0x2b220c,
    cliffEmissiveHex: 0x382806,
    hasTunnel: true,
    openSpace: false,
  },
  zenith_omega: {
    id: 'zenith_omega',
    name: 'ZENITH OMEGA NEXUS',
    bgHex: 0x040b14,
    fogDensity: 0.0062,
    gridColor: '#67e8f9',
    floorBgColor: '#071422',
    wireHex: 0xe2e8f0,
    cliffColorHex: 0x13263d,
    cliffEmissiveHex: 0x17354f,
    hasTunnel: true,
    openSpace: true,
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
  'neon_megacity',
  'cobalt_tunnel',
  'cryo_prism',
  'biolum_abyss',
  'crimson_magma',
  'hyperion_foundry',
  'quantum_grid',
  'synthwave_horizon',
  'violet_void',
  'astral_helix',
  'solar_corona',
  'singularity_horizon',
  'obsidian_citadel',
  'zenith_omega',
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
  'ABYSSAL BIOLITH',
  'LEVIATHAN PELAGIC',
  'MAGMA FORGE TITAN',
  'INFERNO BOMBARDIER',
  'FOUNDRY BEHEMOTH',
  'SMELTER COLOSSUS',
  'QUANTUM SENTINEL',
  'MATRIX VECTOR CORE',
  'NEON SUN HARBINGER',
  'RETRO APEX PHANTOM',
  'VOID HARBINGER',
  'NEBULA PHANTOM CORE',
  'HELIX ARCHON CARRIER',
  'ASTRAL SERAPHIM',
  'CORONA SOLARIS',
  'DYSON FLARE TITAN',
  'EVENT HORIZON MAW',
  'SINGULARITY REAPER',
  'CITADEL WARLORD',
  'AURIC DREADNOUGHT',
  'ZENITH NEXUS GATEKEEPER',
  'OMEGA ZENITH SOVEREIGN',
];

export const LEVELS: LevelConfig[] = Array.from({ length: 30 }, (_, idx) => {
  const level = idx + 1;
  const arenaIdx = Math.floor(idx / 2) % ARENA_ORDER.length;
  const arena = ARENA_ORDER[arenaIdx];
  return {
    level,
    arena,
    title: `SECTOR ${arenaIdx + 1}-${(idx % 2) + 1}`,
    bossTitle: BOSS_NAMES[idx],
    squadCount: 5 + Math.floor(level * 0.95),
    bossHp: Math.round(44 + level * 14 + (level === 30 ? 110 : 0)),
    scrollSpeed: 40 + level * 1.25,
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
  wave: number; // 1..30 level
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
  bossChaseActive: boolean;
  bossChaseTimeLeft: number;
  bossChaseDuration: number;
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
