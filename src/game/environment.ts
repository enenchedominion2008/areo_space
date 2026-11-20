import * as THREE from 'three';
import { ARENA_THEMES, type ArenaThemeId } from './types';

interface CanyonBlock {
  mesh: THREE.Group;
  z: number;
}

interface CelestialMaterialEntry {
  mat: THREE.Material & { opacity: number; transparent: boolean };
  baseOpacity: number;
}

const _c1 = new THREE.Color();
const _c2 = new THREE.Color();
const _c3 = new THREE.Color();
const _bossBgTint = new THREE.Color(0x1f040b);
const _bossWireTint = new THREE.Color(0xff4d6d);
const _bossStripTint = new THREE.Color(0xfbbf24);

/**
 * 15-Arena 3D Cyberpunk & Cosmic Environment with 4 dynamic terrain/side-block modes
 * ('structure' | 'city' | 'waves' | 'void'), orbital celestial landmarks,
 * smooth arena cross-fades, and smooth boss-fight scene transitions.
 */
export class CyberTrenchEnvironment {
  public readonly group = new THREE.Group();
  private scene: THREE.Scene;
  private maxAniso: number;
  private floorGridTexture: THREE.CanvasTexture;
  private wallTexture: THREE.CanvasTexture;
  private cityFacadeTexture: THREE.CanvasTexture;

  // Floor & trench rails (fade out cleanly in 'waves' and 'void' modes)
  private floorBaseMesh: THREE.Mesh;
  private floorGridMesh: THREE.Mesh;
  private floorRailMeshes: THREE.Mesh[] = [];
  private floorBaseMat: THREE.MeshBasicMaterial;
  private floorGridMat: THREE.MeshBasicMaterial;
  private railMat: THREE.MeshBasicMaterial;
  private floorConduitMat: THREE.MeshBasicMaterial;
  private floorAlpha = 1;

  // Mode 1: Normal industrial cyberpunk canyon structures
  private structureGroup = new THREE.Group();
  private structureSolidMat: THREE.MeshStandardMaterial;
  private structureWireMat: THREE.LineBasicMaterial;
  private structureNeonMat: THREE.MeshBasicMaterial;
  private canyonBlocks: CanyonBlock[] = [];
  private structureAlpha = 1;

  // Mode 2: Towering cyberpunk megacity skyscrapers & skyways
  private cityGroup = new THREE.Group();
  private cityBuildingMat: THREE.MeshStandardMaterial;
  private cityWireMat: THREE.LineBasicMaterial;
  private cityNeonMat: THREE.MeshBasicMaterial;
  private cityBlocks: CanyonBlock[] = [];
  private cityAlpha = 0;

  // Mode 3: Animated 3D cyber-waves floor + sculpted flanking wave-crest ridges
  private waveGroup = new THREE.Group();
  private waveGeo: THREE.PlaneGeometry;
  private waveSurfaceMat: THREE.MeshStandardMaterial;
  private waveWireMat: THREE.MeshBasicMaterial;
  private waveCrestSolidMat: THREE.MeshStandardMaterial;
  private waveCrestWireMat: THREE.LineBasicMaterial;
  private waveCrestNeonMat: THREE.MeshBasicMaterial;
  private waveCrestBlocks: CanyonBlock[] = [];
  private waveAlpha = 0;
  private wavePhase = 0;

  private tunnelArches: THREE.Mesh[] = [];
  private tunnelArchMat: THREE.MeshBasicMaterial;
  private stars: THREE.Points;
  private tunnelOpacity = 0;
  private bossBlend = 0;
  private targetThemeId: ArenaThemeId = 'emerald_trench';

  // Celestial Skyscape Groups per Arena with smooth alpha + horizon transitions
  private celestialGroups: Record<ArenaThemeId, THREE.Group>;
  private celestialMaterials: Record<ArenaThemeId, CelestialMaterialEntry[]>;
  private celestialAlphas: Record<ArenaThemeId, number>;
  private animatedBodies: Array<{ obj: THREE.Object3D; speedX?: number; speedY: number; speedZ?: number }> = [];

  private readonly blockSpacing = 18;
  private readonly blockPairs = 15;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.scene = scene;
    this.maxAniso = renderer.capabilities.getMaxAnisotropy();

    const initialTheme = ARENA_THEMES[this.targetThemeId];

    // Grayscale cyber-grid masks tinted smoothly at runtime for zero-hitch arena transitions
    this.floorGridTexture = this.createGridMaskTexture(4, 4, true);
    this.floorGridTexture.repeat.set(16, 54);
    this.floorGridTexture.anisotropy = this.maxAniso;

    this.wallTexture = this.createGridMaskTexture(2, 2, false);
    this.wallTexture.repeat.set(2, 2);
    this.wallTexture.anisotropy = this.maxAniso;

    this.cityFacadeTexture = this.createCityFacadeTexture();
    this.cityFacadeTexture.repeat.set(2, 4);
    this.cityFacadeTexture.anisotropy = this.maxAniso;

    // ─── Under-ship Trench Floor & Rails ─────────────────────────────────────────
    const floorGeo = new THREE.PlaneGeometry(54, 320);
    this.floorBaseMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(initialTheme.floorBgColor),
      transparent: true,
      opacity: 1,
    });
    this.floorBaseMesh = new THREE.Mesh(floorGeo, this.floorBaseMat);
    this.floorBaseMesh.rotation.x = -Math.PI / 2;
    this.floorBaseMesh.position.set(0, -7.84, -65);
    this.group.add(this.floorBaseMesh);

    this.floorGridMat = new THREE.MeshBasicMaterial({
      map: this.floorGridTexture,
      color: new THREE.Color(initialTheme.gridColor),
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.floorGridMesh = new THREE.Mesh(floorGeo, this.floorGridMat);
    this.floorGridMesh.rotation.x = -Math.PI / 2;
    this.floorGridMesh.position.set(0, -7.8, -65);
    this.group.add(this.floorGridMesh);

    // Dual-layer Glowing Cyber Trench Rails
    this.railMat = new THREE.MeshBasicMaterial({
      color: initialTheme.wireHex,
      transparent: true,
      opacity: 0.72,
    });
    this.floorConduitMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(initialTheme.gridColor),
      transparent: true,
      opacity: 0.78,
    });
    for (const xPos of [-13.5, 13.5]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 320), this.railMat);
      rail.position.set(xPos, -7.66, -65);
      this.group.add(rail);
      this.floorRailMeshes.push(rail);

      const outerConduit = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 320), this.floorConduitMat);
      outerConduit.position.set(xPos + Math.sign(xPos) * 0.75, -7.52, -65);
      this.group.add(outerConduit);
      this.floorRailMeshes.push(outerConduit);
    }

    // ─── Mode 1: Normal Cyberpunk Trench Structures ──────────────────────────────
    this.structureSolidMat = new THREE.MeshStandardMaterial({
      map: this.wallTexture,
      color: initialTheme.cliffColorHex,
      emissive: initialTheme.cliffEmissiveHex,
      emissiveIntensity: 0.85,
      roughness: 0.52,
      metalness: 0.42,
      transparent: true,
      opacity: 1,
    });
    this.structureWireMat = new THREE.LineBasicMaterial({
      color: initialTheme.wireHex,
      transparent: true,
      opacity: 0.85,
    });
    this.structureNeonMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(initialTheme.gridColor),
      transparent: true,
      opacity: 0.78,
    });

    for (let i = 0; i < this.blockPairs; i++) {
      const z = 66 - i * this.blockSpacing;
      const cluster = this.createCanyonPair(
        this.structureSolidMat,
        this.structureWireMat,
        this.structureNeonMat,
        i
      );
      cluster.position.z = z;
      this.structureGroup.add(cluster);
      this.canyonBlocks.push({ mesh: cluster, z });
    }
    this.group.add(this.structureGroup);

    // ─── Mode 2: Towering Cyberpunk Megacity Skyscrapers ─────────────────────────
    this.cityBuildingMat = new THREE.MeshStandardMaterial({
      map: this.cityFacadeTexture,
      emissiveMap: this.cityFacadeTexture,
      color: initialTheme.cliffColorHex,
      emissive: new THREE.Color(initialTheme.gridColor),
      emissiveIntensity: 0.92,
      roughness: 0.42,
      metalness: 0.62,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.cityWireMat = new THREE.LineBasicMaterial({
      color: initialTheme.wireHex,
      transparent: true,
      opacity: 0,
    });
    this.cityNeonMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(initialTheme.gridColor),
      transparent: true,
      opacity: 0,
    });

    for (let i = 0; i < this.blockPairs; i++) {
      const z = 66 - i * this.blockSpacing;
      const cluster = this.createCityPair(this.cityBuildingMat, this.cityWireMat, this.cityNeonMat, i);
      cluster.position.z = z;
      this.cityGroup.add(cluster);
      this.cityBlocks.push({ mesh: cluster, z });
    }
    this.cityGroup.visible = false;
    this.group.add(this.cityGroup);

    // ─── Mode 3: Animated 3D Cyber-Waves & Flanking Crest Ridges ─────────────────
    this.waveGeo = new THREE.PlaneGeometry(76, 290, 34, 48);
    this.waveSurfaceMat = new THREE.MeshStandardMaterial({
      color: initialTheme.cliffColorHex,
      emissive: initialTheme.cliffEmissiveHex,
      emissiveIntensity: 0.72,
      roughness: 0.24,
      metalness: 0.68,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const waveSurfaceMesh = new THREE.Mesh(this.waveGeo, this.waveSurfaceMat);
    waveSurfaceMesh.rotation.x = -Math.PI / 2;
    waveSurfaceMesh.position.set(0, -8.35, -62);
    this.waveGroup.add(waveSurfaceMesh);

    this.waveWireMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(initialTheme.gridColor),
      wireframe: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const waveWireMesh = new THREE.Mesh(this.waveGeo, this.waveWireMat);
    waveWireMesh.rotation.x = -Math.PI / 2;
    waveWireMesh.position.set(0, -8.28, -62);
    this.waveGroup.add(waveWireMesh);

    this.waveCrestSolidMat = new THREE.MeshStandardMaterial({
      color: initialTheme.cliffColorHex,
      emissive: initialTheme.cliffEmissiveHex,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.6,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.waveCrestWireMat = new THREE.LineBasicMaterial({
      color: initialTheme.wireHex,
      transparent: true,
      opacity: 0,
    });
    this.waveCrestNeonMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(initialTheme.gridColor),
      transparent: true,
      opacity: 0,
    });

    for (let i = 0; i < this.blockPairs; i++) {
      const z = 66 - i * this.blockSpacing;
      const cluster = this.createWaveCrestPair(
        this.waveCrestSolidMat,
        this.waveCrestWireMat,
        this.waveCrestNeonMat,
        i
      );
      cluster.position.z = z;
      this.waveGroup.add(cluster);
      this.waveCrestBlocks.push({ mesh: cluster, z });
    }
    this.waveGroup.visible = false;
    this.group.add(this.waveGroup);

    // ─── Hyper-Tunnel Arches ─────────────────────────────────────────────────────
    this.tunnelArchMat = new THREE.MeshBasicMaterial({
      color: initialTheme.wireHex,
      transparent: true,
      opacity: 0,
      wireframe: true,
    });
    const archGeo = new THREE.TorusGeometry(16.8, 0.28, 4, 22, Math.PI);
    for (let i = 0; i < this.blockPairs; i++) {
      const arch = new THREE.Mesh(archGeo, this.tunnelArchMat);
      arch.position.set(0, -1.5, 64 - i * this.blockSpacing);
      this.group.add(arch);
      this.tunnelArches.push(arch);
    }

    // Build all 15 Celestial Skyscapes
    this.celestialGroups = {
      emerald_trench: this.buildEmeraldCelestials(),
      neon_megacity: this.buildNeonMegacityCelestials(),
      cobalt_tunnel: this.buildCobaltCelestials(),
      cryo_prism: this.buildCryoPrismCelestials(),
      biolum_abyss: this.buildBiolumAbyssCelestials(),
      crimson_magma: this.buildCrimsonCelestials(),
      hyperion_foundry: this.buildHyperionFoundryCelestials(),
      quantum_grid: this.buildQuantumGridCelestials(),
      synthwave_horizon: this.buildSynthwaveHorizonCelestials(),
      violet_void: this.buildVioletGalaxyCelestials(),
      astral_helix: this.buildAstralHelixCelestials(),
      solar_corona: this.buildSolarCoronaCelestials(),
      singularity_horizon: this.buildSingularityCelestials(),
      obsidian_citadel: this.buildObsidianBinaryCelestials(),
      zenith_omega: this.buildZenithOmegaCelestials(),
    };

    this.celestialMaterials = {} as Record<ArenaThemeId, CelestialMaterialEntry[]>;
    this.celestialAlphas = {} as Record<ArenaThemeId, number>;

    (Object.keys(this.celestialGroups) as ArenaThemeId[]).forEach((key) => {
      const g = this.celestialGroups[key];
      const entries: CelestialMaterialEntry[] = [];
      g.traverse((obj) => {
        const mat = (obj as THREE.Mesh).material as
          | (THREE.Material & { opacity: number; transparent: boolean })
          | undefined;
        if (mat && typeof mat.opacity === 'number') {
          const baseOpacity = mat.opacity;
          mat.transparent = true;
          entries.push({ mat, baseOpacity });
        }
      });
      this.celestialMaterials[key] = entries;
      const isInitial = key === this.targetThemeId;
      this.celestialAlphas[key] = isInitial ? 1 : 0;
      g.visible = isInitial;
      if (!isInitial) {
        for (const e of entries) e.mat.opacity = 0;
      }
      this.group.add(g);
    });

    // Full-360° Deep-Space Starfield (includes deep abyss stars below the ship for 'void' mode)
    const starCount = 1450;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const color = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      if (i < 1100) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 20 + Math.random() * 88;
        starPos[i * 3] = Math.cos(angle) * radius;
        starPos[i * 3 + 1] = Math.sin(angle) * radius * 0.78 + 4;
      } else {
        // Dedicated under-ship abyss stars visible when floor fades into cosmic void
        starPos[i * 3] = (Math.random() - 0.5) * 140;
        starPos[i * 3 + 1] = -11 - Math.random() * 54;
      }
      starPos[i * 3 + 2] = -Math.random() * 270 + 80;

      const tint = Math.random();
      if (tint < 0.55) color.setHex(0xe0f2fe);
      else if (tint < 0.78) color.setHex(0x6ee7b7);
      else if (tint < 0.9) color.setHex(0xf0abfc);
      else color.setHex(0xfde047);

      starCol[i * 3] = color.r;
      starCol[i * 3 + 1] = color.g;
      starCol[i * 3 + 2] = color.b;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.48,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      sizeAttenuation: true,
    });
    this.stars = new THREE.Points(starGeo, starMat);
    this.group.add(this.stars);
  }

  private createPlanetTexture(baseHex: string, bandHex1: string, bandHex2: string): THREE.CanvasTexture {
    const w = 512;
    const h = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < h; y += 6) {
      const wave = Math.sin(y * 0.08) * 0.5 + 0.5;
      ctx.fillStyle = wave > 0.5 ? bandHex1 : bandHex2;
      ctx.globalAlpha = 0.25 + wave * 0.35;
      ctx.fillRect(0, y, w, 4 + (y % 5));
    }

    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = i % 2 === 0 ? bandHex1 : '#ffffff';
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * w,
        Math.random() * h,
        12 + Math.random() * 38,
        4 + Math.random() * 10,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.maxAniso;
    return tex;
  }

  private createGlowSprite(hexColor: string, size: number, opacity = 0.75): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.28, hexColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(size, size, 1);
    return sprite;
  }

  private buildEmeraldCelestials(): THREE.Group {
    const g = new THREE.Group();

    const planetTex = this.createPlanetTexture('#064e3b', '#10b981', '#34d399');
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(24, 32, 24),
      new THREE.MeshStandardMaterial({
        map: planetTex,
        roughness: 0.75,
        metalness: 0.05,
        emissive: 0x052e23,
        emissiveIntensity: 0.45,
        fog: false,
      })
    );
    planet.position.set(-28, 24, -145);
    g.add(planet);
    this.animatedBodies.push({ obj: planet, speedY: 0.04 });

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(30, 44, 64),
      new THREE.MeshBasicMaterial({
        color: 0x6ee7b7,
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide,
        fog: false,
      })
    );
    ring.position.copy(planet.position);
    ring.rotation.x = Math.PI * 0.42;
    ring.rotation.y = 0.25;
    g.add(ring);

    const moonTex = this.createPlanetTexture('#475569', '#94a3b8', '#cbd5e1');
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(7.5, 24, 18),
      new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.85, fog: false })
    );
    moon.position.set(34, 29, -128);
    g.add(moon);
    this.animatedBodies.push({ obj: moon, speedY: 0.08 });

    return g;
  }

  private buildNeonMegacityCelestials(): THREE.Group {
    const g = new THREE.Group();

    // Giant Orbital Halo Megastation
    const orbitalHalo = new THREE.Mesh(
      new THREE.TorusGeometry(42, 1.35, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xff2e93, transparent: true, opacity: 0.72, fog: false })
    );
    orbitalHalo.position.set(0, 26, -150);
    orbitalHalo.rotation.x = 1.25;
    orbitalHalo.rotation.y = 0.22;
    g.add(orbitalHalo);
    this.animatedBodies.push({ obj: orbitalHalo, speedY: 0.06, speedZ: 0.14 });

    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(28, 0.75, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.8, fog: false })
    );
    innerRing.position.copy(orbitalHalo.position);
    innerRing.rotation.x = 0.85;
    g.add(innerRing);
    this.animatedBodies.push({ obj: innerRing, speedY: -0.1, speedZ: 0.08 });

    // Distant Holographic Cyber-Skyline Silhouettes
    const towerMat = new THREE.MeshBasicMaterial({ color: 0x16092e, transparent: true, opacity: 0.92, fog: false });
    const beaconPink = new THREE.MeshBasicMaterial({ color: 0xff2e93, transparent: true, opacity: 0.85, fog: false });
    const beaconCyan = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85, fog: false });

    for (let i = -5; i <= 5; i++) {
      const h = 24 + ((Math.abs(i) * 11 + 7) % 28);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(6.5, h, 6.5), towerMat);
      tower.position.set(i * 11, -8 + h * 0.5, -138 - (Math.abs(i) % 2) * 14);
      g.add(tower);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.7, 6.8), i % 2 === 0 ? beaconPink : beaconCyan);
      cap.position.set(tower.position.x, tower.position.y + h * 0.5, tower.position.z);
      g.add(cap);
    }

    const skyGlow = this.createGlowSprite('#ff2e93', 105, 0.55);
    skyGlow.position.set(0, 22, -155);
    g.add(skyGlow);

    return g;
  }

  private buildCobaltCelestials(): THREE.Group {
    const g = new THREE.Group();

    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(20, 28, 24),
      new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 1, fog: false })
    );
    sun.position.set(0, 26, -152);
    g.add(sun);

    const corona = this.createGlowSprite('#38bdf8', 95, 0.85);
    corona.position.copy(sun.position);
    g.add(corona);

    const iceTex = this.createPlanetTexture('#0c4a6e', '#0284c7', '#7dd3fc');
    const icePlanet = new THREE.Mesh(
      new THREE.SphereGeometry(12, 24, 18),
      new THREE.MeshStandardMaterial({ map: iceTex, roughness: 0.65, emissive: 0x075985, emissiveIntensity: 0.35, fog: false })
    );
    icePlanet.position.set(-40, 18, -125);
    g.add(icePlanet);
    this.animatedBodies.push({ obj: icePlanet, speedY: 0.06 });

    return g;
  }

  private buildCryoPrismCelestials(): THREE.Group {
    const g = new THREE.Group();

    // Pale Cyan Frozen Planet + Aurora Halo
    const cryoTex = this.createPlanetTexture('#083344', '#06b6d4', '#cffafe');
    const cryoPlanet = new THREE.Mesh(
      new THREE.SphereGeometry(21, 30, 22),
      new THREE.MeshStandardMaterial({
        map: cryoTex,
        roughness: 0.35,
        metalness: 0.25,
        emissive: 0x084c61,
        emissiveIntensity: 0.4,
        fog: false,
      })
    );
    cryoPlanet.position.set(28, 25, -142);
    g.add(cryoPlanet);
    this.animatedBodies.push({ obj: cryoPlanet, speedY: 0.05 });

    // Floating Crystalline Ice Octahedron Monoliths
    const prismMat = new THREE.MeshBasicMaterial({
      color: 0xa5f3fc,
      wireframe: true,
      transparent: true,
      opacity: 0.72,
      fog: false,
    });
    const monolithPositions: [number, number, number, number][] = [
      [-36, 22, -118, 6.5],
      [-16, 33, -135, 4.2],
      [44, 14, -112, 5.2],
    ];
    for (const [px, py, pz, r] of monolithPositions) {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(r, 0), prismMat);
      crystal.scale.set(0.75, 1.85, 0.75);
      crystal.position.set(px, py, pz);
      g.add(crystal);
      this.animatedBodies.push({ obj: crystal, speedY: 0.22, speedZ: 0.06 });
    }

    const aurora = this.createGlowSprite('#67e8f9', 105, 0.65);
    aurora.position.set(-14, 30, -155);
    g.add(aurora);

    return g;
  }

  private buildCrimsonCelestials(): THREE.Group {
    const g = new THREE.Group();

    const redSun = new THREE.Mesh(
      new THREE.SphereGeometry(28, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0xff5522, transparent: true, opacity: 1, fog: false })
    );
    redSun.position.set(16, 20, -155);
    g.add(redSun);

    const sunGlow = this.createGlowSprite('#ff3b00', 110, 0.85);
    sunGlow.position.copy(redSun.position);
    g.add(sunGlow);

    const lavaTex = this.createPlanetTexture('#1c0907', '#7f1d1d', '#f97316');
    const darkMoon = new THREE.Mesh(
      new THREE.SphereGeometry(17, 26, 20),
      new THREE.MeshStandardMaterial({
        map: lavaTex,
        roughness: 0.8,
        emissive: 0x7c2d12,
        emissiveIntensity: 0.5,
        fog: false,
      })
    );
    darkMoon.position.set(8, 22, -130);
    g.add(darkMoon);
    this.animatedBodies.push({ obj: darkMoon, speedY: 0.05 });

    return g;
  }

  private buildQuantumGridCelestials(): THREE.Group {
    const g = new THREE.Group();

    // Giant Nested Rotating Cyber-Tesseract Cube
    const outerCube = new THREE.Mesh(
      new THREE.BoxGeometry(28, 28, 28),
      new THREE.MeshBasicMaterial({
        color: 0x2dd4bf,
        wireframe: true,
        transparent: true,
        opacity: 0.62,
        fog: false,
      })
    );
    outerCube.position.set(0, 24, -140);
    g.add(outerCube);
    this.animatedBodies.push({ obj: outerCube, speedX: 0.12, speedY: 0.18, speedZ: 0.08 });

    const innerCube = new THREE.Mesh(
      new THREE.BoxGeometry(16, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xa3e635,
        wireframe: true,
        transparent: true,
        opacity: 0.82,
        fog: false,
      })
    );
    innerCube.position.copy(outerCube.position);
    g.add(innerCube);
    this.animatedBodies.push({ obj: innerCube, speedX: -0.18, speedY: -0.22, speedZ: 0.14 });

    const pulsarGlow = this.createGlowSprite('#2dd4bf', 85, 0.78);
    pulsarGlow.position.copy(outerCube.position);
    g.add(pulsarGlow);

    return g;
  }

  private buildVioletGalaxyCelestials(): THREE.Group {
    const g = new THREE.Group();

    const count = 1800;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cCore = new THREE.Color(0xfdf4ff);
    const cArm1 = new THREE.Color(0xe879f9);
    const cArm2 = new THREE.Color(0x6366f1);

    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 0.75) * 62;
      const arm = i % 3;
      const angle = (arm * Math.PI * 2) / 3 + r * 0.14 + (Math.random() - 0.5) * 0.6;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4.5 * (1 - r / 70);
      pos[i * 3 + 2] = Math.sin(angle) * r;

      const mix = r / 62;
      const chosen = mix < 0.2 ? cCore : arm % 2 === 0 ? cArm1 : cArm2;
      col[i * 3] = chosen.r;
      col[i * 3 + 1] = chosen.g;
      col[i * 3 + 2] = chosen.b;
    }

    const galGeo = new THREE.BufferGeometry();
    galGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    galGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const galaxy = new THREE.Points(
      galGeo,
      new THREE.PointsMaterial({
        size: 0.85,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
    galaxy.position.set(0, 28, -148);
    galaxy.rotation.x = 0.65;
    galaxy.rotation.z = -0.22;
    g.add(galaxy);
    this.animatedBodies.push({ obj: galaxy, speedY: 0.08 });

    const coreGlow = this.createGlowSprite('#d946ef', 55, 0.72);
    coreGlow.position.copy(galaxy.position);
    g.add(coreGlow);

    const mTex = this.createPlanetTexture('#3b0764', '#9333ea', '#f0abfc');
    const moon1 = new THREE.Mesh(
      new THREE.SphereGeometry(9, 24, 18),
      new THREE.MeshStandardMaterial({ map: mTex, roughness: 0.7, emissive: 0x581c87, emissiveIntensity: 0.4, fog: false })
    );
    moon1.position.set(-42, 16, -120);
    g.add(moon1);
    this.animatedBodies.push({ obj: moon1, speedY: 0.09 });

    return g;
  }

  private buildSolarCoronaCelestials(): THREE.Group {
    const g = new THREE.Group();

    const flareStar = new THREE.Mesh(
      new THREE.SphereGeometry(24, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0xfef9c3, transparent: true, opacity: 1, fog: false })
    );
    flareStar.position.set(-14, 24, -152);
    g.add(flareStar);

    const glow = this.createGlowSprite('#fb923c', 125, 0.88);
    glow.position.copy(flareStar.position);
    g.add(glow);

    // Dual Orbiting Dyson Collector Rings around the star
    const cRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(34, 0.65, 6, 48),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.78, fog: false })
    );
    cRing1.position.copy(flareStar.position);
    cRing1.rotation.x = 1.1;
    g.add(cRing1);
    this.animatedBodies.push({ obj: cRing1, speedY: 0.12, speedZ: 0.1 });

    const cRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(40, 0.45, 6, 48),
      new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.65, fog: false })
    );
    cRing2.position.copy(flareStar.position);
    cRing2.rotation.y = 0.75;
    g.add(cRing2);
    this.animatedBodies.push({ obj: cRing2, speedY: -0.14, speedZ: 0.08 });

    return g;
  }

  private buildSingularityCelestials(): THREE.Group {
    const g = new THREE.Group();

    // Supermassive Black Hole Core + Swirling Accretion Disk
    const eventHorizon = new THREE.Mesh(
      new THREE.SphereGeometry(16, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0x020104, transparent: true, opacity: 1, fog: false })
    );
    eventHorizon.position.set(0, 24, -146);
    g.add(eventHorizon);

    const photonRing = new THREE.Mesh(
      new THREE.TorusGeometry(17.5, 0.85, 10, 64),
      new THREE.MeshBasicMaterial({ color: 0xfb7185, transparent: true, opacity: 0.92, fog: false })
    );
    photonRing.position.copy(eventHorizon.position);
    g.add(photonRing);

    const accretionDisk = new THREE.Mesh(
      new THREE.RingGeometry(21, 46, 64),
      new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.56,
        side: THREE.DoubleSide,
        fog: false,
      })
    );
    accretionDisk.position.copy(eventHorizon.position);
    accretionDisk.rotation.x = Math.PI * 0.44;
    accretionDisk.rotation.y = 0.18;
    g.add(accretionDisk);
    this.animatedBodies.push({ obj: accretionDisk, speedY: 0.04, speedZ: 0.25 });

    const outerLensing = this.createGlowSprite('#f43f5e', 110, 0.72);
    outerLensing.position.copy(eventHorizon.position);
    g.add(outerLensing);

    return g;
  }

  private buildObsidianBinaryCelestials(): THREE.Group {
    const g = new THREE.Group();

    for (const [sx, sy, rad] of [
      [-26, 30, 14],
      [28, 22, 10],
    ]) {
      const sun = new THREE.Mesh(
        new THREE.SphereGeometry(rad, 24, 20),
        new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 1, fog: false })
      );
      sun.position.set(sx, sy, -155);
      g.add(sun);

      const glow = this.createGlowSprite('#fbbf24', rad * 4.2, 0.82);
      glow.position.copy(sun.position);
      g.add(glow);
    }

    const dysonTex = this.createPlanetTexture('#1c1917', '#78350f', '#f59e0b');
    const dyson = new THREE.Mesh(
      new THREE.SphereGeometry(19, 28, 22),
      new THREE.MeshStandardMaterial({ map: dysonTex, roughness: 0.45, metalness: 0.6, fog: false })
    );
    dyson.position.set(0, 21, -135);
    g.add(dyson);
    this.animatedBodies.push({ obj: dyson, speedY: 0.05 });

    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(26, 0.55, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.92, fog: false })
    );
    ring1.position.copy(dyson.position);
    ring1.rotation.x = 1.1;
    g.add(ring1);
    this.animatedBodies.push({ obj: ring1, speedY: 0.14, speedZ: 0.08 });

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(29, 0.4, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.75, fog: false })
    );
    ring2.position.copy(dyson.position);
    ring2.rotation.y = 0.8;
    g.add(ring2);
    this.animatedBodies.push({ obj: ring2, speedY: -0.1, speedZ: 0.12 });

    return g;
  }

  private buildBiolumAbyssCelestials(): THREE.Group {
    const g = new THREE.Group();

    const abyssTex = this.createPlanetTexture('#042f2e', '#0d9488', '#5eead4');
    const abyssOrb = new THREE.Mesh(
      new THREE.SphereGeometry(22, 28, 22),
      new THREE.MeshStandardMaterial({
        map: abyssTex,
        roughness: 0.45,
        emissive: 0x0f766e,
        emissiveIntensity: 0.35,
        fog: false,
      })
    );
    abyssOrb.position.set(-24, 24, -148);
    g.add(abyssOrb);
    this.animatedBodies.push({ obj: abyssOrb, speedY: 0.05 });

    // Bioluminescent Jellyfish-like Orbital Energy Rings
    for (let r = 0; r < 3; r++) {
      const bioRing = new THREE.Mesh(
        new THREE.TorusGeometry(26 + r * 5.5, 0.38, 8, 48),
        new THREE.MeshBasicMaterial({
          color: r % 2 === 0 ? 0x2dd4bf : 0x38bdf8,
          transparent: true,
          opacity: 0.65 - r * 0.12,
          fog: false,
        })
      );
      bioRing.position.copy(abyssOrb.position);
      bioRing.rotation.x = 1.2 + r * 0.28;
      bioRing.rotation.y = r * 0.4;
      g.add(bioRing);
      this.animatedBodies.push({ obj: bioRing, speedY: (r % 2 === 0 ? 1 : -1) * 0.12, speedZ: 0.08 });
    }

    const sporeGlow = this.createGlowSprite('#2dd4bf', 100, 0.65);
    sporeGlow.position.set(18, 20, -140);
    g.add(sporeGlow);

    return g;
  }

  private buildHyperionFoundryCelestials(): THREE.Group {
    const g = new THREE.Group();

    const forgeCore = new THREE.Mesh(
      new THREE.SphereGeometry(19, 28, 22),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.96, fog: false })
    );
    forgeCore.position.set(0, 24, -150);
    g.add(forgeCore);

    const forgeGlow = this.createGlowSprite('#f59e0b', 110, 0.8);
    forgeGlow.position.copy(forgeCore.position);
    g.add(forgeGlow);

    // Massive Industrial Orbital Gantry Rings
    const gantry1 = new THREE.Mesh(
      new THREE.TorusGeometry(32, 1.4, 6, 36),
      new THREE.MeshBasicMaterial({ color: 0x451a03, transparent: true, opacity: 0.9, fog: false })
    );
    gantry1.position.copy(forgeCore.position);
    gantry1.rotation.x = 1.05;
    g.add(gantry1);
    this.animatedBodies.push({ obj: gantry1, speedY: 0.08, speedZ: 0.07 });

    const gantryTrim = new THREE.Mesh(
      new THREE.TorusGeometry(33.5, 0.35, 6, 36),
      new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.85, fog: false })
    );
    gantryTrim.position.copy(forgeCore.position);
    gantryTrim.rotation.x = 1.05;
    g.add(gantryTrim);
    this.animatedBodies.push({ obj: gantryTrim, speedY: 0.08, speedZ: 0.07 });

    const gantry2 = new THREE.Mesh(
      new THREE.TorusGeometry(25, 0.8, 6, 24),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true, transparent: true, opacity: 0.6, fog: false })
    );
    gantry2.position.copy(forgeCore.position);
    gantry2.rotation.y = 0.75;
    g.add(gantry2);
    this.animatedBodies.push({ obj: gantry2, speedX: 0.06, speedY: -0.14 });

    return g;
  }

  private buildSynthwaveHorizonCelestials(): THREE.Group {
    const g = new THREE.Group();

    // Classic Retro Synthwave Horizon Sun + Horizontal Scan Bands
    const synthSun = new THREE.Mesh(
      new THREE.CircleGeometry(30, 48),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.92, fog: false })
    );
    synthSun.position.set(0, 18, -158);
    g.add(synthSun);

    const innerSun = new THREE.Mesh(
      new THREE.CircleGeometry(22, 48),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.88, fog: false })
    );
    innerSun.position.set(0, 20, -157);
    g.add(innerSun);

    // Horizon Scan Cutout Bars across lower half of Synthwave Sun
    const barMat = new THREE.MeshBasicMaterial({ color: 0x130318, transparent: true, opacity: 0.96, fog: false });
    for (let b = 0; b < 5; b++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(64, 1.2 + b * 0.35, 0.5), barMat);
      bar.position.set(0, 4 + b * 3.8, -156);
      g.add(bar);
    }

    // Floating Neon Synthwave Pyramid Monoliths
    const pyMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
      fog: false,
    });
    for (const [px, py, pz, s] of [
      [-38, 12, -125, 8],
      [38, 14, -128, 9],
    ]) {
      const pyMesh = new THREE.Mesh(new THREE.ConeGeometry(s, s * 1.4, 4), pyMat);
      pyMesh.position.set(px, py, pz);
      g.add(pyMesh);
      this.animatedBodies.push({ obj: pyMesh, speedY: 0.16 });
    }

    const synthGlow = this.createGlowSprite('#f472b6', 120, 0.72);
    synthGlow.position.set(0, 20, -160);
    g.add(synthGlow);

    return g;
  }

  private buildAstralHelixCelestials(): THREE.Group {
    const g = new THREE.Group();

    const pulsar = new THREE.Mesh(
      new THREE.OctahedronGeometry(12, 1),
      new THREE.MeshBasicMaterial({ color: 0xfef3c7, transparent: true, opacity: 0.96, fog: false })
    );
    pulsar.position.set(0, 26, -150);
    g.add(pulsar);
    this.animatedBodies.push({ obj: pulsar, speedY: 0.25, speedZ: 0.14 });

    // Cosmic Helix Energy Rings spiraling outward
    for (let i = 0; i < 6; i++) {
      const helixRing = new THREE.Mesh(
        new THREE.TorusGeometry(16 + i * 3.5, 0.32, 6, 36),
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0x818cf8 : 0xfbbf24,
          transparent: true,
          opacity: 0.75 - i * 0.08,
          fog: false,
        })
      );
      helixRing.position.set(Math.sin(i * 0.9) * 8, 25 + Math.cos(i * 0.9) * 5, -148 + i * 4);
      helixRing.rotation.x = 0.7 + i * 0.22;
      helixRing.rotation.y = i * 0.35;
      g.add(helixRing);
      this.animatedBodies.push({ obj: helixRing, speedX: 0.05, speedY: (i % 2 === 0 ? 1 : -1) * 0.18 });
    }

    const helixGlow = this.createGlowSprite('#818cf8', 110, 0.78);
    helixGlow.position.copy(pulsar.position);
    g.add(helixGlow);

    return g;
  }

  private buildZenithOmegaCelestials(): THREE.Group {
    const g = new THREE.Group();

    // Final Sector White-Dwarf Nexus Core & Concentric Warp Stargates
    const whiteStar = new THREE.Mesh(
      new THREE.SphereGeometry(20, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 1, fog: false })
    );
    whiteStar.position.set(0, 25, -155);
    g.add(whiteStar);

    const starGlow = this.createGlowSprite('#67e8f9', 135, 0.9);
    starGlow.position.copy(whiteStar.position);
    g.add(starGlow);

    const gateConfigs: [number, number, number, number][] = [
      [30, 0.65, 0x67e8f9, 0.18],
      [38, 0.5, 0xe2e8f0, -0.14],
      [46, 0.45, 0xfbbf24, 0.1],
    ];
    for (let i = 0; i < gateConfigs.length; i++) {
      const [radius, tube, color, spd] = gateConfigs[i];
      const gate = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 8, 64),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, fog: false })
      );
      gate.position.copy(whiteStar.position);
      gate.rotation.x = 0.95 + i * 0.35;
      gate.rotation.y = i * 0.5;
      g.add(gate);
      this.animatedBodies.push({ obj: gate, speedX: spd * 0.5, speedY: spd, speedZ: -spd * 0.6 });
    }

    return g;
  }

  public setTheme(themeId: ArenaThemeId): void {
    this.targetThemeId = themeId;
  }

  private createGridMaskTexture(
    lineWidth: number,
    subDiv: number,
    transparentBg: boolean
  ): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    if (transparentBg) {
      ctx.clearRect(0, 0, size, size);
    } else {
      ctx.fillStyle = '#0c111a';
      ctx.fillRect(0, 0, size, size);
    }

    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = transparentBg ? 0.28 : 0.2;
    ctx.lineWidth = 1.5;
    const step = size / subDiv;
    for (let i = 1; i < subDiv; i++) {
      const p = i * step;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }

    // Cyber circuit node dots at grid intersections
    if (transparentBg) {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.55;
      ctx.fillRect(0, 0, 7, 7);
    }

    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  private createCityFacadeTexture(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, size, size);

    // Subtle structural panel seams
    ctx.strokeStyle = '#182235';
    ctx.lineWidth = 2;
    for (let y = 0; y < size; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Lit cyberpunk skyscraper window grids (white/grayscale so emissive tint colors them cleanly)
    const cols = 8;
    const rows = 16;
    const cellW = size / cols;
    const cellH = size / rows;
    for (let r = 0; r < rows; r++) {
      // Occasional bright full-floor neon skyband
      const isBand = r === 4 || r === 11;
      for (let c = 0; c < cols; c++) {
        const hash = (r * 37 + c * 17 + 13) % 11;
        if (!isBand && hash < 4) continue;
        const brightness = isBand ? 0.95 : hash > 8 ? 0.9 : 0.48 + (hash % 4) * 0.12;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = brightness;
        ctx.fillRect(c * cellW + 5, r * cellH + 4, cellW - 10, cellH - 8);
      }
    }

    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  private createCanyonPair(
    solidMat: THREE.Material,
    wireMat: THREE.LineBasicMaterial,
    neonStripMat: THREE.MeshBasicMaterial,
    seed: number
  ): THREE.Group {
    const pair = new THREE.Group();

    for (const side of [-1, 1]) {
      const h1 = 6 + ((seed * 7 + (side > 0 ? 3 : 1)) % 7);
      const w1 = 8 + ((seed * 3) % 4);
      const geo1 = new THREE.BoxGeometry(w1, h1, this.blockSpacing - 0.8);
      const block1 = new THREE.Mesh(geo1, solidMat);
      block1.position.set(side * (16.5 + w1 * 0.5), -7.8 + h1 * 0.5, 0);
      pair.add(block1);

      const edges1 = new THREE.LineSegments(new THREE.EdgesGeometry(geo1), wireMat);
      edges1.position.copy(block1.position);
      pair.add(edges1);

      // Glowing Cyberpunk Neon Rim Strip along canyon ledge
      const ledgeStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.22, this.blockSpacing - 2.2),
        neonStripMat
      );
      ledgeStrip.position.set(side * 16.45, -7.8 + h1 - 0.45, 0);
      pair.add(ledgeStrip);

      if ((seed + (side > 0 ? 1 : 0)) % 2 === 0) {
        const h2 = 13 + ((seed * 5) % 9);
        const geo2 = new THREE.BoxGeometry(6.5, h2, 8.5);
        const spire = new THREE.Mesh(geo2, solidMat);
        spire.position.set(side * 25.5, -7.8 + h2 * 0.5, -2);
        pair.add(spire);

        const edges2 = new THREE.LineSegments(new THREE.EdgesGeometry(geo2), wireMat);
        edges2.position.copy(spire.position);
        pair.add(edges2);

        // Glowing Cyberpunk Megastructure Window / Data Bands
        for (let b = 0; b < 2; b++) {
          const band = new THREE.Mesh(new THREE.BoxGeometry(6.62, 0.28, 8.62), neonStripMat);
          band.position.set(spire.position.x, -7.8 + h2 * (0.55 + b * 0.26), -2);
          pair.add(band);
        }

        // Tall Beacon Antenna Mast
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 4.2, 6), solidMat);
        mast.position.set(spire.position.x, -7.8 + h2 + 2.1, -2);
        pair.add(mast);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), neonStripMat);
        beacon.position.set(spire.position.x, -7.8 + h2 + 4.3, -2);
        pair.add(beacon);
      }
    }

    return pair;
  }

  private createCityPair(
    buildingMat: THREE.Material,
    wireMat: THREE.LineBasicMaterial,
    neonMat: THREE.MeshBasicMaterial,
    seed: number
  ): THREE.Group {
    const pair = new THREE.Group();

    for (const side of [-1, 1]) {
      const sideBias = side > 0 ? 5 : 2;

      // Elevated Cyber Skyway Highway Deck along city flank
      const deck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.4, this.blockSpacing - 0.6), buildingMat);
      deck.position.set(side * 16.2, -7.1, 0);
      pair.add(deck);

      const deckRail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, this.blockSpacing - 1.2), neonMat);
      deckRail.position.set(side * 14.15, -6.25, 0);
      pair.add(deckRail);

      // Foreground Stepped Cyberpunk Skyscraper
      const w1 = 5.4 + ((seed * 3 + sideBias) % 3) * 0.9;
      const d1 = 7.6 + ((seed * 5 + sideBias) % 4) * 1.1;
      const h1 = 14 + ((seed * 7 + sideBias * 3) % 13);
      const x1 = side * (17.2 + w1 * 0.5);
      const geo1 = new THREE.BoxGeometry(w1, h1, d1);
      const tower1 = new THREE.Mesh(geo1, buildingMat);
      tower1.position.set(x1, -7.8 + h1 * 0.5, ((seed % 3) - 1) * 1.6);
      pair.add(tower1);

      const edges1 = new THREE.LineSegments(new THREE.EdgesGeometry(geo1), wireMat);
      edges1.position.copy(tower1.position);
      pair.add(edges1);

      // Vertical Neon Corner Light Strip facing the flight trench
      const vStrip = new THREE.Mesh(new THREE.BoxGeometry(0.22, h1 - 1.2, 0.24), neonMat);
      vStrip.position.set(
        x1 - side * (w1 * 0.5 + 0.04),
        -7.8 + h1 * 0.5,
        tower1.position.z + d1 * 0.42
      );
      pair.add(vStrip);

      // Horizontal Hologram Crown / Billboard Rim
      const crownTrim = new THREE.Mesh(new THREE.BoxGeometry(w1 + 0.24, 0.36, d1 + 0.24), neonMat);
      crownTrim.position.set(x1, -7.8 + h1 - 0.4, tower1.position.z);
      pair.add(crownTrim);

      // Stepped Upper Penthouse Tier + Spire
      const hTop = 4.2 + ((seed * 3 + sideBias) % 5);
      const topGeo = new THREE.BoxGeometry(w1 * 0.66, hTop, d1 * 0.66);
      const topTier = new THREE.Mesh(topGeo, buildingMat);
      topTier.position.set(x1, -7.8 + h1 + hTop * 0.5, tower1.position.z);
      pair.add(topTier);

      const topEdges = new THREE.LineSegments(new THREE.EdgesGeometry(topGeo), wireMat);
      topEdges.position.copy(topTier.position);
      pair.add(topEdges);

      if ((seed + (side > 0 ? 1 : 0)) % 2 === 0) {
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, 5.4, 6), buildingMat);
        spire.position.set(x1, -7.8 + h1 + hTop + 2.7, tower1.position.z);
        pair.add(spire);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 8), neonMat);
        beacon.position.set(x1, -7.8 + h1 + hTop + 5.5, tower1.position.z);
        pair.add(beacon);
      }

      // Secondary Deep Skyline Megatower behind foreground tower
      const w2 = 7.2 + ((seed + sideBias) % 3);
      const d2 = 9.5 + ((seed * 2) % 4);
      const h2 = 22 + ((seed * 11 + sideBias * 5) % 16);
      const x2 = side * (26.5 + w2 * 0.5);
      const geo2 = new THREE.BoxGeometry(w2, h2, d2);
      const bgTower = new THREE.Mesh(geo2, buildingMat);
      bgTower.position.set(x2, -7.8 + h2 * 0.5, -3.5 + (seed % 2) * 5);
      pair.add(bgTower);

      const bgEdges = new THREE.LineSegments(new THREE.EdgesGeometry(geo2), wireMat);
      bgEdges.position.copy(bgTower.position);
      pair.add(bgEdges);

      const skyBand = new THREE.Mesh(new THREE.BoxGeometry(w2 + 0.25, 0.45, d2 + 0.25), neonMat);
      skyBand.position.set(x2, -7.8 + h2 * 0.72, bgTower.position.z);
      pair.add(skyBand);
    }

    return pair;
  }

  private createWaveCrestPair(
    solidMat: THREE.Material,
    wireMat: THREE.LineBasicMaterial,
    neonMat: THREE.MeshBasicMaterial,
    seed: number
  ): THREE.Group {
    const pair = new THREE.Group();

    for (const side of [-1, 1]) {
      const bias = side > 0 ? 3 : 1;
      // Swept Prism Wave-Crest Fin curling slightly inward above the outer sea
      const h1 = 7.5 + ((seed * 5 + bias * 2) % 6);
      const crestGeo = new THREE.ConeGeometry(4.8, h1, 4);
      const crest = new THREE.Mesh(crestGeo, solidMat);
      crest.scale.set(0.85, 1, 1.85);
      crest.position.set(side * 18.5, -6.5 + h1 * 0.35, 0);
      crest.rotation.z = side * 0.36;
      crest.rotation.y = Math.PI * 0.25;
      pair.add(crest);

      const edges1 = new THREE.LineSegments(new THREE.EdgesGeometry(crestGeo), wireMat);
      edges1.scale.copy(crest.scale);
      edges1.position.copy(crest.position);
      edges1.rotation.copy(crest.rotation);
      pair.add(edges1);

      // Glowing Energy Foam / Surge Crest Spine along the wave peak
      const foam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, this.blockSpacing * 0.78), neonMat);
      foam.position.set(side * (16.4 + (seed % 2) * 0.8), -3.8 + ((seed * 3 + bias) % 3) * 0.9, 0);
      foam.rotation.x = side * 0.08;
      pair.add(foam);

      // Secondary Outer Swell Ridge
      if ((seed + bias) % 2 === 0) {
        const h2 = 11 + ((seed * 7 + bias) % 7);
        const swellGeo = new THREE.ConeGeometry(6.2, h2, 4);
        const swell = new THREE.Mesh(swellGeo, solidMat);
        swell.scale.set(0.95, 1, 2.0);
        swell.position.set(side * 27.5, -6.5 + h2 * 0.38, -2.5);
        swell.rotation.z = side * 0.28;
        swell.rotation.y = Math.PI * 0.25;
        pair.add(swell);

        const edges2 = new THREE.LineSegments(new THREE.EdgesGeometry(swellGeo), wireMat);
        edges2.scale.copy(swell.scale);
        edges2.position.copy(swell.position);
        edges2.rotation.copy(swell.rotation);
        pair.add(edges2);
      }
    }

    return pair;
  }

  public update(dt: number, scrollSpeed: number, themeId: ArenaThemeId, bossActive = false): void {
    this.setTheme(themeId);
    const theme = ARENA_THEMES[this.targetThemeId];
    const mode = theme.structureMode;
    const colorLerp = 1 - Math.exp(-2.4 * dt);

    // Smoothly ramp boss battle atmosphere transition (0 = sector patrol, 1 = dreadnought battle)
    this.bossBlend = THREE.MathUtils.damp(this.bossBlend, bossActive ? 1 : 0, 1.85, dt);
    if (this.bossBlend < 0.002 && !bossActive) this.bossBlend = 0;

    // Smoothly interpolate all palette colors, fog & lighting between arenas and boss encounters
    _c1.setHex(theme.bgHex).lerp(_bossBgTint, this.bossBlend * 0.52);
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.lerp(_c1, colorLerp);
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.lerp(_c1, colorLerp);
      const targetFog = theme.fogDensity * (1 + this.bossBlend * 0.22);
      this.scene.fog.density = THREE.MathUtils.damp(this.scene.fog.density, targetFog, 2.2, dt);
    }

    _c1.set(theme.floorBgColor).lerp(_bossBgTint, this.bossBlend * 0.42);
    this.floorBaseMat.color.lerp(_c1, colorLerp);

    _c1.set(theme.gridColor).lerp(_bossStripTint, this.bossBlend * 0.32);
    this.floorGridMat.color.lerp(_c1, colorLerp);
    this.floorConduitMat.color.lerp(_c1, colorLerp);
    this.structureNeonMat.color.lerp(_c1, colorLerp);
    this.cityNeonMat.color.lerp(_c1, colorLerp);
    this.waveWireMat.color.lerp(_c1, colorLerp);
    this.waveCrestNeonMat.color.lerp(_c1, colorLerp);

    _c2.setHex(theme.wireHex).lerp(_bossWireTint, this.bossBlend * 0.48);
    this.railMat.color.lerp(_c2, colorLerp);
    this.structureWireMat.color.lerp(_c2, colorLerp);
    this.cityWireMat.color.lerp(_c2, colorLerp);
    this.waveCrestWireMat.color.lerp(_c2, colorLerp);
    this.tunnelArchMat.color.lerp(_c2, colorLerp);

    _c1.setHex(theme.cliffColorHex);
    this.structureSolidMat.color.lerp(_c1, colorLerp);
    this.cityBuildingMat.color.lerp(_c1, colorLerp);
    this.waveSurfaceMat.color.lerp(_c1, colorLerp);
    this.waveCrestSolidMat.color.lerp(_c1, colorLerp);

    _c2.setHex(theme.cliffEmissiveHex).lerp(_bossBgTint, this.bossBlend * 0.45);
    this.structureSolidMat.emissive.lerp(_c2, colorLerp);
    this.waveSurfaceMat.emissive.lerp(_c2, colorLerp);
    this.waveCrestSolidMat.emissive.lerp(_c2, colorLerp);

    // City windows glow brightly in the active arena's neon accent color
    _c3.set(theme.gridColor).lerp(_bossStripTint, this.bossBlend * 0.38);
    this.cityBuildingMat.emissive.lerp(_c3, colorLerp);

    // ─── Smooth Cross-Fades Between Structure / City / Waves / Void ──────────────
    const targetFloor = mode === 'structure' || mode === 'city' ? 1 : 0;
    const targetStructure = mode === 'structure' ? 1 : 0;
    const targetCity = mode === 'city' ? 1 : 0;
    const targetWave = mode === 'waves' ? 1 : 0;

    this.floorAlpha = THREE.MathUtils.damp(this.floorAlpha, targetFloor, 1.85, dt);
    this.structureAlpha = THREE.MathUtils.damp(this.structureAlpha, targetStructure, 1.85, dt);
    this.cityAlpha = THREE.MathUtils.damp(this.cityAlpha, targetCity, 1.85, dt);
    this.waveAlpha = THREE.MathUtils.damp(this.waveAlpha, targetWave, 1.85, dt);

    if (this.floorAlpha < 0.005) this.floorAlpha = 0;
    else if (this.floorAlpha > 0.995) this.floorAlpha = 1;
    if (this.structureAlpha < 0.005) this.structureAlpha = 0;
    else if (this.structureAlpha > 0.995) this.structureAlpha = 1;
    if (this.cityAlpha < 0.005) this.cityAlpha = 0;
    else if (this.cityAlpha > 0.995) this.cityAlpha = 1;
    if (this.waveAlpha < 0.005) this.waveAlpha = 0;
    else if (this.waveAlpha > 0.995) this.waveAlpha = 1;

    // Apply Floor & Rail Visibility / Fade
    const floorVisible = this.floorAlpha > 0.008;
    this.floorBaseMesh.visible = floorVisible;
    this.floorGridMesh.visible = floorVisible;
    for (let i = 0; i < this.floorRailMeshes.length; i++) {
      this.floorRailMeshes[i].visible = floorVisible;
    }
    this.floorBaseMat.opacity = this.floorAlpha;
    this.floorBaseMat.depthWrite = this.floorAlpha > 0.95;
    this.floorGridMat.opacity = 0.92 * this.floorAlpha;
    this.railMat.opacity = 0.72 * this.floorAlpha;
    this.floorConduitMat.opacity = 0.78 * this.floorAlpha;

    // Apply Mode 1: Normal Canyon Structure
    this.structureGroup.visible = this.structureAlpha > 0.008;
    if (this.structureGroup.visible) {
      this.structureGroup.position.y = (1 - this.structureAlpha) * -18;
      this.structureSolidMat.opacity = this.structureAlpha;
      this.structureSolidMat.depthWrite = this.structureAlpha > 0.95;
      this.structureWireMat.opacity = 0.85 * this.structureAlpha;
      this.structureNeonMat.opacity = 0.78 * this.structureAlpha;
    }

    // Apply Mode 2: Megacity Skyscrapers
    this.cityGroup.visible = this.cityAlpha > 0.008;
    if (this.cityGroup.visible) {
      this.cityGroup.position.y = (1 - this.cityAlpha) * -24;
      this.cityBuildingMat.opacity = this.cityAlpha;
      this.cityBuildingMat.depthWrite = this.cityAlpha > 0.95;
      this.cityWireMat.opacity = 0.72 * this.cityAlpha;
      this.cityNeonMat.opacity = 0.88 * this.cityAlpha;
    }

    // Apply Mode 3: Animated 3D Cyber-Waves + Crest Ridges
    this.waveGroup.visible = this.waveAlpha > 0.008;
    this.wavePhase += scrollSpeed * dt * 0.145;
    if (this.waveGroup.visible) {
      this.waveGroup.position.y = (1 - this.waveAlpha) * -14;
      this.waveSurfaceMat.opacity = 0.88 * this.waveAlpha;
      this.waveSurfaceMat.depthWrite = this.waveAlpha > 0.95;
      this.waveWireMat.opacity = 0.74 * this.waveAlpha;
      this.waveCrestSolidMat.opacity = 0.94 * this.waveAlpha;
      this.waveCrestSolidMat.depthWrite = this.waveAlpha > 0.95;
      this.waveCrestWireMat.opacity = 0.85 * this.waveAlpha;
      this.waveCrestNeonMat.opacity = 0.88 * this.waveAlpha;

      // Deform wave terrain vertices smoothly (calmer trough under flight lane, surging swells on sides)
      const wavePos = this.waveGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < wavePos.count; i++) {
        const vx = wavePos.getX(i);
        const vy = wavePos.getY(i);
        const absX = Math.abs(vx);
        const flank = absX <= 8.5 ? 0 : absX >= 26.5 ? 1 : (absX - 8.5) / 18;
        const centerWave =
          0.62 * Math.sin(vx * 0.24 + this.wavePhase * 0.55) +
          0.72 * Math.cos(vy * 0.13 + this.wavePhase);
        const flankWave =
          flank *
          (2.55 * Math.sin(vy * 0.11 + this.wavePhase * 0.95 + absX * 0.09) +
            1.4 * Math.cos(vx * 0.32 - this.wavePhase * 0.7));
        wavePos.setZ(i, centerWave + flankWave + flank * 1.35);
      }
      wavePos.needsUpdate = true;
      this.waveGeo.computeVertexNormals();
    }

    // Smooth cross-fade & horizon slide across Celestial Skyscapes
    (Object.keys(this.celestialGroups) as ArenaThemeId[]).forEach((key) => {
      const targetAlpha = key === this.targetThemeId ? 1 : 0;
      const prevAlpha = this.celestialAlphas[key];
      const nextAlpha = THREE.MathUtils.damp(prevAlpha, targetAlpha, 2.1, dt);
      const clampedAlpha = nextAlpha < 0.005 ? 0 : nextAlpha > 0.995 ? 1 : nextAlpha;
      this.celestialAlphas[key] = clampedAlpha;

      const group = this.celestialGroups[key];
      if (clampedAlpha <= 0) {
        group.visible = false;
      } else {
        group.visible = true;
        group.position.y = (1 - clampedAlpha) * -18;
        const entries = this.celestialMaterials[key];
        for (let i = 0; i < entries.length; i++) {
          entries[i].mat.opacity = entries[i].baseOpacity * clampedAlpha;
        }
      }
    });

    // Rotate planets, moons, suns, Dyson rings, tesseract & spiral galaxy (accelerates smoothly during boss fights)
    const celestialSpeedMult = 1 + this.bossBlend * 1.15;
    for (const item of this.animatedBodies) {
      if (item.speedX) item.obj.rotation.x += item.speedX * celestialSpeedMult * dt;
      item.obj.rotation.y += item.speedY * celestialSpeedMult * dt;
      if (item.speedZ) item.obj.rotation.z += item.speedZ * celestialSpeedMult * dt;
    }

    this.floorGridTexture.offset.y -= scrollSpeed * dt * 0.165;

    const wrapLimit = 76;
    const totalDepth = this.blockPairs * this.blockSpacing;
    for (const block of this.canyonBlocks) {
      block.z += scrollSpeed * dt;
      if (block.z > wrapLimit) block.z -= totalDepth;
      block.mesh.position.z = block.z;
    }

    for (const block of this.cityBlocks) {
      block.z += scrollSpeed * dt;
      if (block.z > wrapLimit) block.z -= totalDepth;
      block.mesh.position.z = block.z;
    }

    for (const block of this.waveCrestBlocks) {
      block.z += scrollSpeed * dt;
      if (block.z > wrapLimit) block.z -= totalDepth;
      block.mesh.position.z = block.z;
      block.mesh.position.y = Math.sin(block.z * 0.09 + this.wavePhase) * 1.05;
    }

    const baseTunnelOpacity = theme.hasTunnel ? 0.52 : mode === 'void' ? 0.0 : 0.0;
    const targetTunnelOpacity = Math.min(0.66, baseTunnelOpacity + this.bossBlend * (mode === 'void' ? 0.08 : 0.16));
    this.tunnelOpacity = THREE.MathUtils.damp(this.tunnelOpacity, targetTunnelOpacity, 2.2, dt);
    this.tunnelArchMat.opacity = this.tunnelOpacity;

    for (const arch of this.tunnelArches) {
      arch.position.z += scrollSpeed * dt;
      if (arch.position.z > wrapLimit) {
        arch.position.z -= totalDepth;
      }
      arch.visible = this.tunnelOpacity > 0.02;
    }

    const posAttr = this.stars.geometry.attributes.position as THREE.BufferAttribute;
    const starSpeed = scrollSpeed * (0.72 + this.bossBlend * 0.25);
    for (let i = 0; i < posAttr.count; i++) {
      let z = posAttr.getZ(i) + starSpeed * dt;
      if (z > 80) {
        z -= 270;
      }
      posAttr.setZ(i, z);
    }
    posAttr.needsUpdate = true;
  }

  public dispose(): void {
    this.floorGridTexture.dispose();
    this.wallTexture.dispose();
    this.cityFacadeTexture.dispose();
    this.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh || (obj as THREE.LineSegments).isLineSegments || (obj as THREE.Points).isPoints) {
        const renderable = obj as THREE.Mesh;
        renderable.geometry?.dispose();
        if (Array.isArray(renderable.material)) {
          renderable.material.forEach((m) => m.dispose());
        } else {
          renderable.material?.dispose();
        }
      }
    });
  }
}
