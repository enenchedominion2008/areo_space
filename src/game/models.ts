import * as THREE from 'three';
import { JETS, type BombKind, type EnemyKind, type FragmentKind, type JetId } from './types';

export interface PlayerShipRig {
  group: THREE.Group;
  leftCannon: THREE.Group;
  rightCannon: THREE.Group;
  leftFlame: THREE.Mesh;
  rightFlame: THREE.Mesh;
  shieldBubble: THREE.Mesh;
  leftMuzzle: THREE.Mesh;
  rightMuzzle: THREE.Mesh;
  accentRing?: THREE.Mesh;
}

export interface EnemyRig {
  group: THREE.Group;
  hitMeshes: THREE.Mesh[];
  coreMesh: THREE.Mesh;
  baseEmissives: THREE.Color[];
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

  const leftFlame = buildThruster(-0.42);
  const rightFlame = buildThruster(0.42);

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

  const registerHit = (mesh: THREE.Mesh) => {
    const mat = mesh.material as THREE.MeshStandardMaterial;
    hitMeshes.push(mesh);
    baseEmissives.push(mat.emissive.clone());
  };

  const armorHex =
    kind === 'bomber'
      ? 0xb91c1c
      : kind === 'dreadnought' && levelSeed >= 13
      ? 0xea580c
      : 0xd96b27;

  const orangeArmorMat = () =>
    new THREE.MeshStandardMaterial({
      color: armorHex,
      metalness: 0.72,
      roughness: 0.34,
      emissive: 0x3b1203,
      emissiveIntensity: 0.45,
    });

  const darkCarbonMat = () =>
    new THREE.MeshStandardMaterial({
      color: 0x251a18,
      metalness: 0.42,
      roughness: 0.72,
      emissive: 0x120602,
      emissiveIntensity: 0.25,
    });

  const amberGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffb347,
    emissive: 0xff6a00,
    emissiveIntensity: 2.6,
    roughness: 0.15,
    metalness: 0.1,
  });

  if (kind === 'scout') {
    const wingShape = createDeltaWingShape(1.55, 1.75, -0.25);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 1,
    });
    wingGeo.rotateX(Math.PI / 2);
    wingGeo.center();
    const wings = new THREE.Mesh(wingGeo, orangeArmorMat());
    registerHit(wings);
    group.add(wings);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 1.9), darkCarbonMat());
    body.position.set(0, 0.08, 0);
    registerHit(body);
    group.add(body);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.5), amberGlowMat.clone());
    visor.position.set(0, 0.22, 0.65);
    registerHit(visor);
    group.add(visor);

    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.2, 8), orangeArmorMat());
      pod.rotation.x = Math.PI / 2;
      pod.position.set(side * 0.95, -0.04, 0.15);
      registerHit(pod);
      group.add(pod);
    }

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), amberGlowMat.clone());
    core.position.set(0, 0.08, -0.95);
    registerHit(core);
    group.add(core);

    return { group, hitMeshes, coreMesh: core, baseEmissives };
  }

  if (kind === 'bomber') {
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 2.2, 6), orangeArmorMat());
    hull.rotation.x = Math.PI / 2;
    registerHit(hull);
    group.add(hull);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.24, 1.3), darkCarbonMat());
    wing.position.set(0, 0.15, 0);
    registerHit(wing);
    group.add(wing);

    for (const side of [-1, 1]) {
      const bay = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 10), orangeArmorMat());
      bay.position.set(side * 1.5, -0.22, 0.2);
      registerHit(bay);
      group.add(bay);
    }

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), amberGlowMat.clone());
    core.position.set(0, -0.25, 1.15);
    registerHit(core);
    group.add(core);

    return { group, hitMeshes, coreMesh: core, baseEmissives };
  }

  if (kind === 'gunship') {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.62, 2.3), orangeArmorMat());
    registerHit(chassis);
    group.add(chassis);

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 1.15), darkCarbonMat());
    bridge.position.set(0, 0.46, -0.2);
    registerHit(bridge);
    group.add(bridge);

    const wingBeam = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.22, 0.95), orangeArmorMat());
    wingBeam.position.set(0, 0, -0.1);
    registerHit(wingBeam);
    group.add(wingBeam);

    for (const side of [-1, 1]) {
      const sponson = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.56, 2.5), darkCarbonMat());
      sponson.position.set(side * 1.75, 0, 0.2);
      registerHit(sponson);
      group.add(sponson);

      const cannonTip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), amberGlowMat.clone());
      cannonTip.position.set(side * 1.75, 0, 1.48);
      registerHit(cannonTip);
      group.add(cannonTip);
    }

    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 14), amberGlowMat.clone());
    core.rotation.x = Math.PI / 2;
    core.position.set(0, 0.08, 1.18);
    registerHit(core);
    group.add(core);

    return { group, hitMeshes, coreMesh: core, baseEmissives };
  }

  const scaleFactor = 1 + Math.min(0.35, (levelSeed - 1) * 0.018);
  const mainHull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.35, 5.2), orangeArmorMat());
  registerHit(mainHull);
  group.add(mainHull);

  const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.95, 3.2), darkCarbonMat());
  upperDeck.position.set(0, 1.0, -0.5);
  registerHit(upperDeck);
  group.add(upperDeck);

  const commandBridge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.72, 1.3), orangeArmorMat());
  commandBridge.position.set(0, 1.72, -1.1);
  registerHit(commandBridge);
  group.add(commandBridge);

  const bridgeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.22, 0.35), amberGlowMat.clone());
  bridgeGlow.position.set(0, 1.72, -0.35);
  registerHit(bridgeGlow);
  group.add(bridgeGlow);

  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.45, 2.6), orangeArmorMat());
    wing.position.set(side * 3.1, 0.05, 0.1);
    wing.rotation.z = side * -0.1;
    registerHit(wing);
    group.add(wing);

    const battery = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 2.8, 10), darkCarbonMat());
    battery.rotation.x = Math.PI / 2;
    battery.position.set(side * 4.35, -0.1, 0.55);
    registerHit(battery);
    group.add(battery);

    const emitter = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), amberGlowMat.clone());
    emitter.position.set(side * 4.35, -0.1, 2.02);
    registerHit(emitter);
    group.add(emitter);
  }

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.92, 1), amberGlowMat.clone());
  core.position.set(0, 0.05, 2.65);
  registerHit(core);
  group.add(core);

  group.scale.setScalar(scaleFactor);
  return { group, hitMeshes, coreMesh: core, baseEmissives };
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
