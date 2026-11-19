import * as THREE from 'three';
import { ARENA_THEMES, type ArenaThemeId } from './types';

interface CanyonBlock {
  mesh: THREE.Group;
  z: number;
}

/**
 * Multi-Arena 3D Environment featuring distinct celestial backdrops
 * (Ringed Gas Giants, Moons, Hypergiant Suns, Eclipses, and 3D Spiral Galaxies)
 * across the 5 cosmic sectors.
 */
export class CyberTrenchEnvironment {
  public readonly group = new THREE.Group();
  private scene: THREE.Scene;
  private maxAniso: number;
  private floorTexture: THREE.CanvasTexture;
  private wallTexture: THREE.CanvasTexture;
  private floorMesh: THREE.Mesh;
  private railMat: THREE.MeshBasicMaterial;
  private solidFillMat: THREE.MeshStandardMaterial;
  private edgeWireMat: THREE.LineBasicMaterial;
  private canyonBlocks: CanyonBlock[] = [];
  private tunnelArches: THREE.Mesh[] = [];
  private tunnelArchMat: THREE.MeshBasicMaterial;
  private stars: THREE.Points;
  private tunnelOpacity = 0;
  private currentThemeId: ArenaThemeId = 'emerald_trench';

  // Celestial Skyscape Groups per Arena
  private celestialGroups: Record<ArenaThemeId, THREE.Group>;
  private animatedBodies: Array<{ obj: THREE.Object3D; speedY: number; speedZ?: number }> = [];

  private readonly blockSpacing = 18;
  private readonly blockPairs = 12;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.scene = scene;
    this.maxAniso = renderer.capabilities.getMaxAnisotropy();

    const initialTheme = ARENA_THEMES[this.currentThemeId];
    this.floorTexture = this.createGridTexture(initialTheme.gridColor, initialTheme.floorBgColor, 4, 4);
    this.floorTexture.repeat.set(16, 40);
    this.floorTexture.anisotropy = this.maxAniso;

    this.wallTexture = this.createGridTexture(initialTheme.gridColor, initialTheme.floorBgColor, 2, 2);
    this.wallTexture.repeat.set(2, 2);
    this.wallTexture.anisotropy = this.maxAniso;

    const floorGeo = new THREE.PlaneGeometry(54, 240);
    const floorMat = new THREE.MeshBasicMaterial({
      map: this.floorTexture,
      transparent: false,
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.set(0, -7.8, -95);
    this.group.add(this.floorMesh);

    this.railMat = new THREE.MeshBasicMaterial({
      color: initialTheme.wireHex,
      transparent: true,
      opacity: 0.55,
    });
    for (const xPos of [-13.5, 13.5]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 240), this.railMat);
      rail.position.set(xPos, -7.68, -95);
      this.group.add(rail);
    }

    this.solidFillMat = new THREE.MeshStandardMaterial({
      map: this.wallTexture,
      color: initialTheme.cliffColorHex,
      emissive: initialTheme.cliffEmissiveHex,
      emissiveIntensity: 0.75,
      roughness: 0.6,
      metalness: 0.35,
    });
    this.edgeWireMat = new THREE.LineBasicMaterial({
      color: initialTheme.wireHex,
      transparent: true,
      opacity: 0.85,
    });

    for (let i = 0; i < this.blockPairs; i++) {
      const z = 12 - i * this.blockSpacing;
      const cluster = this.createCanyonPair(this.solidFillMat, this.edgeWireMat, i);
      cluster.position.z = z;
      this.group.add(cluster);
      this.canyonBlocks.push({ mesh: cluster, z });
    }

    this.tunnelArchMat = new THREE.MeshBasicMaterial({
      color: initialTheme.wireHex,
      transparent: true,
      opacity: 0,
      wireframe: true,
    });
    const archGeo = new THREE.TorusGeometry(16.5, 0.25, 4, 20, Math.PI);
    for (let i = 0; i < 12; i++) {
      const arch = new THREE.Mesh(archGeo, this.tunnelArchMat);
      arch.position.set(0, -1.5, 10 - i * 18);
      this.group.add(arch);
      this.tunnelArches.push(arch);
    }

    // Build Dramatic Celestial Skyscapes (Planets, Ringed Giants, Moons, Suns, Spiral Galaxies)
    this.celestialGroups = {
      emerald_trench: this.buildEmeraldCelestials(),
      cobalt_tunnel: this.buildCobaltCelestials(),
      crimson_magma: this.buildCrimsonCelestials(),
      violet_void: this.buildVioletGalaxyCelestials(),
      obsidian_citadel: this.buildObsidianBinaryCelestials(),
    };

    (Object.keys(this.celestialGroups) as ArenaThemeId[]).forEach((key) => {
      const g = this.celestialGroups[key];
      g.visible = key === this.currentThemeId;
      this.group.add(g);
    });

    // Deep-space starfield
    const starCount = 1000;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const color = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 82;
      starPos[i * 3] = Math.cos(angle) * radius;
      starPos[i * 3 + 1] = Math.sin(angle) * radius * 0.72 + 14;
      starPos[i * 3 + 2] = -Math.random() * 210 + 10;

      const tint = Math.random();
      if (tint < 0.6) color.setHex(0xe0f2fe);
      else if (tint < 0.8) color.setHex(0x6ee7b7);
      else color.setHex(0xf0abfc);

      starCol[i * 3] = color.r;
      starCol[i * 3 + 1] = color.g;
      starCol[i * 3 + 2] = color.b;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.45,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
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

    // Ringed Emerald Gas Giant Planet
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

    // Tilted Planetary Rings
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

    // Silver-Ice Moon on opposite side
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

  private buildCobaltCelestials(): THREE.Group {
    const g = new THREE.Group();

    // Blazing Blue Hypergiant Sun + Corona Halo
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(20, 28, 24),
      new THREE.MeshBasicMaterial({ color: 0xe0f2fe, fog: false })
    );
    sun.position.set(0, 26, -152);
    g.add(sun);

    const corona = this.createGlowSprite('#38bdf8', 95, 0.85);
    corona.position.copy(sun.position);
    g.add(corona);

    // Orbiting Ice Planet
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

  private buildCrimsonCelestials(): THREE.Group {
    const g = new THREE.Group();

    // Colossal Crimson Red Giant Sun
    const redSun = new THREE.Mesh(
      new THREE.SphereGeometry(28, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0xff5522, fog: false })
    );
    redSun.position.set(16, 20, -155);
    g.add(redSun);

    const sunGlow = this.createGlowSprite('#ff3b00', 110, 0.85);
    sunGlow.position.copy(redSun.position);
    g.add(sunGlow);

    // Eclipsing Volcanic Magma Moon
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

  private buildVioletGalaxyCelestials(): THREE.Group {
    const g = new THREE.Group();

    // Rotating 3D Spiral Galaxy (1,800 stars in spiral arms)
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

    // Twin Magenta Moons
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

  private buildObsidianBinaryCelestials(): THREE.Group {
    const g = new THREE.Group();

    // Binary Golden Suns
    for (const [sx, sy, rad] of [
      [-26, 30, 14],
      [28, 22, 10],
    ]) {
      const sun = new THREE.Mesh(
        new THREE.SphereGeometry(rad, 24, 20),
        new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false })
      );
      sun.position.set(sx, sy, -155);
      g.add(sun);

      const glow = this.createGlowSprite('#fbbf24', rad * 4.2, 0.82);
      glow.position.copy(sun.position);
      g.add(glow);
    }

    // Armored Cyber-Dyson Planet with Dual Intersecting Rings
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
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, fog: false })
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

  public setTheme(themeId: ArenaThemeId): void {
    if (this.currentThemeId === themeId) return;
    this.currentThemeId = themeId;
    const theme = ARENA_THEMES[themeId];

    // Switch active celestial skyscape group
    (Object.keys(this.celestialGroups) as ArenaThemeId[]).forEach((key) => {
      this.celestialGroups[key].visible = key === themeId;
    });

    const oldFloor = this.floorTexture;
    const oldWall = this.wallTexture;

    this.floorTexture = this.createGridTexture(theme.gridColor, theme.floorBgColor, 4, 4);
    this.floorTexture.repeat.set(16, 40);
    this.floorTexture.anisotropy = this.maxAniso;
    (this.floorMesh.material as THREE.MeshBasicMaterial).map = this.floorTexture;
    (this.floorMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;

    this.wallTexture = this.createGridTexture(theme.gridColor, theme.floorBgColor, 2, 2);
    this.wallTexture.repeat.set(2, 2);
    this.wallTexture.anisotropy = this.maxAniso;
    this.solidFillMat.map = this.wallTexture;
    this.solidFillMat.color.setHex(theme.cliffColorHex);
    this.solidFillMat.emissive.setHex(theme.cliffEmissiveHex);
    this.solidFillMat.needsUpdate = true;

    oldFloor.dispose();
    oldWall.dispose();

    this.railMat.color.setHex(theme.wireHex);
    this.edgeWireMat.color.setHex(theme.wireHex);
    this.tunnelArchMat.color.setHex(theme.wireHex);

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.setHex(theme.bgHex);
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(theme.bgHex);
      this.scene.fog.density = theme.fogDensity;
    }
  }

  private createGridTexture(
    lineColor: string,
    bgColor: string,
    lineWidth: number,
    subDiv: number
  ): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = lineColor;
    ctx.globalAlpha = 0.22;
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

    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(0, 0, size, size);

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

      if ((seed + (side > 0 ? 1 : 0)) % 2 === 0) {
        const h2 = 12 + ((seed * 5) % 8);
        const geo2 = new THREE.BoxGeometry(6.5, h2, 8.5);
        const spire = new THREE.Mesh(geo2, solidMat);
        spire.position.set(side * 25.5, -7.8 + h2 * 0.5, -2);
        pair.add(spire);

        const edges2 = new THREE.LineSegments(new THREE.EdgesGeometry(geo2), wireMat);
        edges2.position.copy(spire.position);
        pair.add(edges2);
      }
    }

    return pair;
  }

  public update(dt: number, scrollSpeed: number, themeId: ArenaThemeId): void {
    this.setTheme(themeId);
    const theme = ARENA_THEMES[themeId];

    // Rotate planets, moons, suns, Dyson rings & spiral galaxy
    for (const item of this.animatedBodies) {
      item.obj.rotation.y += item.speedY * dt;
      if (item.speedZ) item.obj.rotation.z += item.speedZ * dt;
    }

    this.floorTexture.offset.y -= scrollSpeed * dt * 0.165;

    const wrapLimit = 22;
    const totalDepth = this.blockPairs * this.blockSpacing;
    for (const block of this.canyonBlocks) {
      block.z += scrollSpeed * dt;
      if (block.z > wrapLimit) {
        block.z -= totalDepth;
      }
      block.mesh.position.z = block.z;
    }

    const targetTunnelOpacity = theme.hasTunnel ? 0.52 : theme.openSpace ? 0.06 : 0.0;
    this.tunnelOpacity = THREE.MathUtils.damp(this.tunnelOpacity, targetTunnelOpacity, 2.5, dt);
    this.tunnelArchMat.opacity = this.tunnelOpacity;

    for (const arch of this.tunnelArches) {
      arch.position.z += scrollSpeed * dt;
      if (arch.position.z > wrapLimit) {
        arch.position.z -= totalDepth;
      }
      arch.visible = this.tunnelOpacity > 0.02;
    }

    const targetCanyonY = theme.openSpace ? -7.2 : 0;
    for (const block of this.canyonBlocks) {
      block.mesh.position.y = THREE.MathUtils.damp(block.mesh.position.y, targetCanyonY, 2.0, dt);
    }

    const posAttr = this.stars.geometry.attributes.position as THREE.BufferAttribute;
    const starSpeed = scrollSpeed * 0.72;
    for (let i = 0; i < posAttr.count; i++) {
      let z = posAttr.getZ(i) + starSpeed * dt;
      if (z > 15) {
        z -= 220;
      }
      posAttr.setZ(i, z);
    }
    posAttr.needsUpdate = true;
  }

  public dispose(): void {
    this.floorTexture.dispose();
    this.wallTexture.dispose();
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
