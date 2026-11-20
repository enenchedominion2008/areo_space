import * as THREE from 'three';
import { JETS, type BombKind, type EnemyKind, type FragmentKind, type JetId } from './types';

export interface PlayerShipRig {
  group: THREE.Group;
  leftCannon: THREE.Group;
  rightCannon: THREE.Group;
  leftFlame: THREE.Mesh;
  rightFlame: THREE.Mesh;
  leftAfterburnerTrail: THREE.Mesh;
  rightAfterburnerTrail: THREE.Mesh;
  ramProw: THREE.Mesh;
  shieldBubble: THREE.Mesh;
  leftMuzzle: THREE.Mesh;
  rightMuzzle: THREE.Mesh;
  accentRing?: THREE.Mesh;
}

export interface EnemyRig {
  group: THREE.Group;
  hitMeshes: THREE.Mesh[];
  coreMesh: THREE.Mesh;
  telegraphHalo: THREE.Mesh;
  baseEmissives: THREE.Color[];
  baseEmissiveIntensities: number[];
}

function createDeltaWingShape(span: number, length: number, sweep: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, length * 0.55);
  shape.lineTo(span * 0.32, length * 0.12);
  shape.lineTo(span, -length * sweep);
  shape.lineTo(span * 0.85, -length * 0.52);
  shape.lineTo(span * 0.25, -length * 0.38);
  shape.lineTo(0, -length * 0.48);
  shape.lineTo(-span * 0.25, -length * 0.38);
  shape.lineTo(-span * 0.85, -length * 0.52);
  shape.lineTo(-span, -length * sweep);
  shape.lineTo(-span * 0.32, length * 0.12);
  shape.closePath();
  return shape;
}

export function createPlayerShip(jetId: JetId = 'vanguard'): PlayerShipRig {
  const group = new THREE.Group();
  const spec = JETS[jetId];

  const hullColorMap: Record<JetId, number> = {
    vanguard: 0x26293a,
    phantom: 0x162235,
    valkyrie: 0x3b1722,
    chrono: 0xdbeafe,
    cyber_kitsune: 0x1a1426,
    ronin_x: 0x181c18,
    netrunner: 0x0f172a,
    shogun_mk9: 0x141210,
  };

  const hullMat = new THREE.MeshStandardMaterial({
    color: hullColorMap[jetId],
    metalness: jetId === 'chrono' ? 0.65 : 0.88,
    roughness: jetId === 'chrono' ? 0.22 : 0.26,
  });

  const darkFrameMat = new THREE.MeshStandardMaterial({
    color: 0x0d0f17,
    metalness: 0.35,
    roughness: 0.68,
  });

  const trimSteelMat = new THREE.MeshStandardMaterial({
    color: jetId === 'valkyrie' || jetId === 'shogun_mk9' ? 0xfbbf24 : 0x64748b,
    metalness: 0.9,
    roughness: 0.22,
  });

  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b0f1c,
    metalness: 0.15,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    emissive: spec.accentHex,
    emissiveIntensity: 0.42,
  });

  const neonAccentMat = new THREE.MeshStandardMaterial({
    color: spec.accentHex,
    emissive: spec.accentHex,
    emissiveIntensity: 2.4,
    roughness: 0.2,
    metalness: 0.1,
  });

  const greenLaserAccentMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x22ff66,
    emissiveIntensity: 2.2,
    roughness: 0.2,
    metalness: 0.1,
  });

  // 1. Jet-specific primary wing silhouette
  const wingSpan =
    jetId === 'phantom'
      ? 2.65
      : jetId === 'cyber_kitsune'
      ? 2.5
      : jetId === 'shogun_mk9'
      ? 2.75
      : jetId === 'valkyrie'
      ? 2.45
      : 2.35;
  const wingSweep =
    jetId === 'phantom' || jetId === 'cyber_kitsune'
      ? -0.22
      : jetId === 'valkyrie' || jetId === 'shogun_mk9'
      ? 0.45
      : 0.36;

  if (jetId === 'netrunner') {
    // Cyberpunk X-Wing 4-blade splayed pincer silhouette
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.12, 0.78), hullMat);
        blade.position.set(sx * 1.15, sy * 0.42, 0.2);
        blade.rotation.z = sx * sy * 0.36;
        blade.rotation.y = sx * 0.25;
        group.add(blade);

        const edgeStrip = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.05, 0.1), neonAccentMat);
        edgeStrip.position.set(sx * 1.15, sy * 0.46, -0.15);
        edgeStrip.rotation.z = sx * sy * 0.36;
        edgeStrip.rotation.y = sx * 0.25;
        group.add(edgeStrip);
      }
    }
  } else {
    const wingShape = createDeltaWingShape(wingSpan, 3.0, wingSweep);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: jetId === 'valkyrie' || jetId === 'shogun_mk9' ? 0.3 : 0.22,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.06,
      bevelSegments: 2,
    });
    wingGeo.rotateX(Math.PI / 2);
    wingGeo.center();
    const wingMesh = new THREE.Mesh(wingGeo, hullMat);
    wingMesh.position.set(0, 0, 0.15);
    group.add(wingMesh);
  }

  // 2. Central spine fuselage
  const spineGeo = new THREE.BoxGeometry(jetId === 'valkyrie' || jetId === 'shogun_mk9' ? 1.25 : 0.88, 0.44, 2.95);
  const spineMesh = new THREE.Mesh(spineGeo, trimSteelMat);
  spineMesh.position.set(0, 0.12, -0.1);
  group.add(spineMesh);

  // 3. Nose cone & Cyberpunk Fore-Prongs
  if (jetId === 'phantom' || jetId === 'cyber_kitsune') {
    for (const side of [-1, 1]) {
      const spear = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.58, 5), hullMat);
      spear.rotation.x = -Math.PI / 2;
      spear.position.set(side * 0.36, 0.06, -2.15);
      group.add(spear);

      const bladeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 1.35), neonAccentMat);
      bladeGlow.position.set(side * 0.36, 0.18, -2.0);
      group.add(bladeGlow);
    }
  } else {
    const noseGeo = new THREE.ConeGeometry(0.42, 1.38, 6);
    noseGeo.rotateX(-Math.PI / 2);
    const noseMesh = new THREE.Mesh(noseGeo, hullMat);
    noseMesh.position.set(0, 0.08, -2.05);
    group.add(noseMesh);
  }

  // 4. Glossy cockpit canopy
  const canopyGeo = new THREE.SphereGeometry(0.42, 20, 14);
  canopyGeo.scale(0.88, 0.68, 2.05);
  const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
  canopyMesh.position.set(0, 0.38, -0.45);
  group.add(canopyMesh);

  // 5. Jet-specific Cyberpunk Silhouettes & Halo Rings
  let accentRing: THREE.Mesh | undefined;
  if (jetId === 'chrono' || jetId === 'netrunner' || jetId === 'cyber_kitsune') {
    const ringGeo =
      jetId === 'netrunner'
        ? new THREE.TorusGeometry(1.45, 0.055, 6, 4)
        : new THREE.TorusGeometry(1.18, 0.06, 10, 28);
    accentRing = new THREE.Mesh(ringGeo, neonAccentMat);
    accentRing.position.set(0, 0.1, 0.55);
    group.add(accentRing);
  }

  if (jetId === 'ronin_x') {
    // Asymmetrical Oversized Starboard Cyberpunk Railgun
    const railPod = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 3.6), darkFrameMat);
    railPod.position.set(1.35, 0.12, -0.55);
    group.add(railPod);
    const railStrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.65), neonAccentMat);
    railStrip.position.set(1.35, 0.34, -0.55);
    group.add(railStrip);
  }

  if (jetId === 'shogun_mk9') {
    // Cyber-Samurai Kabuto Horns & Shoulder Pauldrons
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.15, 4), neonAccentMat);
      horn.position.set(side * 0.45, 0.72, -0.35);
      horn.rotation.z = side * -0.45;
      horn.rotation.x = -0.35;
      group.add(horn);

      const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.35, 1.5), darkFrameMat);
      pauldron.position.set(side * 1.48, 0.24, 0.1);
      pauldron.rotation.z = side * -0.18;
      group.add(pauldron);
    }
  }

  for (const side of [-1, 1]) {
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0.85, -0.35);
    finShape.lineTo(jetId === 'cyber_kitsune' ? 1.25 : 0.95, jetId === 'cyber_kitsune' ? 0.95 : 0.52);
    finShape.lineTo(0.25, 0.62);
    finShape.closePath();

    const finGeo = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 1,
    });
    finGeo.rotateY(Math.PI / 2);
    const fin = new THREE.Mesh(finGeo, darkFrameMat);
    fin.position.set(side * (wingSpan * 0.9), 0.05, 0.55);
    fin.rotation.z = side * (jetId === 'cyber_kitsune' ? -0.36 : -0.22);
    group.add(fin);

    if (jetId === 'valkyrie') {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 1.35), darkFrameMat);
      pod.position.set(side * 1.45, -0.1, 0.15);
      group.add(pod);
    }

    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 1.85), neonAccentMat);
    strip.position.set(side * 1.15, 0.19, 0.25);
    strip.rotation.y = side * (jetId === 'phantom' || jetId === 'cyber_kitsune' ? -0.35 : 0.44);
    group.add(strip);

    const spineNeon = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.45), neonAccentMat);
    spineNeon.position.set(side * 0.35, 0.36, 0.35);
    group.add(spineNeon);
  }

  // 6. Twin dorsal laser cannons
  const buildCannon = (xPos: number): { cannon: THREE.Group; muzzle: THREE.Mesh } => {
    const cannon = new THREE.Group();
    cannon.position.set(xPos, 0.36, -0.25);

    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.72), darkFrameMat);
    cannon.add(mount);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 1.05, 10), trimSteelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.65);
    cannon.add(barrel);

    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.16, 10), greenLaserAccentMat);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(0, 0.03, -1.16);
    cannon.add(tip);

    const muzzleGeo = new THREE.SphereGeometry(0.2, 10, 10);
    const muzzleMat = new THREE.MeshBasicMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzle.position.set(0, 0.03, -1.26);
    cannon.add(muzzle);

    group.add(cannon);
    return { cannon, muzzle };
  };

  const leftC = buildCannon(-0.62);
  const rightC = buildCannon(0.62);

  // 7. Twin aft engine nacelles & thruster flames
  const nozzlePts = [
    new THREE.Vector2(0.2, 0),
    new THREE.Vector2(0.32, 0.18),
    new THREE.Vector2(0.28, 0.55),
    new THREE.Vector2(0.18, 0.65),
  ];
  const nozzleGeo = new THREE.LatheGeometry(nozzlePts, 14);
  nozzleGeo.rotateX(Math.PI / 2);

  const flameGeo = new THREE.ConeGeometry(0.24, 1.75, 12, 1, true);
  flameGeo.rotateX(Math.PI / 2);
  flameGeo.translate(0, 0, 0.85);

  const buildThruster = (xPos: number): THREE.Mesh => {
    const nozzle = new THREE.Mesh(nozzleGeo, darkFrameMat);
    nozzle.position.set(xPos, 0.08, 1.38);
    group.add(nozzle);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 8, 16), neonAccentMat);
    ring.position.set(xPos, 0.08, 1.56);
    group.add(ring);

    const flameMat = new THREE.MeshBasicMaterial({
      color: spec.accentHex,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(xPos, 0.08, 1.52);
    group.add(flame);
    return flame;
  };

  const buildAfterburnerTrail = (xPos: number): THREE.Mesh => {
    const trailGeo = new THREE.ConeGeometry(0.36, 4.8, 12, 1, true);
    trailGeo.rotateX(Math.PI / 2);
    trailGeo.translate(0, 0, 2.4);
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const trail = new THREE.Mesh(trailGeo, trailMat);
    trail.position.set(xPos, 0.08, 1.55);
    trail.visible = false;
    group.add(trail);
    return trail;
  };

  const leftFlame = buildThruster(-0.42);
  const rightFlame = buildThruster(0.42);
  const leftAfterburnerTrail = buildAfterburnerTrail(-0.42);
  const rightAfterburnerTrail = buildAfterburnerTrail(0.42);

  // Ram energy prow cone for Afterburner ram-kills
  const ramGeo = new THREE.ConeGeometry(2.15, 4.6, 16, 1, true);
  ramGeo.rotateX(-Math.PI / 2);
  const ramMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    wireframe: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ramProw = new THREE.Mesh(ramGeo, ramMat);
  ramProw.position.set(0, 0.08, -1.2);
  ramProw.visible = false;
  group.add(ramProw);

  // 8. Shield / Aura Sphere
  const shieldGeo = new THREE.SphereGeometry(2.45, 24, 16);
  shieldGeo.scale(1.1, 0.55, 1.25);
  const shieldMat = new THREE.MeshBasicMaterial({
    color: spec.accentHex,
    transparent: true,
    opacity: 0,
    wireframe: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shieldBubble = new THREE.Mesh(shieldGeo, shieldMat);
  group.add(shieldBubble);

  return {
    group,
    leftCannon: leftC.cannon,
    rightCannon: rightC.cannon,
    leftFlame,
    rightFlame,
    leftAfterburnerTrail,
    rightAfterburnerTrail,
    ramProw,
    shieldBubble,
    leftMuzzle: leftC.muzzle,
    rightMuzzle: rightC.muzzle,
    accentRing,
  };
}

export function createEnemyModel(kind: EnemyKind, levelSeed = 1): EnemyRig {
  const group = new THREE.Group();
  const hitMeshes: THREE.Mesh[] = [];
  const baseEmissives: THREE.Color[] = [];
  const baseEmissiveIntensities: number[] = [];

  const registerHit = (mesh: THREE.Mesh) => {
    const mat = mesh.material as THREE.MeshStandardMaterial;
    hitMeshes.push(mesh);
    baseEmissives.push(mat.emissive.clone());
    baseEmissiveIntensities.push(mat.emissiveIntensity);
  };

  // High-contrast armor palette so enemies pop cleanly against dark space & colored canyons
  const armorHex =
    kind === 'bomber'
      ? 0xe11d48
      : kind === 'gunship'
      ? 0xf97316
      : kind === 'dreadnought' && levelSeed >= 13
      ? 0xf59e0b
      : kind === 'dreadnought'
      ? 0xea580c
      : 0xff8c1a;

  const armorEmissiveHex =
    kind === 'bomber' ? 0x6b0f2b : kind === 'gunship' ? 0x5c2105 : 0x552205;

  const primaryArmorMat = () =>
    new THREE.MeshStandardMaterial({
      color: armorHex,
      metalness: 0.58,
      roughness: 0.28,
      emissive: armorEmissiveHex,
      emissiveIntensity: 0.85,
    });

  // Bright titanium-steel secondary framing for crisp silhouette separation
  const contrastSteelMat = () =>
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.65,
      roughness: 0.3,
      emissive: 0x334155,
      emissiveIntensity: 0.48,
    });

  const edgeAccentHex =
    kind === 'bomber'
      ? 0xfb7185
      : kind === 'gunship'
      ? 0xfbbf24
      : kind === 'dreadnought'
      ? 0xfde047
      : 0xfef08a;

  const edgeNeonMat = () =>
    new THREE.MeshStandardMaterial({
      color: edgeAccentHex,
      emissive: edgeAccentHex,
      emissiveIntensity: 2.1,
      roughness: 0.2,
      metalness: 0.1,
    });

  const coreGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: kind === 'bomber' ? 0xff2e93 : 0xff6a00,
    emissiveIntensity: 2.8,
    roughness: 0.15,
    metalness: 0.1,
  });

  const makeTelegraphHalo = (radius: number, zPos: number): THREE.Mesh => {
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.72, radius, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    halo.position.set(0, 0, zPos);
    halo.visible = false;
    group.add(halo);
    return halo;
  };

  if (kind === 'scout') {
    const wingShape = createDeltaWingShape(1.65, 1.85, -0.25);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 1,
    });
    wingGeo.rotateX(Math.PI / 2);
    wingGeo.center();
    const wings = new THREE.Mesh(wingGeo, primaryArmorMat());
    registerHit(wings);
    group.add(wings);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.45, 2.0), contrastSteelMat());
    body.position.set(0, 0.08, 0);
    registerHit(body);
    group.add(body);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.2, 0.56), coreGlowMat.clone());
    visor.position.set(0, 0.24, 0.7);
    registerHit(visor);
    group.add(visor);

    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.3, 8), primaryArmorMat());
      pod.rotation.x = Math.PI / 2;
      pod.position.set(side * 1.0, -0.02, 0.15);
      registerHit(pod);
      group.add(pod);

      // High-contrast wingtip glow blades
      const tipFin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 1.05), edgeNeonMat());
      tipFin.position.set(side * 1.58, 0.14, -0.15);
      registerHit(tipFin);
      group.add(tipFin);
    }

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), coreGlowMat.clone());
    core.position.set(0, 0.08, 0.98);
    registerHit(core);
    group.add(core);

    const telegraphHalo = makeTelegraphHalo(1.35, 1.1);
    group.scale.setScalar(1.24);
    return { group, hitMeshes, coreMesh: core, telegraphHalo, baseEmissives, baseEmissiveIntensities };
  }

  if (kind === 'bomber') {
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.38, 2.35, 6), primaryArmorMat());
    hull.rotation.x = Math.PI / 2;
    registerHit(hull);
    group.add(hull);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.28, 1.4), contrastSteelMat());
    wing.position.set(0, 0.15, 0);
    registerHit(wing);
    group.add(wing);

    const dorsalSpine = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 2.2), edgeNeonMat());
    dorsalSpine.position.set(0, 0.95, 0);
    registerHit(dorsalSpine);
    group.add(dorsalSpine);

    for (const side of [-1, 1]) {
      const bay = new THREE.Mesh(new THREE.SphereGeometry(0.54, 10, 10), primaryArmorMat());
      bay.position.set(side * 1.62, -0.24, 0.2);
      registerHit(bay);
      group.add(bay);

      const wingBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.44, 1.45), edgeNeonMat());
      wingBeacon.position.set(side * 2.25, 0.15, 0);
      registerHit(wingBeacon);
      group.add(wingBeacon);
    }

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), coreGlowMat.clone());
    core.position.set(0, -0.25, 1.25);
    registerHit(core);
    group.add(core);

    const telegraphHalo = makeTelegraphHalo(1.85, 1.45);
    group.scale.setScalar(1.22);
    return { group, hitMeshes, coreMesh: core, telegraphHalo, baseEmissives, baseEmissiveIntensities };
  }

  if (kind === 'gunship') {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.68, 2.38), primaryArmorMat());
    registerHit(chassis);
    group.add(chassis);

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 1.22), contrastSteelMat());
    bridge.position.set(0, 0.5, -0.2);
    registerHit(bridge);
    group.add(bridge);

    const wingBeam = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.26, 1.0), primaryArmorMat());
    wingBeam.position.set(0, 0, -0.1);
    registerHit(wingBeam);
    group.add(wingBeam);

    const crest = new THREE.Mesh(new THREE.BoxGeometry(3.75, 0.09, 0.16), edgeNeonMat());
    crest.position.set(0, 0.18, 0.35);
    registerHit(crest);
    group.add(crest);

    for (const side of [-1, 1]) {
      const sponson = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.62, 2.65), contrastSteelMat());
      sponson.position.set(side * 1.85, 0, 0.2);
      registerHit(sponson);
      group.add(sponson);

      const cannonTip = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), coreGlowMat.clone());
      cannonTip.position.set(side * 1.85, 0, 1.56);
      registerHit(cannonTip);
      group.add(cannonTip);
    }

    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.38, 14), coreGlowMat.clone());
    core.rotation.x = Math.PI / 2;
    core.position.set(0, 0.08, 1.24);
    registerHit(core);
    group.add(core);

    const telegraphHalo = makeTelegraphHalo(1.75, 1.5);
    group.scale.setScalar(1.2);
    return { group, hitMeshes, coreMesh: core, telegraphHalo, baseEmissives, baseEmissiveIntensities };
  }

  // Dreadnought Boss: distinct multi-deck silhouette with high-contrast titanium superstructure & neon armor edges
  const scaleFactor = 1.12 + Math.min(0.32, (levelSeed - 1) * 0.016);
  const mainHull = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.4, 5.3), primaryArmorMat());
  registerHit(mainHull);
  group.add(mainHull);

  const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 3.3), contrastSteelMat());
  upperDeck.position.set(0, 1.02, -0.5);
  registerHit(upperDeck);
  group.add(upperDeck);

  const commandBridge = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.78, 1.4), primaryArmorMat());
  commandBridge.position.set(0, 1.78, -1.1);
  registerHit(commandBridge);
  group.add(commandBridge);

  const bridgeGlow = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.28, 0.4), edgeNeonMat());
  bridgeGlow.position.set(0, 1.78, -0.32);
  registerHit(bridgeGlow);
  group.add(bridgeGlow);

  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.48, 2.7), primaryArmorMat());
    wing.position.set(side * 3.15, 0.05, 0.1);
    wing.rotation.z = side * -0.1;
    registerHit(wing);
    group.add(wing);

    const wingTrim = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.12, 0.22), edgeNeonMat());
    wingTrim.position.set(side * 3.15, 0.26, 1.38);
    wingTrim.rotation.z = side * -0.1;
    registerHit(wingTrim);
    group.add(wingTrim);

    const battery = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 2.95, 10), contrastSteelMat());
    battery.rotation.x = Math.PI / 2;
    battery.position.set(side * 4.45, -0.1, 0.55);
    registerHit(battery);
    group.add(battery);

    const emitter = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), coreGlowMat.clone());
    emitter.position.set(side * 4.45, -0.1, 2.08);
    registerHit(emitter);
    group.add(emitter);
  }

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.02, 1), coreGlowMat.clone());
  core.position.set(0, 0.05, 2.75);
  registerHit(core);
  group.add(core);

  const telegraphHalo = makeTelegraphHalo(3.2, 3.0);
  group.scale.setScalar(scaleFactor);
  return { group, hitMeshes, coreMesh: core, telegraphHalo, baseEmissives, baseEmissiveIntensities };
}

export function createBombMesh(kind: BombKind): THREE.Group {
  const group = new THREE.Group();
  if (kind === 'cluster') {
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.62, 0),
      new THREE.MeshStandardMaterial({
        color: 0xff2200,
        emissive: 0xff4500,
        emissiveIntensity: 2.2,
        roughness: 0.25,
        metalness: 0.5,
      })
    );
    group.add(core);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.06, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 })
    );
    group.add(halo);
    return group;
  }

  if (kind === 'mine') {
    const body = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.75, 0),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 2.0,
        roughness: 0.3,
        metalness: 0.6,
      })
    );
    group.add(body);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.12, 18),
      new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      })
    );
    group.add(ring);
    return group;
  }

  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1.7, 8),
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xff5500,
      emissiveIntensity: 2.1,
      roughness: 0.25,
      metalness: 0.7,
    })
  );
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const fins = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.1, 0.45),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
  );
  fins.position.set(0, 0, -0.45);
  group.add(fins);
  return group;
}

export function createFragmentMesh(kind: FragmentKind): THREE.Group {
  const group = new THREE.Group();
  const color =
    kind === 'spread'
      ? 0xfbbf24
      : kind === 'stream'
      ? 0x4ade80
      : kind === 'plasma'
      ? 0xe879f9
      : kind === 'seeker'
      ? 0x38bdf8
      : kind === 'shield'
      ? 0x06b6d4
      : 0x22c55e;

  const shardMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 2.4,
    roughness: 0.15,
    metalness: 0.3,
  });

  const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), shardMat);
  shard.scale.set(0.85, 1.35, 0.85);
  group.add(shard);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.98, 0.065, 6, 20),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
  );
  group.add(ring);

  return group;
}

export interface AreaHazardVisuals {
  group: THREE.Group;
  ringMesh: THREE.Mesh;
  innerRingMesh: THREE.Mesh;
  beamMesh: THREE.Mesh;
}

export function createAreaHazardVisuals(radius: number): AreaHazardVisuals {
  const group = new THREE.Group();

  // Target warning ring in the player's plane (z = 0)
  const ringMesh = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.86, radius, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff3b30,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  group.add(ringMesh);

  // Expanding/shrinking inner lock ring showing time-to-impact
  const innerRingMesh = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.45, radius * 0.56, 24),
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  group.add(innerRingMesh);

  // Corridor warning / strike beam stretching down Z
  const beamGeo = new THREE.CylinderGeometry(radius * 0.35, radius * 0.35, 48, 14, 1, true);
  beamGeo.rotateX(Math.PI / 2);
  beamGeo.translate(0, 0, -22);
  const beamMesh = new THREE.Mesh(
    beamGeo,
    new THREE.MeshBasicMaterial({
      color: 0xff4500,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  group.add(beamMesh);

  return { group, ringMesh, innerRingMesh, beamMesh };
}

export function disposeObjectTree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
      obj.geometry?.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else if (mat) {
        mat.dispose();
      }
    }
  });
}
