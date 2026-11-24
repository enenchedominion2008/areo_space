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

export type EnemyKind = 'scout' | 'gunship' | 'bomber' | 'dreadnought' | 'golden_drone';

export type PilotRankId = 'cadet' | 'wingman' | 'ace' | 'vanguard' | 'legend' | 'sovereign';

export interface PilotRankSpec {
  id: PilotRankId;
  title: string;
  shortTag: string;
  color: string;
  minKills: number;
  minWave: number;
  minScore: number;
}

export const PILOT_RANKS: Record<PilotRankId, PilotRankSpec> = {
  cadet: {
    id: 'cadet',
    title: 'CADET',
    shortTag: 'CDT',
    color: '#94a3b8',
    minKills: 0,
    minWave: 1,
    minScore: 0,
  },
  wingman: {
    id: 'wingman',
    title: 'WINGMAN',
    shortTag: 'WGM',
    color: '#38bdf8',
    minKills: 30,
    minWave: 3,
    minScore: 5000,
  },
  ace: {
    id: 'ace',
    title: 'INTERCEPTOR ACE',
    shortTag: 'ACE',
    color: '#34d399',
    minKills: 120,
    minWave: 8,
    minScore: 25000,
  },
  vanguard: {
    id: 'vanguard',
    title: 'VANGUARD ELITE',
    shortTag: 'VGD',
    color: '#e879f9',
    minKills: 350,
    minWave: 15,
    minScore: 75000,
  },
  legend: {
    id: 'legend',
    title: 'CYBER LEGEND',
    shortTag: 'LGD',
    color: '#fbbf24',
    minKills: 800,
    minWave: 22,
    minScore: 180000,
  },
  sovereign: {
    id: 'sovereign',
    title: 'APEX SOVEREIGN',
    shortTag: 'APX',
    color: '#fb7185',
    minKills: 1500,
    minWave: 30,
    minScore: 350000,
  },
};

export const PILOT_RANK_ORDER: PilotRankId[] = [
  'cadet',
  'wingman',
  'ace',
  'vanguard',
  'legend',
  'sovereign',
];

export function getPilotRank(
  stats?: { total_kills?: number; best_wave?: number; high_score?: number } | null
): PilotRankSpec {
  const kills = stats?.total_kills ?? 0;
  const wave = stats?.best_wave ?? 0;
  const score = stats?.high_score ?? 0;
  let earned: PilotRankSpec = PILOT_RANKS.cadet;
  for (const id of PILOT_RANK_ORDER) {
    const spec = PILOT_RANKS[id];
    if (kills >= spec.minKills || wave >= spec.minWave || score >= spec.minScore) {
      earned = spec;
    }
  }
  return earned;
}

export function getLeaderboardEntryRank(entry: {
  kills: number;
  wave: number;
  score: number;
}): PilotRankSpec {
  return getPilotRank({
    total_kills: entry.kills,
    best_wave: entry.wave,
    high_score: entry.score,
  });
}

export type BombKind = 'cluster' | 'mine' | 'torpedo';

export type WeaponPattern = 'twin' | 'spread' | 'stream' | 'plasma' | 'seeker';

export type FragmentKind = 'spread' | 'stream' | 'plasma' | 'seeker' | 'shield' | 'hull' | 'wingman';

export type JetSkinId =
  | 'factory'
  | 'cyber_cobalt'
  | 'emerald_matrix'
  | 'carbon_stealth'
  | 'crimson_vortex'
  | 'solar_gold'
  | 'holo_magenta'
  | 'quantum_prism'
  | 'arctic_chrome'
  | 'void_obsidian';

export type TrailColorId =
  | 'jet_default'
  | 'hyper_aqua'
  | 'cyan_ion'
  | 'crimson_flare'
  | 'acid_emerald'
  | 'plasma_cobalt'
  | 'solar_gold'
  | 'ultraviolet'
  | 'cyber_prism'
  | 'antimatter_violet';

export type CyberModId =
  | 'shield_siphon'
  | 'extended_overdrive'
  | 'twin_homing_pods'
  | 'afterburner_capacitor'
  | 'reactive_plating'
  | 'fragment_magnet';

export interface JetSkinSpec {
  id: JetSkinId;
  name: string;
  cost: number;
  swatchColor: string;
  hullHex?: number;
  secondaryHex?: number;
  trimHex?: number;
  accentHex?: number;
  metalness?: number;
  roughness?: number;
  clearcoat?: number;
  iridescence?: number;
  emissiveGlow?: number;
  aeroKit?: boolean;
}

export const JET_SKINS: Record<JetSkinId, JetSkinSpec> = {
  factory: {
    id: 'factory',
    name: 'Factory Spec',
    cost: 0,
    swatchColor: '#94a3b8',
  },
  cyber_cobalt: {
    id: 'cyber_cobalt',
    name: 'Hyper Cobalt',
    cost: 0,
    swatchColor: '#00e5ff',
    hullHex: 0x0b1f3a,
    secondaryHex: 0x164e87,
    trimHex: 0x7dd3fc,
    accentHex: 0x00e5ff,
    metalness: 0.84,
    roughness: 0.2,
    clearcoat: 1.0,
    iridescence: 0.45,
    emissiveGlow: 0.14,
    aeroKit: true,
  },
  emerald_matrix: {
    id: 'emerald_matrix',
    name: 'Matrix Neon',
    cost: 0,
    swatchColor: '#00ff88',
    hullHex: 0x091c16,
    secondaryHex: 0x114232,
    trimHex: 0x6ee7b7,
    accentHex: 0x00ff88,
    metalness: 0.82,
    roughness: 0.22,
    clearcoat: 0.9,
    iridescence: 0.35,
    emissiveGlow: 0.15,
    aeroKit: true,
  },
  carbon_stealth: {
    id: 'carbon_stealth',
    name: 'Carbon Stealth',
    cost: 250,
    swatchColor: '#38bdf8',
    hullHex: 0x0b1019,
    secondaryHex: 0x1e293b,
    trimHex: 0x64748b,
    accentHex: 0x38bdf8,
    metalness: 0.72,
    roughness: 0.36,
    clearcoat: 0.55,
    iridescence: 0.2,
    emissiveGlow: 0.08,
    aeroKit: true,
  },
  crimson_vortex: {
    id: 'crimson_vortex',
    name: 'Crimson Overdrive',
    cost: 320,
    swatchColor: '#ff2a6d',
    hullHex: 0x260814,
    secondaryHex: 0x6b102d,
    trimHex: 0xfda4af,
    accentHex: 0xff2a6d,
    metalness: 0.86,
    roughness: 0.2,
    clearcoat: 1.0,
    iridescence: 0.55,
    emissiveGlow: 0.16,
    aeroKit: true,
  },
  solar_gold: {
    id: 'solar_gold',
    name: 'Solar Gold',
    cost: 400,
    swatchColor: '#fbbf24',
    hullHex: 0x3b2308,
    secondaryHex: 0x92400e,
    trimHex: 0xfbbf24,
    accentHex: 0xfef08a,
    metalness: 0.92,
    roughness: 0.16,
    clearcoat: 1.0,
    iridescence: 0.35,
    emissiveGlow: 0.14,
    aeroKit: true,
  },
  holo_magenta: {
    id: 'holo_magenta',
    name: 'Holo-Magenta',
    cost: 500,
    swatchColor: '#e879f9',
    hullHex: 0x240b3d,
    secondaryHex: 0x581c87,
    trimHex: 0xf472b6,
    accentHex: 0xf0abfc,
    metalness: 0.85,
    roughness: 0.18,
    clearcoat: 1.0,
    iridescence: 0.85,
    emissiveGlow: 0.18,
    aeroKit: true,
  },
  quantum_prism: {
    id: 'quantum_prism',
    name: 'Quantum Prism',
    cost: 550,
    swatchColor: '#22d3ee',
    hullHex: 0x161c36,
    secondaryHex: 0x2b3668,
    trimHex: 0xa5f3fc,
    accentHex: 0x22d3ee,
    metalness: 0.9,
    roughness: 0.14,
    clearcoat: 1.0,
    iridescence: 1.0,
    emissiveGlow: 0.16,
    aeroKit: true,
  },
  arctic_chrome: {
    id: 'arctic_chrome',
    name: 'Arctic Chrome',
    cost: 650,
    swatchColor: '#2dd4bf',
    hullHex: 0x94a3b8,
    secondaryHex: 0x475569,
    trimHex: 0xf8fafc,
    accentHex: 0x2dd4bf,
    metalness: 0.95,
    roughness: 0.12,
    clearcoat: 1.0,
    iridescence: 0.65,
    emissiveGlow: 0.1,
    aeroKit: true,
  },
  void_obsidian: {
    id: 'void_obsidian',
    name: 'Void Singularity',
    cost: 750,
    swatchColor: '#a855f7',
    hullHex: 0x07060f,
    secondaryHex: 0x1c1233,
    trimHex: 0xc084fc,
    accentHex: 0xa855f7,
    metalness: 0.88,
    roughness: 0.18,
    clearcoat: 1.0,
    iridescence: 0.9,
    emissiveGlow: 0.22,
    aeroKit: true,
  },
};

export interface TrailColorSpec {
  id: TrailColorId;
  name: string;
  cost: number;
  cssColor: string;
  hex?: number;
}

export const TRAIL_COLORS: Record<TrailColorId, TrailColorSpec> = {
  jet_default: { id: 'jet_default', name: 'Jet Signature', cost: 0, cssColor: '#cbd5e1' },
  hyper_aqua: { id: 'hyper_aqua', name: 'Hyper Aqua', cost: 0, cssColor: '#00f5d4', hex: 0x00f5d4 },
  cyan_ion: { id: 'cyan_ion', name: 'Cyan Ion', cost: 150, cssColor: '#22d3ee', hex: 0x22d3ee },
  crimson_flare: { id: 'crimson_flare', name: 'Crimson Flare', cost: 200, cssColor: '#fb7185', hex: 0xf43f5e },
  acid_emerald: { id: 'acid_emerald', name: 'Acid Emerald', cost: 250, cssColor: '#4ade80', hex: 0x4ade80 },
  plasma_cobalt: { id: 'plasma_cobalt', name: 'Plasma Cobalt', cost: 280, cssColor: '#3b82f6', hex: 0x3b82f6 },
  solar_gold: { id: 'solar_gold', name: 'Solar Gold', cost: 300, cssColor: '#fbbf24', hex: 0xfbbf24 },
  ultraviolet: { id: 'ultraviolet', name: 'Ultraviolet', cost: 350, cssColor: '#e879f9', hex: 0xd946ef },
  cyber_prism: { id: 'cyber_prism', name: 'Neon Mint-Ice', cost: 400, cssColor: '#5eead4', hex: 0x5eead4 },
  antimatter_violet: { id: 'antimatter_violet', name: 'Antimatter Core', cost: 450, cssColor: '#a855f7', hex: 0xa855f7 },
};

export interface CyberModSpec {
  id: CyberModId;
  name: string;
  cost: number;
  desc: string;
  accentColor: string;
}

export const CYBER_MODS: Record<CyberModId, CyberModSpec> = {
  shield_siphon: {
    id: 'shield_siphon',
    name: 'Shield Siphon',
    cost: 220,
    desc: 'Every enemy kill restores +3 Shield (+12 on Dreadnought bosses).',
    accentColor: '#38bdf8',
  },
  extended_overdrive: {
    id: 'extended_overdrive',
    name: 'Extended Overdrive',
    cost: 260,
    desc: 'Jet Special Power and Wingman Escort durations last +40% longer.',
    accentColor: '#e879f9',
  },
  twin_homing_pods: {
    id: 'twin_homing_pods',
    name: 'Twin Homing Pods',
    cost: 320,
    desc: 'Fires 2 bonus auto-seeking micro-bolts every 1.35s in combat.',
    accentColor: '#fbbf24',
  },
  afterburner_capacitor: {
    id: 'afterburner_capacitor',
    name: 'Turbo Capacitor',
    cost: 240,
    desc: 'Reduces Afterburner, Missile Barrage & Shield Pulse cooldowns by 25%.',
    accentColor: '#22d3ee',
  },
  reactive_plating: {
    id: 'reactive_plating',
    name: 'Reactive Plating',
    cost: 280,
    desc: '+25 Max Hull, +25 Max Shield, and +15% primary weapon damage.',
    accentColor: '#4ade80',
  },
  fragment_magnet: {
    id: 'fragment_magnet',
    name: 'Tractor Array',
    cost: 180,
    desc: 'Doubles crystal pickup pull range and grants +25% bonus score.',
    accentColor: '#fb7185',
  },
};

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

export type ArenaStructureMode = 'structure' | 'city' | 'waves' | 'void';

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
  structureMode: ArenaStructureMode;
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
    structureMode: 'structure',
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
    structureMode: 'city',
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
    structureMode: 'structure',
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
    structureMode: 'waves',
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
    structureMode: 'waves',
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
    structureMode: 'waves',
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
    structureMode: 'city',
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
    structureMode: 'structure',
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
    structureMode: 'waves',
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
    structureMode: 'void',
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
    openSpace: true,
    structureMode: 'void',
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
    structureMode: 'waves',
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
    structureMode: 'void',
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
    structureMode: 'city',
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
    structureMode: 'void',
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
  kind: EnemyKind | 'bomb' | 'partner';
}

export interface CoopPartnerHud {
  slot: 1 | 2;
  pilotName: string;
  jetId: JetId;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  score: number;
  kills: number;
  downed: boolean;
  respawnTimeLeft: number;
  connected: boolean;
}

export interface CoopHudState {
  active: boolean;
  roomCode: string;
  localSlot: 1 | 2;
  localDowned: boolean;
  localRespawnTimeLeft: number;
  teamScore: number;
  partner: CoopPartnerHud | null;
}

export interface HudSnapshot {
  phase: GamePhase;
  jetId: JetId;
  score: number;
  highScore: number;
  multiplier: number;
  maxMultiplier: number;
  comboTimer: number;
  feverActive: boolean;
  feverMeter: number;
  feverTimeLeft: number;
  bossSlowMoActive: boolean;
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
  wingmanTimeLeft: number;
  equippedMods: CyberModId[];
  radarBlips: RadarBlip[];
  coop?: CoopHudState | null;
}

export interface GameCheckpointPayload {
  wave: number;
  jetId: JetId;
  skinId?: JetSkinId;
  trailId?: TrailColorId;
  equippedMods?: CyberModId[];
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
  selected_skin: JetSkinId;
  selected_trail: TrailColorId;
  unlocked_skins: JetSkinId[];
  unlocked_trails: TrailColorId[];
  unlocked_mods: CyberModId[];
  equipped_mods: CyberModId[];
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
