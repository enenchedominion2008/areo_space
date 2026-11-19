import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AudioEngine } from './audio';
import { CyberTrenchEnvironment } from './environment';
import {
  createBombMesh,
  createEnemyModel,
  createFragmentMesh,
  createPlayerShip,
  type EnemyRig,
  type PlayerShipRig,
} from './models';
import {
  ARENA_THEMES,
  JETS,
  LEVELS,
  type ArenaThemeId,
  type BombKind,
  type EnemyKind,
  type FragmentKind,
  type GameCheckpointPayload,
  type GamePhase,
  type HudSnapshot,
  type JetId,
  type PilotProfile,
  type RadarBlip,
  type WeaponPattern,
} from './types';

// Reusable scratch math objects (zero per-frame allocations)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _whiteColor = new THREE.Color(0xffffff);

interface PlayerBolt {
  active: boolean;
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  homing: boolean;
  splash: boolean;
  colorHex: number;
}

interface EnemyBolt {
  active: boolean;
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
}

interface EnemyBomb {
  kind: BombKind;
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  hp: number;
  age: number;
  fuseTimer: number;
}

interface EnemyActor {
  id: number;
  kind: EnemyKind;
  rig: EnemyRig;
  x: number;
  y: number;
  z: number;
  targetZ: number;
  baseX: number;
  baseY: number;
  hp: number;
  maxHp: number;
  radius: number;
  age: number;
  phaseOffset: number;
  fireTimer: number;
  bombTimer: number;
  hitFlashTimer: number;
  scoreValue: number;
}

interface FragmentActor {
  mesh: THREE.Group;
  kind: FragmentKind;
  x: number;
  y: number;
  z: number;
  age: number;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onWaveCleared: (checkpoint: GameCheckpointPayload) => void;
  onGameOver: (summary: {
    score: number;
    wave: number;
    kills: number;
    maxMultiplier: number;
    accuracy: number;
    victory: boolean;
  }) => void;
}

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class SpaceShooterEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  public readonly audio = new AudioEngine();

  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private environment: CyberTrenchEnvironment;
  private playerRig: PlayerShipRig;
  private reticleGroup: THREE.Group;
  private empRingMesh: THREE.Mesh;
  private empRingTimer = 0;

  // Pools & active actors
  private playerBolts: PlayerBolt[] = [];
  private enemyBolts: EnemyBolt[] = [];
  private enemyBombs: EnemyBomb[] = [];
  private enemies: EnemyActor[] = [];
  private fragments: FragmentActor[] = [];
  private particles: Particle[] = [];
  private particleMesh: THREE.InstancedMesh;

  // Loop state
  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private hudEmitAccum = 0;
  private hitstopTimer = 0;

  // Game progression state (20 Levels, boss at end of every level)
  private phase: GamePhase = 'title';
  private jetId: JetId = 'vanguard';
  private sectorMode: ArenaThemeId = 'emerald_trench';
  private score = 0;
  private highScore = 0;
  private multiplier = 1;
  private maxMultiplier = 1;
  private comboTimer = 0;
  private wave = 1; // 1..20
  private waveKills = 0;
  private waveTotal = 6;
  private waveSpawnQueue: EnemyKind[] = [];
  private bossPending = true;
  private bossSpawned = false;
  private kills = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private spawnCooldown = 0;
  private fragmentDropTimer = 7.5;
  private nextEnemyId = 1;

  // Player ship kinematics & combat stats
  private shipX = 0;
  private shipY = -1.2;
  private shipVx = 0;
  private shipVy = 0;
  private health = 100;
  private maxHealth = 100;
  private shield = 100;
  private maxShield = 100;
  private shieldRegenDelay = 0;
  private laserLevel = 1; // 1..5
  private weaponPattern: WeaponPattern = 'twin';
  private baseDamageMult = 1;
  private fireCooldown = 0;
  private leftRecoil = 0;
  private rightRecoil = 0;
  private barrelRollTimer = 0;
  private barrelRollDir = 1;
  private barrelRollCooldown = 0;
  private specialCooldown = 0;
  private specialActiveTimer = 0;
  private dataVirusTimer = 0;
  private shogunDroneTimer = 0;
  private invulnTimer = 0;
  private playerHitFlash = 0;
  private cameraShake = 0;
  private bannerText: string | null = null;
  private bannerTimer = 0;

  // Inputs (held vs buffered + mobile virtual joystick)
  private heldKeys = new Set<string>();
  private pointerActive = false;
  private pointerTarget: { x: number; y: number } | null = null;
  private touchSteerX = 0;
  private touchSteerY = 0;
  private rollBufferTimer = 0;
  private specialBufferTimer = 0;

  private readonly boundsX = 11.8;
  private readonly minY = -5.2;
  private readonly maxY = 5.8;

  constructor(container: HTMLElement, callbacks: EngineCallbacks, initialHighScore = 0, initialJet: JetId = 'vanguard') {
    this.container = container;
    this.callbacks = callbacks;
    this.highScore = initialHighScore;
    this.jetId = initialJet;
    this.isSoftwareGl = detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02060d);
    this.scene.fog = new THREE.FogExp2(0x02060d, 0.0075);

    const aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.1, 260);
    this.camera.position.set(0, 2.8, 10.5);
    this.camera.lookAt(0, -0.5, -24);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight(0x7dd3fc, 0x064e3b, 0.78);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1e0, 2.2);
    keyLight.position.set(12, 18, 14);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd946ef, 1.35);
    rimLight.position.set(-14, 6, -12);
    this.scene.add(rimLight);

    this.environment = new CyberTrenchEnvironment(this.renderer, this.scene);
    this.scene.add(this.environment.group);

    this.playerRig = createPlayerShip(this.jetId);
    this.playerRig.group.position.set(0, this.shipY, 0);
    this.scene.add(this.playerRig.group);

    // Expanding EMP shockwave ring for Phantom special ability
    this.empRingMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.18, 10, 36),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.empRingMesh.visible = false;
    this.scene.add(this.empRingMesh);

    this.reticleGroup = this.createReticle();
    this.reticleGroup.visible = false;
    this.scene.add(this.reticleGroup);

    this.initBoltPools();

    // Instanced explosion particle pool
    const pGeo = new THREE.OctahedronGeometry(0.28, 0);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const maxParticles = 220;
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, maxParticles);
    this.particleMesh.frustumCulled = false;
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 1,
        color: new THREE.Color(0xff9500),
      });
      _mat4.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, _whiteColor);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.particleMesh);

    if (!this.isSoftwareGl) {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.56, 0.35, 0.72);
      this.composer.addPass(this.bloomPass);
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.emitHud();
    this.scheduleNextFrame();
  }

  private createReticle(): THREE.Group {
    const g = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.18, 32), ringMat);
    g.add(ring);

    const inner = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.52, 4),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    g.add(inner);
    return g;
  }

  private initBoltPools(): void {
    const pBoltGeo = new THREE.CylinderGeometry(0.11, 0.11, 3.6, 8);
    pBoltGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 110; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x4ade80,
        transparent: true,
        opacity: 0.96,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(pBoltGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.playerBolts.push({
        active: false,
        mesh,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        damage: 1,
        homing: false,
        splash: false,
        colorHex: 0x4ade80,
      });
    }

    const eBoltGeo = new THREE.SphereGeometry(0.32, 10, 10);
    const eBoltMat = new THREE.MeshBasicMaterial({
      color: 0xff7b1c,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 84; i++) {
      const mesh = new THREE.Mesh(eBoltGeo, eBoltMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.enemyBolts.push({ active: false, mesh, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, damage: 12 });
    }
  }

  // =========================================================================
  // Input & Mobile Control API
  // =========================================================================

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const code = e.code;

    if (
      code === 'Space' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight'
    ) {
      e.preventDefault();
    }

    this.audio.unlock();
    this.heldKeys.add(code);

    if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyE') {
      this.rollBufferTimer = 0.16;
    }
    if (code === 'KeyQ') {
      this.specialBufferTimer = 0.16;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
  };

  private onBlur = () => {
    this.heldKeys.clear();
    this.pointerActive = false;
    this.pointerTarget = null;
    this.touchSteerX = 0;
    this.touchSteerY = 0;
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.phase !== 'playing') return;
    this.audio.unlock();
    if (e.button === 2) {
      this.rollBufferTimer = 0.16;
      return;
    }
    this.pointerActive = true;
    this.updatePointerTarget(e);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.phase !== 'playing' || !this.pointerActive) return;
    this.updatePointerTarget(e);
  };

  private onPointerUp = () => {
    this.pointerActive = false;
    this.pointerTarget = null;
  };

  private onContextMenu = (e: MouseEvent) => {
    if (this.phase === 'playing') e.preventDefault();
  };

  private updatePointerTarget(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    this.pointerTarget = {
      x: THREE.MathUtils.clamp(nx * this.boundsX, -this.boundsX, this.boundsX),
      y: THREE.MathUtils.clamp(ny * 5.2 + 0.3, this.minY, this.maxY),
    };
  }

  private onResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) this.composer.setSize(w, h);
    if (this.bloomPass) this.bloomPass.resolution.set(w, h);
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('resize', this.onResize);
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  public setTouchSteer(nx: number, ny: number): void {
    this.touchSteerX = THREE.MathUtils.clamp(nx, -1, 1);
    this.touchSteerY = THREE.MathUtils.clamp(ny, -1, 1);
  }

  public triggerBarrelRoll(): void {
    this.audio.unlock();
    this.rollBufferTimer = 0.16;
  }

  public triggerSpecial(): void {
    this.audio.unlock();
    this.specialBufferTimer = 0.16;
  }

  // =========================================================================
  // Public Control API
  // =========================================================================

  public setHighScore(score: number): void {
    this.highScore = Math.max(this.highScore, score);
    this.emitHud();
  }

  public setSelectedJet(jetId: JetId): void {
    if (this.jetId === jetId) return;
    this.jetId = jetId;
    this.rebuildPlayerShip();
    this.emitHud();
  }

  private rebuildPlayerShip(): void {
    const pos = this.playerRig.group.position.clone();
    this.scene.remove(this.playerRig.group);
    this.playerRig = createPlayerShip(this.jetId);
    this.playerRig.group.position.copy(pos);
    this.scene.add(this.playerRig.group);
  }

  public getPhase(): GamePhase {
    return this.phase;
  }

  public startNewGame(profile?: PilotProfile, startLevel = 1): void {
    this.audio.unlock();
    this.clearEntities();

    const chosenJet = profile?.selected_jet || this.jetId || 'vanguard';
    if (chosenJet !== this.jetId) {
      this.jetId = chosenJet;
      this.rebuildPlayerShip();
    }

    const jet = JETS[this.jetId];
    const hullTier = profile?.hull_upgrade ?? 0;
    const shieldTier = profile?.shield_upgrade ?? 0;
    const laserTier = profile?.laser_upgrade ?? 0;

    this.maxHealth = Math.max(60, 100 + hullTier * 25 + jet.hullBonus);
    this.health = this.maxHealth;
    this.maxShield = Math.max(60, 100 + shieldTier * 25 + jet.shieldBonus);
    this.shield = this.maxShield;
    this.baseDamageMult = (1 + laserTier * 0.22) * jet.damageMult;
    this.laserLevel = laserTier >= 3 ? 2 : 1;
    this.weaponPattern = 'twin';

    this.score = 0;
    this.multiplier = 1;
    this.maxMultiplier = 1;
    this.comboTimer = 0;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.shipX = 0;
    this.shipY = -1.2;
    this.shipVx = 0;
    this.shipVy = 0;
    this.barrelRollTimer = 0;
    this.barrelRollCooldown = 0;
    this.specialCooldown = 0;
    this.specialActiveTimer = 0;
    this.invulnTimer = 1.2;
    this.fragmentDropTimer = 7.0;
    this.phase = 'playing';

    this.setupLevel(THREE.MathUtils.clamp(startLevel, 1, 20));
    this.emitHud();
  }

  public restoreCheckpoint(checkpoint: GameCheckpointPayload, profile?: PilotProfile): void {
    this.audio.unlock();
    this.clearEntities();

    const chosenJet = checkpoint.jetId || profile?.selected_jet || 'vanguard';
    if (chosenJet !== this.jetId) {
      this.jetId = chosenJet;
      this.rebuildPlayerShip();
    }

    const jet = JETS[this.jetId];
    const laserTier = profile?.laser_upgrade ?? 0;
    this.baseDamageMult = (1 + laserTier * 0.22) * jet.damageMult;

    this.wave = THREE.MathUtils.clamp(checkpoint.wave, 1, 20);
    this.score = checkpoint.score;
    this.multiplier = checkpoint.multiplier;
    this.maxMultiplier = checkpoint.maxMultiplier;
    this.kills = checkpoint.kills;
    this.shotsFired = checkpoint.shotsFired;
    this.shotsHit = checkpoint.shotsHit;
    this.maxHealth = checkpoint.maxHealth;
    this.health = Math.max(20, checkpoint.health);
    this.maxShield = checkpoint.maxShield;
    this.shield = checkpoint.shield;
    this.laserLevel = THREE.MathUtils.clamp(checkpoint.laserLevel || 1, 1, 5);
    this.weaponPattern = checkpoint.weaponPattern || 'twin';
    this.sectorMode = checkpoint.sectorMode || LEVELS[this.wave - 1].arena;
    this.shipX = checkpoint.shipX;
    this.shipY = checkpoint.shipY;
    this.shipVx = 0;
    this.shipVy = 0;
    this.specialCooldown = 0;
    this.specialActiveTimer = 0;
    this.invulnTimer = 1.5;
    this.phase = 'playing';

    this.setupLevel(this.wave);
    this.showBanner(`CHECKPOINT RESTORED · LEVEL ${this.wave}/20`, 2.4);
    this.emitHud();
  }

  public exportCheckpoint(): GameCheckpointPayload {
    return {
      wave: this.wave,
      jetId: this.jetId,
      score: this.score,
      multiplier: this.multiplier,
      maxMultiplier: this.maxMultiplier,
      kills: this.kills,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      health: Math.round(this.health),
      maxHealth: this.maxHealth,
      shield: Math.round(this.shield),
      maxShield: this.maxShield,
      laserLevel: this.laserLevel,
      weaponPattern: this.weaponPattern,
      sectorMode: this.sectorMode,
      shipX: Number(this.shipX.toFixed(2)),
      shipY: Number(this.shipY.toFixed(2)),
      waveProgress: this.waveKills,
      waveTotal: this.waveTotal,
    };
  }

  public setPaused(paused: boolean): void {
    if (this.phase !== 'playing' && this.phase !== 'paused') return;
    this.phase = paused ? 'paused' : 'playing';
    this.heldKeys.clear();
    this.pointerActive = false;
    this.touchSteerX = 0;
    this.touchSteerY = 0;
    this.lastTime = performance.now();
    this.emitHud();
  }

  public returnToTitle(): void {
    this.clearEntities();
    this.phase = 'title';
    this.sectorMode = 'emerald_trench';
    this.environment.setTheme('emerald_trench');
    this.shipX = 0;
    this.shipY = -1.2;
    this.bannerText = null;
    this.emitHud();
  }

  public reviveCurrentLevel(): void {
    this.audio.unlock();
    // Clear incoming enemy projectiles & bombs cleanly, restore hull & shield on current level
    for (const b of this.enemyBolts) {
      b.active = false;
      b.mesh.visible = false;
    }
    for (const bomb of this.enemyBombs) {
      this.scene.remove(bomb.mesh);
    }
    this.enemyBombs = [];

    this.health = this.maxHealth;
    this.shield = this.maxShield;
    this.invulnTimer = 2.8;
    this.playerHitFlash = 0;
    this.specialCooldown = 0;
    this.phase = 'playing';
    this.lastTime = performance.now();
    this.showBanner(`SYSTEM REBOOT · LEVEL ${this.wave}/20 CONTINUED`, 2.6);
    this.emitHud();
  }

  private clearEntities(): void {
    for (const b of this.playerBolts) {
      b.active = false;
      b.mesh.visible = false;
    }
    for (const b of this.enemyBolts) {
      b.active = false;
      b.mesh.visible = false;
    }
    for (const bomb of this.enemyBombs) {
      this.scene.remove(bomb.mesh);
    }
    this.enemyBombs = [];
    for (const e of this.enemies) {
      this.scene.remove(e.rig.group);
    }
    this.enemies = [];
    for (const f of this.fragments) {
      this.scene.remove(f.mesh);
    }
    this.fragments = [];
    this.reticleGroup.visible = false;
    this.empRingMesh.visible = false;
    this.empRingTimer = 0;
  }

  // =========================================================================
  // 20-Level Progression + End-of-Level Boss Fights
  // =========================================================================

  private setupLevel(levelNum: number): void {
    const cfg = LEVELS[THREE.MathUtils.clamp(levelNum, 1, 20) - 1];
    this.wave = cfg.level;
    this.sectorMode = cfg.arena;
    this.environment.setTheme(cfg.arena);
    this.waveKills = 0;
    this.waveSpawnQueue = [];
    this.bossPending = true;
    this.bossSpawned = false;

    for (let i = 0; i < cfg.squadCount; i++) {
      if (cfg.level >= 3 && i % 5 === 4) {
        this.waveSpawnQueue.push('bomber');
      } else if (cfg.level >= 2 && i % 3 === 2) {
        this.waveSpawnQueue.push('gunship');
      } else {
        this.waveSpawnQueue.push('scout');
      }
    }

    this.waveTotal = cfg.squadCount + 1; // squad + end-of-level boss
    this.spawnCooldown = 0.65;

    const arenaName = ARENA_THEMES[cfg.arena].name;
    this.showBanner(`LEVEL ${cfg.level}/20 · ${arenaName}`, 2.6);
  }

  private spawnEnemy(kind: EnemyKind): void {
    const cfg = LEVELS[this.wave - 1];
    const rig = createEnemyModel(kind, this.wave);
    const waveScale = 1 + (this.wave - 1) * 0.14;

    const baseX =
      kind === 'dreadnought'
        ? 0
        : THREE.MathUtils.randFloat(-this.boundsX * 0.85, this.boundsX * 0.85);
    const baseY =
      kind === 'dreadnought'
        ? 1.35
        : THREE.MathUtils.randFloat(-2.4, 4.3);
    const targetZ =
      kind === 'dreadnought'
        ? -38
        : kind === 'bomber'
        ? -36
        : kind === 'gunship'
        ? THREE.MathUtils.randFloat(-40, -28)
        : THREE.MathUtils.randFloat(-34, -20);

    const hp =
      kind === 'dreadnought'
        ? cfg.bossHp
        : kind === 'bomber'
        ? Math.round(12 * waveScale)
        : kind === 'gunship'
        ? Math.round(8 * waveScale)
        : Math.round(3 * waveScale);

    const radius =
      kind === 'dreadnought'
        ? 4.6
        : kind === 'bomber'
        ? 2.25
        : kind === 'gunship'
        ? 2.1
        : 1.35;

    const scoreValue =
      kind === 'dreadnought'
        ? 2500 + this.wave * 250
        : kind === 'bomber'
        ? 480
        : kind === 'gunship'
        ? 350
        : 130;

    rig.group.position.set(baseX, baseY + 3, -125);
    this.scene.add(rig.group);

    this.enemies.push({
      id: this.nextEnemyId++,
      kind,
      rig,
      x: baseX,
      y: baseY + 3,
      z: -125,
      targetZ,
      baseX,
      baseY,
      hp,
      maxHp: hp,
      radius,
      age: 0,
      phaseOffset: Math.random() * Math.PI * 2,
      fireTimer: kind === 'dreadnought' ? 1.5 : THREE.MathUtils.randFloat(1.0, 2.3),
      bombTimer: kind === 'dreadnought' ? 3.2 : kind === 'bomber' ? 2.4 : 4.6,
      hitFlashTimer: 0,
      scoreValue,
    });
  }

  private showBanner(text: string, duration = 2.2): void {
    this.bannerText = text;
    this.bannerTimer = duration;
  }

  // =========================================================================
  // Core 60fps Loop (GPU rAF / Software-WebGL afterDraw)
  // =========================================================================

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        gl.deleteSync(sync);
        return;
      }
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    if (this.phase === 'title') {
      this.updateTitleScene(dt, now * 0.001);
    } else if (this.phase === 'playing') {
      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= dt;
      } else {
        this.updateGameplay(dt);
      }
    }

    this.updateParticles(dt);

    if (this.composer && !this.isSoftwareGl) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.05) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }

    this.scheduleNextFrame();
  };

  private updateTitleScene(dt: number, elapsed: number): void {
    this.environment.update(dt, 32, 'emerald_trench');

    this.shipX = Math.sin(elapsed * 0.7) * 3.2;
    this.shipY = -1.0 + Math.sin(elapsed * 1.3) * 0.55;
    this.playerRig.group.position.set(this.shipX, this.shipY, 0);
    this.playerRig.group.rotation.z = -Math.cos(elapsed * 0.7) * 0.24;
    this.playerRig.group.rotation.x = Math.cos(elapsed * 1.3) * 0.06;
    if (this.playerRig.accentRing) {
      this.playerRig.accentRing.rotation.z += dt * 2.4;
    }

    const flicker = 0.88 + Math.sin(elapsed * 42) * 0.14;
    this.playerRig.leftFlame.scale.set(1, 1, flicker);
    this.playerRig.rightFlame.scale.set(1, 1, flicker);

    this.camera.position.x = Math.sin(elapsed * 0.32) * 2.2;
    this.camera.position.y = 2.6 + Math.cos(elapsed * 0.45) * 0.5;
    this.camera.position.z = 9.8;
    this.camera.lookAt(this.shipX * 0.35, -0.4, -24);
  }

  private updateGameplay(dt: number): void {
    const levelCfg = LEVELS[this.wave - 1];
    const jet = JETS[this.jetId];
    if (this.dataVirusTimer > 0) this.dataVirusTimer = Math.max(0, this.dataVirusTimer - dt);
    const timeSlow =
      this.dataVirusTimer > 0
        ? 0.05
        : this.jetId === 'chrono' && this.specialActiveTimer > 0
        ? 0.45
        : 1.0;
    const enemyDt = dt * timeSlow;

    const scrollSpeed = levelCfg.scrollSpeed + (this.barrelRollTimer > 0 ? 18 : 0);
    this.environment.update(dt, scrollSpeed, this.sectorMode);

    // Timers
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.bannerText = null;
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.multiplier = 1;
    }
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.playerHitFlash > 0) this.playerHitFlash -= dt;
    if (this.barrelRollCooldown > 0) this.barrelRollCooldown = Math.max(0, this.barrelRollCooldown - dt);
    if (this.specialCooldown > 0) this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    if (this.specialActiveTimer > 0) this.specialActiveTimer = Math.max(0, this.specialActiveTimer - dt);
    if (this.rollBufferTimer > 0) this.rollBufferTimer -= dt;
    if (this.specialBufferTimer > 0) this.specialBufferTimer -= dt;

    // Shogun Orbital Matrix auto-turret drones
    if (this.jetId === 'shogun_mk9' && this.specialActiveTimer > 0) {
      this.shogunDroneTimer -= dt;
      if (this.shogunDroneTimer <= 0) {
        this.shogunDroneTimer = 0.28;
        this.spawnPlayerBolt(this.shipX - 2.3, this.shipY + 0.5, -0.5, -4, 0, -110, 2.2 * this.baseDamageMult, true, false, 0xfbbf24, 1.3);
        this.spawnPlayerBolt(this.shipX + 2.3, this.shipY + 0.5, -0.5, 4, 0, -110, 2.2 * this.baseDamageMult, true, false, 0xfbbf24, 1.3);
      }
    }

    if (this.shieldRegenDelay > 0) {
      this.shieldRegenDelay -= dt;
    } else if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + dt * 7.5);
    }

    // EMP Ring Visual Expansion
    if (this.empRingTimer > 0) {
      this.empRingTimer -= dt;
      const progress = 1 - Math.max(0, this.empRingTimer) / 0.55;
      this.empRingMesh.visible = this.empRingTimer > 0;
      this.empRingMesh.scale.setScalar(1 + progress * 24);
      (this.empRingMesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.9;
    }

    // 1. Player Movement (Keyboard + Touch Joystick + Optional Pointer Drag)
    let moveX = this.touchSteerX;
    let moveY = this.touchSteerY;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) moveX -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) moveX += 1;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) moveY += 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) moveY -= 1;

    moveX = THREE.MathUtils.clamp(moveX, -1, 1);
    moveY = THREE.MathUtils.clamp(moveY, -1, 1);

    if (this.pointerTarget && Math.abs(moveX) < 0.05 && Math.abs(moveY) < 0.05) {
      const dx = this.pointerTarget.x - this.shipX;
      const dy = this.pointerTarget.y - this.shipY;
      moveX = THREE.MathUtils.clamp(dx * 0.38, -1, 1);
      moveY = THREE.MathUtils.clamp(dy * 0.38, -1, 1);
    }

    // Trigger Special Ability (Q key or Mobile Special Button)
    if (this.specialBufferTimer > 0 && this.specialCooldown <= 0) {
      this.specialBufferTimer = 0;
      this.activateSpecialAbility();
    }

    // Trigger Buffered Barrel Roll Dodge
    if (this.rollBufferTimer > 0 && this.barrelRollCooldown <= 0 && this.barrelRollTimer <= 0) {
      this.rollBufferTimer = 0;
      this.barrelRollTimer = 0.42;
      this.barrelRollCooldown = 1.15;
      this.invulnTimer = Math.max(this.invulnTimer, 0.46);
      this.barrelRollDir = moveX < -0.1 ? 1 : moveX > 0.1 ? -1 : this.shipX > 0 ? 1 : -1;
      this.shipVx += -this.barrelRollDir * 16;
      this.audio.playBarrelRoll();
    }

    const speedX = 24 * jet.speedMult;
    const speedY = 17 * jet.speedMult;
    this.shipVx = THREE.MathUtils.damp(this.shipVx, moveX * speedX, 11, dt);
    this.shipVy = THREE.MathUtils.damp(this.shipVy, moveY * speedY, 11, dt);

    this.shipX = THREE.MathUtils.clamp(this.shipX + this.shipVx * dt, -this.boundsX, this.boundsX);
    this.shipY = THREE.MathUtils.clamp(this.shipY + this.shipVy * dt, this.minY, this.maxY);

    this.playerRig.group.position.set(this.shipX, this.shipY, 0);
    let targetRoll = -this.shipVx * 0.028;
    if (this.barrelRollTimer > 0) {
      this.barrelRollTimer -= dt;
      const progress = 1 - Math.max(0, this.barrelRollTimer) / 0.42;
      targetRoll = this.barrelRollDir * progress * Math.PI * 2;
      this.playerRig.group.rotation.z = targetRoll;
    } else {
      this.playerRig.group.rotation.z = THREE.MathUtils.damp(this.playerRig.group.rotation.z, targetRoll, 12, dt);
    }
    this.playerRig.group.rotation.x = THREE.MathUtils.damp(
      this.playerRig.group.rotation.x,
      this.shipVy * 0.022,
      10,
      dt
    );
    if (this.playerRig.accentRing) {
      this.playerRig.accentRing.rotation.z += dt * 3.5;
    }

    const shieldMat = this.playerRig.shieldBubble.material as THREE.MeshBasicMaterial;
    const aegisActive = this.jetId === 'chrono' && this.specialActiveTimer > 0;
    const shieldTargetOpacity = aegisActive
      ? 0.5
      : this.barrelRollTimer > 0
      ? 0.35
      : this.playerHitFlash > 0
      ? 0.42
      : 0;
    shieldMat.opacity = THREE.MathUtils.damp(shieldMat.opacity, shieldTargetOpacity, 14, dt);
    this.playerRig.shieldBubble.rotation.y += dt * 3.5;

    const isOverdrive = this.jetId === 'vanguard' && this.specialActiveTimer > 0;
    const flamePulse = (isOverdrive ? 1.5 : 1.0) + Math.sin(performance.now() * 0.045) * 0.16;
    this.playerRig.leftFlame.scale.set(1, 1, flamePulse);
    this.playerRig.rightFlame.scale.set(1, 1, flamePulse);

    // 2. ALWAYS AUTO-SHOOT Weapons (based on collected Fragment pattern & bullet level)
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.fireCooldown <= 0) {
      this.firePlayerWeapons();
    }

    this.leftRecoil = THREE.MathUtils.damp(this.leftRecoil, 0, 18, dt);
    this.rightRecoil = THREE.MathUtils.damp(this.rightRecoil, 0, 18, dt);
    this.playerRig.leftCannon.position.z = -0.25 + this.leftRecoil;
    this.playerRig.rightCannon.position.z = -0.25 + this.rightRecoil;
    const lMuzzle = this.playerRig.leftMuzzle.material as THREE.MeshBasicMaterial;
    const rMuzzle = this.playerRig.rightMuzzle.material as THREE.MeshBasicMaterial;
    lMuzzle.opacity = THREE.MathUtils.damp(lMuzzle.opacity, 0, 24, dt);
    rMuzzle.opacity = THREE.MathUtils.damp(rMuzzle.opacity, 0, 24, dt);

    // 3. Level Wave Spawning + End-of-Level Boss Fight
    if (this.waveSpawnQueue.length > 0) {
      this.spawnCooldown -= enemyDt;
      const maxConcurrent = this.wave >= 6 ? 7 : 5;
      if (this.spawnCooldown <= 0 && this.enemies.length < maxConcurrent) {
        const nextKind = this.waveSpawnQueue.shift()!;
        this.spawnEnemy(nextKind);
        this.spawnCooldown = Math.max(0.5, 1.25 - this.wave * 0.035);
      }
    } else if (this.bossPending && !this.bossSpawned && this.enemies.length === 0) {
      // Spawn the End-of-Level Boss!
      this.bossPending = false;
      this.bossSpawned = true;
      this.spawnEnemy('dreadnought');
      this.showBanner(`BOSS ALERT · ${levelCfg.bossTitle}`, 3.0);
    } else if (this.bossSpawned && this.enemies.length === 0) {
      // Level Cleared!
      this.audio.playWaveClear();
      this.shield = Math.min(this.maxShield, this.shield + 35);

      if (this.wave >= 20) {
        // Completed all 20 levels!
        this.phase = 'victory';
        const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0;
        this.emitHud();
        this.callbacks.onGameOver({
          score: this.score,
          wave: 20,
          kills: this.kills,
          maxMultiplier: this.maxMultiplier,
          accuracy,
          victory: true,
        });
        return;
      }

      const nextLevel = this.wave + 1;
      this.setupLevel(nextLevel);
      this.callbacks.onWaveCleared(this.exportCheckpoint());
    }

    // Periodic ambient Weapon Fragment spawn so player regularly gets fragment upgrades
    this.fragmentDropTimer -= dt;
    if (this.fragmentDropTimer <= 0) {
      this.fragmentDropTimer = 8.5;
      const weaponKinds: FragmentKind[] = ['spread', 'stream', 'plasma', 'seeker'];
      const picked = weaponKinds[Math.floor(Math.random() * weaponKinds.length)];
      this.spawnFragment(
        THREE.MathUtils.randFloat(-this.boundsX * 0.75, this.boundsX * 0.75),
        THREE.MathUtils.randFloat(-2.5, 3.2),
        -75,
        picked
      );
    }

    // 4. Update Enemies, Bombs, Projectiles & Fragments
    this.updateEnemies(enemyDt);
    this.updateEnemyBombs(enemyDt);
    this.updatePlayerBolts(dt);
    this.updateEnemyBolts(enemyDt);
    this.updateFragments(dt);

    // 5. Smooth Chase Camera
    this.cameraShake = THREE.MathUtils.damp(this.cameraShake, 0, 10, dt);
    const shakeX = (Math.random() - 0.5) * this.cameraShake;
    const shakeY = (Math.random() - 0.5) * this.cameraShake;

    const targetFov = this.barrelRollTimer > 0 ? 70 : isOverdrive ? 67 : 62;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
      this.camera.updateProjectionMatrix();
    }

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.shipX * 0.62, 6, dt) + shakeX;
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.shipY * 0.45 + 3.1, 6, dt) + shakeY;
    this.camera.position.z = 10.6;
    this.camera.lookAt(this.shipX * 0.42, this.shipY * 0.35 - 0.3, -24);
  }

  private activateSpecialAbility(): void {
    const jet = JETS[this.jetId];
    this.specialCooldown = jet.specialCooldown;
    this.specialActiveTimer = jet.specialDuration;
    this.audio.playSpecialAbility(this.jetId);
    this.showBanner(`${jet.specialName} ACTIVATED`, 1.8);

    if (this.jetId === 'phantom') {
      // EMP Shockwave: clear all enemy bolts & bombs, damage all active enemies
      this.empRingMesh.position.set(this.shipX, this.shipY, -1);
      this.empRingMesh.scale.setScalar(1);
      this.empRingMesh.visible = true;
      this.empRingTimer = 0.55;

      for (const b of this.enemyBolts) {
        if (b.active) {
          b.active = false;
          b.mesh.visible = false;
        }
      }
      for (const bomb of this.enemyBombs) {
        this.spawnExplosion(bomb.x, bomb.y, bomb.z, 10, 0x38bdf8, 12);
        this.scene.remove(bomb.mesh);
      }
      this.enemyBombs = [];

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        this.damageEnemy(i, 12 * this.baseDamageMult, e.x, e.y, e.z);
      }
      this.cameraShake = Math.max(this.cameraShake, 0.35);
    } else if (this.jetId === 'valkyrie') {
      for (let k = 0; k < 8; k++) {
        const angle = ((k - 3.5) / 3.5) * 1.1;
        this.spawnPlayerBolt(
          this.shipX + Math.sin(angle) * 1.6,
          this.shipY + 0.3,
          -1.4,
          Math.sin(angle) * 26,
          Math.cos(angle) * 6,
          -98,
          3.2 * this.baseDamageMult,
          true,
          true,
          0xfb7185,
          1.6
        );
      }
    } else if (this.jetId === 'chrono') {
      this.invulnTimer = Math.max(this.invulnTimer, jet.specialDuration);
      this.shield = Math.min(this.maxShield, this.shield + 35);
    } else if (this.jetId === 'cyber_kitsune') {
      // 6 sweeping pink cyber-katana slashes + phase invulnerability
      this.invulnTimer = Math.max(this.invulnTimer, 2.5);
      for (let k = 0; k < 6; k++) {
        const spread = ((k - 2.5) / 2.5) * 22;
        this.spawnPlayerBolt(
          this.shipX + (k - 2.5) * 0.9,
          this.shipY + 0.25,
          -1.6,
          spread,
          0,
          -135,
          4.2 * this.baseDamageMult,
          false,
          true,
          0xff2e93,
          1.85
        );
      }
    } else if (this.jetId === 'netrunner') {
      // Data Virus Swarm: freezes enemies, clears enemy bombs, deals shock damage
      this.dataVirusTimer = jet.specialDuration;
      this.empRingMesh.position.set(this.shipX, this.shipY, -1);
      this.empRingMesh.scale.setScalar(1);
      (this.empRingMesh.material as THREE.MeshBasicMaterial).color.setHex(0x22d3ee);
      this.empRingMesh.visible = true;
      this.empRingTimer = 0.55;

      for (const bomb of this.enemyBombs) {
        this.spawnExplosion(bomb.x, bomb.y, bomb.z, 10, 0x22d3ee, 12);
        this.scene.remove(bomb.mesh);
      }
      this.enemyBombs = [];
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        this.damageEnemy(i, 9 * this.baseDamageMult, e.x, e.y, e.z);
      }
    } else if (this.jetId === 'shogun_mk9') {
      this.shield = Math.min(this.maxShield, this.shield + 25);
      this.shogunDroneTimer = 0;
    }
  }

  private spawnPlayerBolt(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    damage: number,
    homing: boolean,
    splash: boolean,
    colorHex: number,
    scaleMult = 1
  ): void {
    const bolt = this.playerBolts.find((b) => !b.active);
    if (!bolt) return;
    bolt.active = true;
    bolt.x = x;
    bolt.y = y;
    bolt.z = z;
    bolt.vx = vx;
    bolt.vy = vy;
    bolt.vz = vz;
    bolt.damage = damage;
    bolt.homing = homing;
    bolt.splash = splash;
    bolt.colorHex = colorHex;
    bolt.mesh.position.set(x, y, z);
    bolt.mesh.scale.set(scaleMult, scaleMult, scaleMult);
    (bolt.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
    bolt.mesh.visible = true;
    this.shotsFired++;
  }

  private firePlayerWeapons(): void {
    const isVanguardOverdrive = this.jetId === 'vanguard' && this.specialActiveTimer > 0;
    const isRoninOverload = this.jetId === 'ronin_x' && this.specialActiveTimer > 0;
    const tier = Math.min(5, this.laserLevel + (isVanguardOverdrive || isRoninOverload ? 1 : 0));
    const dmg = this.baseDamageMult * (isRoninOverload ? 2.4 : isVanguardOverdrive ? 1.35 : 1.0);

    let cooldown = 0.135;
    if (this.weaponPattern === 'stream') cooldown = 0.085;
    else if (this.weaponPattern === 'plasma') cooldown = 0.17;
    if (isVanguardOverdrive) cooldown *= 0.62;

    this.fireCooldown = cooldown;

    const boltSpeed = this.weaponPattern === 'stream' ? -145 : -128;

    if (this.weaponPattern === 'spread') {
      // Fan spread: 3 to 7 bolts depending on tier
      const count = 2 + tier;
      for (let i = 0; i < count; i++) {
        const frac = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
        this.spawnPlayerBolt(
          this.shipX + frac * 1.1,
          this.shipY + 0.34,
          -1.6,
          frac * 24,
          0,
          boltSpeed,
          dmg * 0.9,
          false,
          false,
          0xfbbf24,
          1.05
        );
      }
    } else if (this.weaponPattern === 'stream') {
      // Parallel rapid barrage: 2 to 6 parallel laser streams
      const count = 1 + tier;
      const spacing = 0.45;
      const startX = -((count - 1) * spacing) / 2;
      for (let i = 0; i < count; i++) {
        this.spawnPlayerBolt(
          this.shipX + startX + i * spacing,
          this.shipY + 0.34,
          -1.6,
          0,
          0,
          boltSpeed,
          dmg * 0.85,
          false,
          false,
          0x4ade80,
          0.95
        );
      }
    } else if (this.weaponPattern === 'plasma') {
      // Heavy explosive plasma orbs (1 to 3 big splash bolts)
      const count = tier >= 4 ? 3 : tier >= 2 ? 2 : 1;
      const offsets = count === 1 ? [0] : count === 2 ? [-0.68, 0.68] : [-0.95, 0, 0.95];
      for (const ox of offsets) {
        this.spawnPlayerBolt(
          this.shipX + ox,
          this.shipY + 0.34,
          -1.6,
          0,
          0,
          -112,
          dmg * 2.1,
          false,
          true,
          0xe879f9,
          1.75
        );
      }
    } else if (this.weaponPattern === 'seeker') {
      // Main twin cannons + homing cyan seekers
      this.spawnPlayerBolt(this.shipX - 0.62, this.shipY + 0.36, -1.6, 0, 0, boltSpeed, dmg, false, false, 0x4ade80, 1);
      this.spawnPlayerBolt(this.shipX + 0.62, this.shipY + 0.36, -1.6, 0, 0, boltSpeed, dmg, false, false, 0x4ade80, 1);
      const seekers = Math.min(4, tier);
      for (let i = 0; i < seekers; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        this.spawnPlayerBolt(
          this.shipX + side * (1.2 + i * 0.25),
          this.shipY + 0.2,
          -1.5,
          side * 12,
          0,
          -105,
          dmg * 0.85,
          true,
          false,
          0x38bdf8,
          1.15
        );
      }
    } else {
      // Twin base pattern: scales 2 -> 5 bolts as bullet level rises
      this.spawnPlayerBolt(this.shipX - 0.62, this.shipY + 0.36, -1.6, 0, 0, boltSpeed, dmg, false, false, 0x4ade80, 1);
      this.spawnPlayerBolt(this.shipX + 0.62, this.shipY + 0.36, -1.6, 0, 0, boltSpeed, dmg, false, false, 0x4ade80, 1);
      if (tier >= 2) {
        this.spawnPlayerBolt(this.shipX, this.shipY + 0.44, -1.8, 0, 0, boltSpeed, dmg * 0.9, false, false, 0x86efac, 1.1);
      }
      if (tier >= 4) {
        this.spawnPlayerBolt(this.shipX - 1.45, this.shipY + 0.1, -1.4, -5, 0, boltSpeed, dmg * 0.8, false, false, 0xe879f9, 1);
        this.spawnPlayerBolt(this.shipX + 1.45, this.shipY + 0.1, -1.4, 5, 0, boltSpeed, dmg * 0.8, false, false, 0xe879f9, 1);
      }
    }

    this.leftRecoil = 0.22;
    this.rightRecoil = 0.22;
    (this.playerRig.leftMuzzle.material as THREE.MeshBasicMaterial).opacity = 0.92;
    (this.playerRig.rightMuzzle.material as THREE.MeshBasicMaterial).opacity = 0.92;
    this.audio.playLaser(isVanguardOverdrive || tier >= 4);
  }

  private updateEnemies(dt: number): void {
    let lockedEnemy: EnemyActor | null = null;
    let bestLockDist = Infinity;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.age += dt;

      e.z = THREE.MathUtils.damp(e.z, e.targetZ, e.kind === 'dreadnought' ? 1.6 : 2.6, dt);
      const swayAmp = e.kind === 'dreadnought' ? 4.8 : e.kind === 'bomber' ? 3.5 : e.kind === 'gunship' ? 3.8 : 3.4;
      const swayFreq = e.kind === 'dreadnought' ? 0.6 : e.kind === 'bomber' ? 0.75 : e.kind === 'gunship' ? 0.9 : 1.45;
      const targetX = THREE.MathUtils.clamp(
        e.baseX + Math.sin(e.age * swayFreq + e.phaseOffset) * swayAmp,
        -this.boundsX,
        this.boundsX
      );
      const targetY = THREE.MathUtils.clamp(
        e.baseY + Math.cos(e.age * swayFreq * 0.8 + e.phaseOffset) * 1.4,
        -3.5,
        5.0
      );
      const prevX = e.x;
      e.x = THREE.MathUtils.damp(e.x, targetX, 3.8, dt);
      e.y = THREE.MathUtils.damp(e.y, targetY, 3.8, dt);

      e.rig.group.position.set(e.x, e.y, e.z);
      e.rig.group.rotation.z = THREE.MathUtils.clamp((prevX - e.x) * 0.38, -0.45, 0.45);

      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= dt;
        const flashOn = e.hitFlashTimer > 0;
        e.rig.hitMeshes.forEach((m, idx) => {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (flashOn) {
            mat.emissive.setHex(0xffffff);
            mat.emissiveIntensity = 3.2;
          } else {
            mat.emissive.copy(e.rig.baseEmissives[idx]);
            mat.emissiveIntensity = m === e.rig.coreMesh ? 2.6 : 0.45;
          }
        });
      }

      if (e.z > -72) {
        // Standard plasma fire
        e.fireTimer -= dt;
        if (e.fireTimer <= 0.32 && e.fireTimer > 0) {
          const coreMat = e.rig.coreMesh.material as THREE.MeshStandardMaterial;
          coreMat.emissiveIntensity = 4.6 + Math.sin(e.age * 35) * 1.5;
        }
        if (e.fireTimer <= 0) {
          this.fireEnemyPlasma(e);
          const rateBoost = Math.max(0.45, 1 - this.wave * 0.025);
          e.fireTimer =
            e.kind === 'dreadnought'
              ? 1.45 * rateBoost
              : e.kind === 'gunship'
              ? 2.0 * rateBoost
              : 2.5 * rateBoost;
        }

        // Special Bombs from Bombers, Gunships, and every Boss
        if (e.kind === 'dreadnought' || e.kind === 'bomber' || (e.kind === 'gunship' && this.wave >= 2)) {
          e.bombTimer -= dt;
          if (e.bombTimer <= 0) {
            this.launchSpecialBomb(e);
            e.bombTimer = e.kind === 'dreadnought' ? 3.2 : e.kind === 'bomber' ? 3.4 : 5.4;
          }
        }
      }

      const dx = e.x - this.shipX;
      const dy = e.y - this.shipY;
      const aimDist = Math.hypot(dx, dy);
      if (aimDist < bestLockDist && e.z < -8) {
        bestLockDist = aimDist;
        lockedEnemy = e;
      }
    }

    if (lockedEnemy) {
      this.reticleGroup.visible = true;
      _v1.set(lockedEnemy.x, lockedEnemy.y, lockedEnemy.z + lockedEnemy.radius * 0.8);
      this.reticleGroup.position.lerp(_v1, Math.min(1, dt * 16));
      const s = lockedEnemy.kind === 'dreadnought' ? 2.8 : lockedEnemy.kind === 'gunship' ? 1.5 : 1.05;
      this.reticleGroup.scale.setScalar(s);
      this.reticleGroup.rotation.z += dt * 1.8;
    } else {
      this.reticleGroup.visible = false;
    }
  }

  private fireEnemyPlasma(e: EnemyActor): void {
    const speed = 32 + this.wave * 1.1;
    const spawnShot = (ox: number, oy: number, aimSpreadX = 0) => {
      const bolt = this.enemyBolts.find((b) => !b.active);
      if (!bolt) return;
      const sx = e.x + ox;
      const sy = e.y + oy;
      const sz = e.z + 1.5;

      _v1.set(this.shipX + aimSpreadX - sx, this.shipY - sy, 0 - sz).normalize();
      bolt.active = true;
      bolt.x = sx;
      bolt.y = sy;
      bolt.z = sz;
      bolt.vx = _v1.x * speed;
      bolt.vy = _v1.y * speed;
      bolt.vz = _v1.z * speed;
      bolt.damage = e.kind === 'dreadnought' ? 16 : e.kind === 'gunship' ? 13 : 10;
      bolt.mesh.position.set(sx, sy, sz);
      bolt.mesh.scale.setScalar(e.kind === 'dreadnought' ? 1.35 : 1.0);
      bolt.mesh.visible = true;
    };

    if (e.kind === 'dreadnought') {
      spawnShot(-4.2, -0.1, -3.0);
      spawnShot(0, 0.1, 0);
      spawnShot(4.2, -0.1, 3.0);
    } else if (e.kind === 'gunship') {
      spawnShot(-1.7, 0, -1.2);
      spawnShot(1.7, 0, 1.2);
    } else {
      spawnShot(0, 0, 0);
    }
  }

  private launchSpecialBomb(e: EnemyActor): void {
    const kinds: BombKind[] =
      e.kind === 'dreadnought'
        ? ['cluster', 'mine', 'torpedo']
        : e.kind === 'bomber'
        ? ['cluster', 'mine']
        : ['torpedo'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const mesh = createBombMesh(kind);
    const sx = e.x;
    const sy = e.y - 0.5;
    const sz = e.z + 2.0;
    mesh.position.set(sx, sy, sz);
    this.scene.add(mesh);

    _v1.set(this.shipX - sx, this.shipY - sy, -sz).normalize();
    const speed = kind === 'torpedo' ? 25 : kind === 'cluster' ? 19 : 14;

    this.enemyBombs.push({
      kind,
      mesh,
      x: sx,
      y: sy,
      z: sz,
      vx: _v1.x * speed,
      vy: _v1.y * speed,
      vz: _v1.z * speed,
      hp: kind === 'torpedo' ? 2 : 3,
      age: 0,
      fuseTimer: kind === 'cluster' ? 1.45 : kind === 'mine' ? 4.5 : 8.0,
    });
  }

  private updateEnemyBombs(dt: number): void {
    for (let i = this.enemyBombs.length - 1; i >= 0; i--) {
      const bomb = this.enemyBombs[i];
      bomb.age += dt;
      bomb.fuseTimer -= dt;

      if (bomb.kind === 'torpedo') {
        // Gentle homing guidance toward player
        _v1.set(this.shipX - bomb.x, this.shipY - bomb.y, 0 - bomb.z).normalize();
        bomb.vx = THREE.MathUtils.damp(bomb.vx, _v1.x * 26, 2.2, dt);
        bomb.vy = THREE.MathUtils.damp(bomb.vy, _v1.y * 26, 2.2, dt);
        bomb.vz = THREE.MathUtils.damp(bomb.vz, _v1.z * 26, 2.2, dt);
      } else if (bomb.kind === 'mine') {
        // Slow down as it nears playfield plane
        if (bomb.z > -18) {
          bomb.vx *= 0.96;
          bomb.vy *= 0.96;
          bomb.vz = Math.max(4, bomb.vz * 0.97);
        }
      }

      bomb.x += bomb.vx * dt;
      bomb.y += bomb.vy * dt;
      bomb.z += bomb.vz * dt;
      bomb.mesh.position.set(bomb.x, bomb.y, bomb.z);
      bomb.mesh.rotation.y += dt * 3.2;
      bomb.mesh.rotation.x += dt * 2.1;

      if (bomb.kind === 'cluster' && bomb.fuseTimer <= 0) {
        // Cluster bomb splits mid-air into 6 radial shrapnel bolts!
        this.spawnExplosion(bomb.x, bomb.y, bomb.z, 14, 0xff5500, 12);
        this.audio.playExplosion('small');
        for (let k = 0; k < 6; k++) {
          const angle = (k / 6) * Math.PI * 2;
          const bolt = this.enemyBolts.find((b) => !b.active);
          if (bolt) {
            bolt.active = true;
            bolt.x = bomb.x;
            bolt.y = bomb.y;
            bolt.z = bomb.z;
            bolt.vx = Math.cos(angle) * 14;
            bolt.vy = Math.sin(angle) * 10;
            bolt.vz = 26;
            bolt.damage = 12;
            bolt.mesh.position.set(bolt.x, bolt.y, bolt.z);
            bolt.mesh.scale.setScalar(1.1);
            bolt.mesh.visible = true;
          }
        }
        this.scene.remove(bomb.mesh);
        this.enemyBombs.splice(i, 1);
        continue;
      }

      if (bomb.z > 10 || (bomb.kind === 'mine' && bomb.fuseTimer <= 0)) {
        this.scene.remove(bomb.mesh);
        this.enemyBombs.splice(i, 1);
        continue;
      }

      if (this.invulnTimer <= 0 && Math.abs(bomb.z) < 2.0) {
        const dx = bomb.x - this.shipX;
        const dy = bomb.y - this.shipY;
        if (dx * dx + dy * dy <= 2.15 * 2.15) {
          this.spawnExplosion(bomb.x, bomb.y, bomb.z, 18, 0xff4500, 14);
          this.scene.remove(bomb.mesh);
          this.enemyBombs.splice(i, 1);
          this.damagePlayer(22);
        }
      }
    }
  }

  private updatePlayerBolts(dt: number): void {
    for (const b of this.playerBolts) {
      if (!b.active) continue;

      if (b.homing && this.enemies.length > 0) {
        let nearest: EnemyActor | null = null;
        let bestD = Infinity;
        for (const e of this.enemies) {
          const d = (e.x - b.x) ** 2 + (e.y - b.y) ** 2 + (e.z - b.z) ** 2;
          if (d < bestD && e.z < b.z + 6) {
            bestD = d;
            nearest = e;
          }
        }
        if (nearest) {
          _v1.set(nearest.x - b.x, nearest.y - b.y, nearest.z - b.z).normalize().multiplyScalar(115);
          b.vx = THREE.MathUtils.damp(b.vx, _v1.x, 7.5, dt);
          b.vy = THREE.MathUtils.damp(b.vy, _v1.y, 7.5, dt);
          b.vz = THREE.MathUtils.damp(b.vz, _v1.z, 7.5, dt);
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.mesh.position.set(b.x, b.y, b.z);

      if (b.z < -135) {
        b.active = false;
        b.mesh.visible = false;
        continue;
      }

      // Check collision against shootable Enemy Special Bombs
      let hitBomb = false;
      for (let j = this.enemyBombs.length - 1; j >= 0; j--) {
        const bomb = this.enemyBombs[j];
        const dx = b.x - bomb.x;
        const dy = b.y - bomb.y;
        const dz = b.z - bomb.z;
        if (dx * dx + dy * dy + dz * dz <= 1.35 * 1.35) {
          b.active = false;
          b.mesh.visible = false;
          this.shotsHit++;
          bomb.hp -= b.damage;
          this.spawnExplosion(bomb.x, bomb.y, bomb.z, 5, 0xfbbf24, 8);
          if (bomb.hp <= 0) {
            this.score += 180 * this.multiplier;
            this.spawnExplosion(bomb.x, bomb.y, bomb.z, 14, 0xff7b1c, 12);
            this.audio.playExplosion('small');
            this.scene.remove(bomb.mesh);
            this.enemyBombs.splice(j, 1);
          } else {
            this.audio.playHitConfirm();
          }
          hitBomb = true;
          break;
        }
      }
      if (hitBomb) continue;

      // Check collision against active enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const dz = b.z - e.z;
        const hitR = e.radius + 0.55;
        if (dx * dx + dy * dy + dz * dz <= hitR * hitR) {
          b.active = false;
          b.mesh.visible = false;
          this.shotsHit++;
          if (b.splash) {
            this.spawnExplosion(b.x, b.y, b.z, 10, b.colorHex, 11);
          }
          this.damageEnemy(i, b.damage, b.x, b.y, b.z);
          break;
        }
      }
    }
  }

  private damageEnemy(index: number, damage: number, hitX: number, hitY: number, hitZ: number): void {
    const e = this.enemies[index];
    if (!e) return;
    e.hp -= damage;
    e.hitFlashTimer = 0.075;
    this.spawnExplosion(hitX, hitY, hitZ, 4, 0x4ade80, 7);

    if (e.hp > 0) {
      this.audio.playHitConfirm();
      return;
    }

    this.scene.remove(e.rig.group);
    this.enemies.splice(index, 1);

    this.kills++;
    this.waveKills++;
    this.comboTimer = 4.2;
    this.multiplier = Math.min(5, this.multiplier + 1);
    this.maxMultiplier = Math.max(this.maxMultiplier, this.multiplier);

    const points = e.scoreValue * this.multiplier;
    this.score += points;
    if (this.score > this.highScore) this.highScore = this.score;

    const isBoss = e.kind === 'dreadnought';
    const isHeavy = e.kind === 'gunship' || e.kind === 'bomber';
    this.spawnExplosion(e.x, e.y, e.z, isBoss ? 52 : isHeavy ? 24 : 15, 0xff7b1c, isBoss ? 24 : 13);
    this.spawnExplosion(e.x, e.y, e.z, isBoss ? 26 : 8, 0xfef08a, 10);
    this.audio.playExplosion(isBoss ? 'boss' : isHeavy ? 'medium' : 'small');

    this.cameraShake = Math.min(0.85, this.cameraShake + (isBoss ? 0.65 : isHeavy ? 0.28 : 0.14));
    if (isBoss || isHeavy) {
      this.hitstopTimer = isBoss ? 0.065 : 0.03;
    }

    // Drop Crystal Weapon / Support Fragment
    const dropRoll = Math.random();
    if (isBoss || dropRoll < (isHeavy ? 0.52 : 0.24)) {
      const pool: FragmentKind[] = ['spread', 'stream', 'plasma', 'seeker', 'shield', 'hull'];
      const kind = pool[Math.floor(Math.random() * pool.length)];
      this.spawnFragment(e.x, e.y, e.z, kind);
    }
  }

  private spawnFragment(x: number, y: number, z: number, kind: FragmentKind): void {
    const mesh = createFragmentMesh(kind);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.fragments.push({ mesh, kind, x, y, z, age: 0 });
  }

  private updateEnemyBolts(dt: number): void {
    for (const b of this.enemyBolts) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.mesh.position.set(b.x, b.y, b.z);

      if (b.z > 12 || Math.abs(b.x) > 22 || Math.abs(b.y) > 16) {
        b.active = false;
        b.mesh.visible = false;
        continue;
      }

      if (this.invulnTimer <= 0 && Math.abs(b.z) < 1.55) {
        const dx = b.x - this.shipX;
        const dy = b.y - this.shipY;
        if (dx * dx + dy * dy <= 1.75 * 1.75) {
          b.active = false;
          b.mesh.visible = false;
          this.damagePlayer(b.damage);
        }
      }
    }
  }

  private damagePlayer(amount: number): void {
    this.shieldRegenDelay = 3.0;
    this.playerHitFlash = 0.25;
    this.invulnTimer = 0.38;
    this.cameraShake = Math.min(0.7, this.cameraShake + 0.38);
    this.multiplier = Math.max(1, this.multiplier - 1);

    const hadShield = this.shield > 0;
    this.audio.playPlayerHit(hadShield);

    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      const remainder = amount - absorbed;
      if (remainder > 0) this.health = Math.max(0, this.health - remainder);
    } else {
      this.health = Math.max(0, this.health - amount);
    }

    this.spawnExplosion(this.shipX, this.shipY, 0, 10, hadShield ? 0x38bdf8 : 0xef4444, 9);

    if (this.health <= 0) {
      this.health = 0;
      this.phase = 'gameover';
      this.audio.playExplosion('boss');
      this.spawnExplosion(this.shipX, this.shipY, 0, 42, 0xd946ef, 18);
      const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0;
      this.emitHud();
      this.callbacks.onGameOver({
        score: this.score,
        wave: this.wave,
        kills: this.kills,
        maxMultiplier: this.maxMultiplier,
        accuracy,
        victory: false,
      });
    }
  }

  private updateFragments(dt: number): void {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i];
      f.age += dt;
      f.z += 21 * dt;

      // Gentle magnetic pull when near the player's ship
      const dx = this.shipX - f.x;
      const dy = this.shipY - f.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 36 && f.z > -22) {
        f.x += dx * dt * 2.4;
        f.y += dy * dt * 2.4;
      }

      f.mesh.position.set(f.x, f.y + Math.sin(f.age * 4) * 0.25, f.z);
      f.mesh.rotation.y += dt * 2.8;
      f.mesh.rotation.x += dt * 1.6;

      if (f.z > 8) {
        this.scene.remove(f.mesh);
        this.fragments.splice(i, 1);
        continue;
      }

      if (Math.abs(f.z) < 2.2 && distSq <= 2.6 * 2.6) {
        this.scene.remove(f.mesh);
        this.fragments.splice(i, 1);
        this.applyFragment(f.kind);
      }
    }
  }

  private applyFragment(kind: FragmentKind): void {
    this.audio.playPowerUp(kind);
    this.score += 150 * this.multiplier;

    if (kind === 'shield') {
      this.shield = Math.min(this.maxShield, this.shield + 45);
      this.showBanner('SHIELD FRAGMENT +45', 1.5);
      return;
    }
    if (kind === 'hull') {
      this.health = Math.min(this.maxHealth, this.health + 35);
      this.showBanner('HULL FRAGMENT +35', 1.5);
      return;
    }

    // Weapon Fragment: changes bullet pattern & increases bullet count (tier up to 5)
    this.laserLevel = Math.min(5, this.laserLevel + 1);
    this.weaponPattern = kind;
    const labelMap: Record<WeaponPattern, string> = {
      twin: 'TWIN LASER',
      spread: 'SPREAD FAN',
      stream: 'MULTI-STREAM',
      plasma: 'PLASMA ORB',
      seeker: 'HOMING SEEKER',
    };
    this.showBanner(`FRAGMENT: ${labelMap[kind]} · LV ${this.laserLevel}`, 1.9);
  }

  private spawnExplosion(x: number, y: number, z: number, count: number, hexColor: number, speed: number): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.z = z;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const s = speed * (0.4 + Math.random() * 0.85);
      p.vx = Math.sin(phi) * Math.cos(theta) * s;
      p.vy = Math.sin(phi) * Math.sin(theta) * s;
      p.vz = Math.cos(phi) * s;
      p.maxLife = 0.28 + Math.random() * 0.35;
      p.life = p.maxLife;
      p.size = 0.65 + Math.random() * 1.1;
      p.color.setHex(hexColor);
      spawned++;
      if (spawned >= count) break;
    }
  }

  private updateParticles(dt: number): void {
    let dirty = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.particleMesh.setMatrixAt(i, _mat4);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vz *= 0.96;

      const s = (p.life / p.maxLife) * p.size;
      _v1.set(p.x, p.y, p.z);
      _euler.set(p.life * 6, p.life * 4, 0);
      _quat.setFromEuler(_euler);
      _scale.set(s, s, s);
      _mat4.compose(_v1, _quat, _scale);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, p.color);
    }

    if (dirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private emitHud(): void {
    const levelCfg = LEVELS[THREE.MathUtils.clamp(this.wave, 1, 20) - 1];
    const jet = JETS[this.jetId];
    let bossName: string | null = null;
    let bossHpRatio = 0;
    const radarBlips: RadarBlip[] = [];

    for (const e of this.enemies) {
      if (e.kind === 'dreadnought') {
        bossName = levelCfg.bossTitle;
        bossHpRatio = Math.max(0, e.hp / e.maxHp);
      }
      radarBlips.push({
        nx: THREE.MathUtils.clamp((e.x - this.shipX) / 18, -1, 1),
        nz: THREE.MathUtils.clamp(-e.z / 75, 0, 1),
        kind: e.kind,
      });
    }

    for (const b of this.enemyBombs) {
      radarBlips.push({
        nx: THREE.MathUtils.clamp((b.x - this.shipX) / 18, -1, 1),
        nz: THREE.MathUtils.clamp(-b.z / 75, 0, 1),
        kind: 'bomb',
      });
    }

    this.callbacks.onHudUpdate({
      phase: this.phase,
      jetId: this.jetId,
      score: this.score,
      highScore: this.highScore,
      multiplier: this.multiplier,
      maxMultiplier: this.maxMultiplier,
      comboTimer: Math.max(0, this.comboTimer / 4.2),
      wave: this.wave,
      totalLevels: 20,
      waveProgress: this.waveKills,
      waveTotal: this.waveTotal,
      kills: this.kills,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      health: Math.ceil(this.health),
      maxHealth: this.maxHealth,
      shield: Math.ceil(this.shield),
      maxShield: this.maxShield,
      laserLevel: this.laserLevel,
      weaponPattern: this.weaponPattern,
      specialName: jet.specialName,
      specialCooldown: this.specialCooldown,
      specialMaxCooldown: jet.specialCooldown,
      specialActiveTimer: this.specialActiveTimer,
      barrelRollCooldown: this.barrelRollCooldown,
      sectorMode: this.sectorMode,
      arenaName: ARENA_THEMES[this.sectorMode].name,
      dangerAlert: this.health / this.maxHealth <= 0.3,
      bannerText: this.bannerText,
      bossName,
      bossHpRatio,
      radarBlips,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.onResize);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('contextmenu', this.onContextMenu);

    this.audio.dispose();
    this.environment.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
