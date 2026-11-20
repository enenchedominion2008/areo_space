export type TutorialStepId =
  | 'move'
  | 'roll'
  | 'afterburner'
  | 'missile'
  | 'shield_pulse'
  | 'special';

export interface TutorialStepDef {
  id: TutorialStepId;
  stepNumber: number;
  title: string;
  instruction: string;
  buttonHint: string;
  actionLabel: string;
  liveDurationMs: number;
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    id: 'move',
    stepNumber: 1,
    title: 'MOVE & AUTO-FIRE WEAPONS',
    instruction:
      'Steer with WASD, Arrow Keys, Mouse Drag, or the bottom-left Touch Joystick. Your ship fires lasers automatically—focus on dodging and grabbing glowing Crystal Fragments.',
    buttonHint: 'Move ship with WASD / Arrows / Joystick',
    actionLabel: 'Fly Live',
    liveDurationMs: 2400,
  },
  {
    id: 'roll',
    stepNumber: 2,
    title: 'BARREL ROLL DODGE',
    instruction:
      'Tap the highlighted ROLL button (or press Shift / E) to snap-roll sideways with brief invulnerability through enemy shots.',
    buttonHint: 'Tap ROLL or press [Shift / E]',
    actionLabel: 'Use ROLL',
    liveDurationMs: 1800,
  },
  {
    id: 'afterburner',
    stepNumber: 3,
    title: 'AFTERBURNER RAM SPEED',
    instruction:
      'Tap the highlighted BURN button (or press Space / F) for 5s of super speed. Fly straight through enemies and bombs to smash them!',
    buttonHint: 'Tap BURN or press [Space / F]',
    actionLabel: 'Use BURN',
    liveDurationMs: 2600,
  },
  {
    id: 'missile',
    stepNumber: 4,
    title: 'HOMING MISSILE BARRAGE',
    instruction:
      'Tap the highlighted MSL button (or press R) to launch 8 homing warheads that lock onto active ships and bosses.',
    buttonHint: 'Tap MSL or press [R]',
    actionLabel: 'Fire Missiles',
    liveDurationMs: 2000,
  },
  {
    id: 'shield_pulse',
    stepNumber: 5,
    title: 'SHIELD PULSE & SHIELD-FIRST ARMOR',
    instruction:
      'Tap PULSE (or press C) to restore +30 Shield, gain 1.5s barrier immunity, and clear nearby bombs & bolts. Enemies must break your blue Shield before your green Hull takes damage!',
    buttonHint: 'Tap PULSE or press [C]',
    actionLabel: 'Use PULSE',
    liveDurationMs: 2200,
  },
  {
    id: 'special',
    stepNumber: 6,
    title: 'SPECIAL POWER-UP & FRAGMENTS',
    instruction:
      'Tap POWER (or press Q) to trigger your jet’s unique Special Power-Up, then fly into the glowing Crystal Fragment ahead to upgrade your weapon pattern up to LV 5!',
    buttonHint: 'Tap POWER or press [Q]',
    actionLabel: 'Activate POWER',
    liveDurationMs: 2800,
  },
];
