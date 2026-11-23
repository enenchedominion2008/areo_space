import * as THREE from 'three';
import {
  JET_SKINS,
  JETS,
  TRAIL_COLORS,
  type BombKind,
  type EnemyKind,
  type FragmentKind,
  type JetId,
  type JetSkinId,
  type TrailColorId,
} from './types';

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
  secondaryRing?: THREE.Mesh;
  boostAura?: THREE.Mesh;
}

export interface EnemyRig {
  group: THREE.Group;
  hitMeshes: THREE.Mesh[];
  coreMesh: THREE.Mesh;
  telegraphHalo: THREE.Mesh;
  baseEmissives: THREE.Color[];
  baseEmissiveIntensities: number[];
}

function createCyberWingShape(span: number, length: number, sweep: number, notch = 0.25): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, length * 0.58);
  shape.lineTo(span * 0.28, length * 0.2);
  shape.lineTo(span * 0.54, length * (0.04 - sweep * 0.25));
  shape.lineTo(span, -length * sweep);
  shape.lineTo(span * 0.92, -length * (sweep + 0.18));
  shape.lineTo(span * 0.62, -length * (0.44 + notch * 0.14));
  shape.lineTo(span * 0.34, -length * 0.36);
  shape.lineTo(span * 0.22, -length * 0.52);
  shape.lineTo(0, -length * 0.44);
  shape.lineTo(-span * 0.22, -length * 0.52);
  shape.lineTo(-span * 0.34, -length * 0.36);
  shape.lineTo(-span * 0.62, -length * (0.44 + notch * 0.14));
  shape.lineTo(-span * 0.92, -length * (sweep + 0.18));
  shape.lineTo(-span, -length * sweep);
  shape.lineTo(-span * 0.54, length * (0.04 - sweep * 0.25));
  shape.lineTo(-span * 0.28, length * 0.2);
  shape.closePath();
  return shape;
}

export function createPlayerShip(
  jetId: JetId = 'vanguard',
  skinId: JetSkinId = 'factory',
  trailId: TrailColorId = 'jet_default'
): PlayerShipRig {
  const group = new THREE.Group();
  const spec = JETS[jetId];
  const skin = JET_SKINS[skinId] ?? JET_SKINS.factory;
  const trail = TRAIL_COLORS[trailId] ?? TRAIL_COLORS.jet_default;

  const hullColorMap: Record<JetId, number> = {
    vanguard: 0x28304a,
    phantom: 0x1a2c44,
    valkyrie: 0x3b1b26,
    chrono: 0x8ebfe6,
    cyber_kitsune: 0x261a38,
    ronin_x: 0x1f2b22,
    netrunner: 0x16263d,
    shogun_mk9: 0x261f19,
  };

  const secondaryColorMap: Record<JetId, number> = {
    vanguard: 0x4b3a6b,
    phantom: 0x25486b,
    valkyrie: 0x6b263c,
    chrono: 0x5ba8db,
    cyber_kitsune: 0x4b2463,
    ronin_x: 0x344a32,
    netrunner: 0x214266,
    shogun_mk9: 0x423324,
  };

  const effectiveHullHex = skin.hullHex ?? hullColorMap[jetId];
  const effectiveSecondaryHex = skin.secondaryHex ?? secondaryColorMap[jetId];
  const effectiveTrimHex =
    skin.trimHex ?? (jetId === 'valkyrie' || jetId === 'shogun_mk9' ? 0xd99b26 : 0x94a3b8);
  const effectiveAccentHex = skin.accentHex ?? spec.accentHex;
  const effectiveTrailHex = trail.hex ?? effectiveAccentHex;

  const hullMat = new THREE.MeshPhysicalMaterial({
    color: effectiveHullHex,
    metalness: skin.metalness ?? (jetId === 'chrono' ? 0.6 : 0.78),
    roughness: skin.roughness ?? (jetId === 'chrono' ? 0.32 : 0.34),
    clearcoat: skin.clearcoat ?? 0.35,
    clearcoatRoughness: 0.12,
    iridescence: skin.iridescence ?? 0,
    iridescenceIOR: 1.45,
    emissive: effectiveAccentHex,
    emissiveIntensity: skin.emissiveGlow ?? 0,
  });

  const secondaryArmorMat = new THREE.MeshPhysicalMaterial({
    color: effectiveSecondaryHex,
    metalness: Math.min(0.95, (skin.metalness ?? 0.64) + 0.06),
    roughness: Math.max(0.14, (skin.roughness ?? 0.42) - 0.06),
    clearcoat: skin.clearcoat ?? 0.25,
    clearcoatRoughness: 0.14,
    iridescence: (skin.iridescence ?? 0) * 0.7,
    emissive: effectiveAccentHex,
    emissiveIntensity: (skin.emissiveGlow ?? 0) * 0.65,
  });

  const darkFrameMat = new THREE.MeshStandardMaterial({
    color: 0x0f131f,
    metalness: 0.35,
    roughness: 0.68,
  });

  const trimSteelMat = new THREE.MeshStandardMaterial({
    color: effectiveTrimHex,
    metalness: 0.9,
    roughness: 0.2,
  });

  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x050914,
    metalness: 0.22,
    roughness: 0.06,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    emissive: effectiveAccentHex,
    emissiveIntensity: skin.aeroKit ? 0.28 : 0.18,
  });

  const neonAccentMat = new THREE.MeshStandardMaterial({
    color: effectiveAccentHex,
    emissive: effectiveAccentHex,
    emissiveIntensity: skin.aeroKit ? 0.95 : 0.72,
    roughness: 0.22,
    metalness: 0.15,
  });

  const cyberCyanMat = new THREE.MeshStandardMaterial({
    color: effectiveTrailHex,
    emissive: effectiveTrailHex,
    emissiveIntensity: 0.85,
    roughness: 0.22,
    metalness: 0.15,
  });

  const greenLaserAccentMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x22ff66,
    emissiveIntensity: 0.75,
    roughness: 0.24,
    metalness: 0.15,
  });

  // 1. Cyber-Wing Chassis & Forward Canards
  const wingSpan =
    jetId === 'phantom'
      ? 2.75
      : jetId === 'cyber_kitsune'
      ? 2.6
      : jetId === 'shogun_mk9'
      ? 2.85
      : jetId === 'valkyrie'
      ? 2.55
      : 2.45;
  const wingSweep =
    jetId === 'phantom' || jetId === 'cyber_kitsune'
      ? -0.25
      : jetId === 'valkyrie' || jetId === 'shogun_mk9'
      ? 0.46
      : 0.34;

  if (jetId === 'netrunner') {
    // Cyberpunk Quad-Blade X-Wing Pincer Fighter with Conduit Rails & Sensor Mast
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.11, 0.84), hullMat);
        blade.position.set(sx * 1.18, sy * 0.44, 0.22);
        blade.rotation.z = sx * sy * 0.38;
        blade.rotation.y = sx * 0.24;
        group.add(blade);

        const armorCap = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.14, 0.46), secondaryArmorMat);
        armorCap.position.set(sx * 0.92, sy * 0.4, 0.26);
        armorCap.rotation.z = sx * sy * 0.38;
        armorCap.rotation.y = sx * 0.24;
        group.add(armorCap);

        const edgeStrip = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.055, 0.1), neonAccentMat);
        edgeStrip.position.set(sx * 1.18, sy * 0.48, -0.18);
        edgeStrip.rotation.z = sx * sy * 0.38;
        edgeStrip.rotation.y = sx * 0.24;
        group.add(edgeStrip);

        const tipNode = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), cyberCyanMat);
        tipNode.position.set(sx * 2.15, sy * 0.86, 0.45);
        group.add(tipNode);
      }
    }
  } else {
    const wingShape = createCyberWingShape(wingSpan, 3.1, wingSweep, jetId === 'vanguard' ? 0.45 : 0.22);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: jetId === 'valkyrie' || jetId === 'shogun_mk9' ? 0.28 : 0.2,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 2,
    });
    wingGeo.rotateX(Math.PI / 2);
    wingGeo.center();
    const wingMesh = new THREE.Mesh(wingGeo, hullMat);
    wingMesh.position.set(0, 0, 0.16);
    group.add(wingMesh);

    // Upper layered wing armor plates for cyber-segmented look
    const plateShape = createCyberWingShape(wingSpan * 0.68, 1.9, wingSweep * 0.8, 0.15);
    const plateGeo = new THREE.ExtrudeGeometry(plateShape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 1,
    });
    plateGeo.rotateX(Math.PI / 2);
    plateGeo.center();
    const plateMesh = new THREE.Mesh(plateGeo, secondaryArmorMat);
    plateMesh.position.set(0, 0.14, 0.18);
    group.add(plateMesh);
  }

  // Forward Cyberpunk Canard Winglets & Side Intake Strakes
  for (const side of [-1, 1]) {
    const canard = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.34), secondaryArmorMat);
    canard.position.set(side * 0.68, 0.08, -1.25);
    canard.rotation.y = side * -0.45;
    canard.rotation.z = side * 0.12;
    group.add(canard);

    const canardEdge = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.04, 0.06), neonAccentMat);
    canardEdge.position.set(side * 0.68, 0.09, -1.4);
    canardEdge.rotation.y = side * -0.45;
    canardEdge.rotation.z = side * 0.12;
    group.add(canardEdge);

    // Side air intake cowl + glowing plasma vent core
    const intakeHousing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 1.25), darkFrameMat);
    intakeHousing.position.set(side * 0.54, 0.06, -0.35);
    group.add(intakeHousing);

    const intakeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.08), neonAccentMat);
    intakeGlow.position.set(side * 0.54, 0.06, -0.98);
    group.add(intakeGlow);
  }

  // 2. Stepped Central Cyber Spine & Heat-Sink Fins
  const spineWidth = jetId === 'valkyrie' || jetId === 'shogun_mk9' ? 1.18 : 0.84;
  const spineMesh = new THREE.Mesh(new THREE.BoxGeometry(spineWidth, 0.42, 3.05), trimSteelMat);
  spineMesh.position.set(0, 0.12, -0.1);
  group.add(spineMesh);

  const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(spineWidth * 0.68, 0.18, 2.35), darkFrameMat);
  upperDeck.position.set(0, 0.34, 0.05);
  group.add(upperDeck);

  // Dorsal heat-sink cooling louvers along rear spine
  for (let lv = 0; lv < 4; lv++) {
    const louver = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.14), trimSteelMat);
    louver.position.set(0, 0.44, 0.45 + lv * 0.24);
    louver.rotation.x = -0.3;
    group.add(louver);
  }

  // Glowing reactor spine core conduit
  const coreConduit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 1.65), neonAccentMat);
  coreConduit.position.set(0, 0.45, 0.65);
  group.add(coreConduit);

  // 3. Nose Cone & Cyberpunk Split-Lance / Sensor Array
  if (jetId === 'phantom' || jetId === 'cyber_kitsune') {
    for (const side of [-1, 1]) {
      const spear = new THREE.Mesh(new THREE.ConeGeometry(0.21, 1.72, 5), hullMat);
      spear.rotation.x = -Math.PI / 2;
      spear.position.set(side * 0.35, 0.06, -2.22);
      group.add(spear);

      const bladeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 1.55), neonAccentMat);
      bladeGlow.position.set(side * 0.35, 0.19, -2.05);
      group.add(bladeGlow);
    }
    const centerProbe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.09, 0.9, 6), trimSteelMat);
    centerProbe.rotation.x = -Math.PI / 2;
    centerProbe.position.set(0, 0.1, -1.9);
    group.add(centerProbe);
  } else {
    const noseGeo = new THREE.ConeGeometry(0.4, 1.48, 6);
    noseGeo.rotateX(-Math.PI / 2);
    const noseMesh = new THREE.Mesh(noseGeo, hullMat);
    noseMesh.position.set(0, 0.08, -2.08);
    group.add(noseMesh);

    const noseStrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 1.15), neonAccentMat);
    noseStrip.position.set(0, 0.24, -1.95);
    noseStrip.rotation.x = 0.22;
    group.add(noseStrip);

    // Side sensor whiskers
    for (const side of [-1, 1]) {
      const whisker = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.72), trimSteelMat);
      whisker.position.set(side * 0.26, 0.06, -2.22);
      group.add(whisker);
    }
  }

  // 4. Holographic Cockpit Canopy & Armored Visor Arch
  const canopyGeo = new THREE.SphereGeometry(0.42, 20, 14);
  canopyGeo.scale(0.86, 0.66, 2.1);
  const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
  canopyMesh.position.set(0, 0.39, -0.52);
  group.add(canopyMesh);

  // Armored HUD Visor Halo Frame over cockpit
  const visorArch = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.035, 6, 16, Math.PI),
    neonAccentMat
  );
  visorArch.position.set(0, 0.35, -0.68);
  visorArch.rotation.x = -0.35;
  group.add(visorArch);

  const canopySpine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 1.2), darkFrameMat);
  canopySpine.position.set(0, 0.56, -0.45);
  group.add(canopySpine);

  // 5. Jet-Specific Cyberpunk Structures, Holo-Rings & Booster Aura
  let accentRing: THREE.Mesh | undefined;
  let secondaryRing: THREE.Mesh | undefined;

  if (jetId === 'vanguard') {
    // Twin forward-mounted cyber-capacitor arcs & rear holo stabilizer ring
    accentRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.045, 8, 24), neonAccentMat);
    accentRing.position.set(0, 0.14, 0.65);
    group.add(accentRing);

    for (const side of [-1, 1]) {
      const vane = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 1.15), secondaryArmorMat);
      vane.position.set(side * 1.42, 0.24, -0.15);
      vane.rotation.z = side * -0.4;
      group.add(vane);
    }
  } else if (jetId === 'chrono' || jetId === 'netrunner' || jetId === 'cyber_kitsune') {
    const ringGeo =
      jetId === 'netrunner'
        ? new THREE.TorusGeometry(1.52, 0.055, 6, 4)
        : new THREE.TorusGeometry(1.22, 0.055, 10, 28);
    accentRing = new THREE.Mesh(ringGeo, neonAccentMat);
    accentRing.position.set(0, 0.1, 0.55);
    group.add(accentRing);

    secondaryRing = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.035, 8, 20), cyberCyanMat);
    secondaryRing.position.set(0, 0.12, 0.42);
    group.add(secondaryRing);
  } else if (jetId === 'phantom') {
    // Stealth holographic prow diamond ring
    accentRing = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.04, 6, 6), neonAccentMat);
    accentRing.position.set(0, 0.1, 0.45);
    group.add(accentRing);
  }

  if (jetId === 'ronin_x') {
    // Asymmetrical Oversized Starboard Magnetic Railgun with Glowing Capacitor Coils
    const railPod = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.36, 3.75), darkFrameMat);
    railPod.position.set(1.38, 0.14, -0.62);
    group.add(railPod);
    const railStrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 3.82), neonAccentMat);
    railStrip.position.set(1.38, 0.35, -0.62);
    group.add(railStrip);
    for (let c = 0; c < 4; c++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 6, 12), cyberCyanMat);
      coil.position.set(1.38, 0.14, -2.1 + c * 0.55);
      group.add(coil);
    }
    accentRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.04, 6, 18), neonAccentMat);
    accentRing.position.set(0, 0.1, 0.72);
    group.add(accentRing);
  }

  if (jetId === 'shogun_mk9') {
    // Cyber-Samurai Kabuto Horns, Shoulder Pauldrons & Floating Shogun Halo
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.28, 4), neonAccentMat);
      horn.position.set(side * 0.46, 0.78, -0.35);
      horn.rotation.z = side * -0.45;
      horn.rotation.x = -0.35;
      group.add(horn);

      const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.36, 1.58), secondaryArmorMat);
      pauldron.position.set(side * 1.5, 0.26, 0.1);
      pauldron.rotation.z = side * -0.18;
      group.add(pauldron);

      const pauldronTrim = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.07, 0.12), neonAccentMat);
      pauldronTrim.position.set(side * 1.5, 0.45, -0.55);
      pauldronTrim.rotation.z = side * -0.18;
      group.add(pauldronTrim);
    }
    accentRing = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.055, 8, 24), neonAccentMat);
    accentRing.position.set(0, 0.25, 0.75);
    group.add(accentRing);
  }

  // Wingtip Cyberpunk Pylons, Missile/Sensor Pods, Tail Stabilizers & Neon Edge Strips
  for (const side of [-1, 1]) {
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0.88, -0.35);
    finShape.lineTo(jetId === 'cyber_kitsune' ? 1.32 : 0.98, jetId === 'cyber_kitsune' ? 1.02 : 0.56);
    finShape.lineTo(0.25, 0.65);
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
    fin.position.set(side * (wingSpan * 0.9), 0.05, 0.58);
    fin.rotation.z = side * (jetId === 'cyber_kitsune' ? -0.38 : -0.24);
    group.add(fin);

    // Neon edge along vertical stabilizer tip
    const finGlow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.48, 0.07), neonAccentMat);
    finGlow.position.set(side * (wingSpan * 0.98), 0.58, 0.85);
    finGlow.rotation.z = side * -0.24;
    group.add(finGlow);

    // Wingtip laser emitter pod / cyber-beacon + wingtip plasma thruster plume
    const wingPod = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.15, 8), darkFrameMat);
    wingPod.rotation.x = Math.PI / 2;
    wingPod.position.set(side * (wingSpan * 0.96), 0.02, 0.25);
    group.add(wingPod);

    const wingTipLed = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), cyberCyanMat);
    wingTipLed.position.set(side * (wingSpan * 0.96), 0.02, -0.34);
    group.add(wingTipLed);

    const wingThrusterRing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 12), cyberCyanMat);
    wingThrusterRing.position.set(side * (wingSpan * 0.96), 0.02, 0.83);
    group.add(wingThrusterRing);

    const wingThrusterConeGeo = new THREE.ConeGeometry(0.1, 0.95, 10, 1, true);
    wingThrusterConeGeo.rotateX(Math.PI / 2);
    wingThrusterConeGeo.translate(0, 0, 0.48);
    const wingThrusterConeMat = new THREE.MeshBasicMaterial({
      color: effectiveTrailHex,
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const wingThrusterPlume = new THREE.Mesh(wingThrusterConeGeo, wingThrusterConeMat);
    wingThrusterPlume.position.set(side * (wingSpan * 0.96), 0.02, 0.84);
    group.add(wingThrusterPlume);

    if (skin.aeroKit) {
      // Futuristic Aero-Kit Build Upgrade: Swept dorsal energy fins, forward cyber-splitters & wing-root plasma conduits
      const aeroBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 1.38), trimSteelMat);
      aeroBlade.position.set(side * 0.52, 0.42, 0.72);
      aeroBlade.rotation.z = side * -0.36;
      aeroBlade.rotation.x = -0.18;
      group.add(aeroBlade);

      const aeroBladeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 1.42), neonAccentMat);
      aeroBladeEdge.position.set(side * 0.58, 0.56, 0.72);
      aeroBladeEdge.rotation.z = side * -0.36;
      aeroBladeEdge.rotation.x = -0.18;
      group.add(aeroBladeEdge);

      const fwdSplitter = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.22), trimSteelMat);
      fwdSplitter.position.set(side * 0.42, -0.02, -1.65);
      fwdSplitter.rotation.y = side * -0.52;
      group.add(fwdSplitter);

      const wingConduit = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.05, 0.09), cyberCyanMat);
      wingConduit.position.set(side * 1.42, 0.15, 0.55);
      wingConduit.rotation.y = side * -0.3;
      group.add(wingConduit);
    }

    if (jetId === 'valkyrie') {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.38, 1.48), secondaryArmorMat);
      pod.position.set(side * 1.48, -0.1, 0.14);
      group.add(pod);
      const podTip = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.1), neonAccentMat);
      podTip.position.set(side * 1.48, -0.1, -0.62);
      group.add(podTip);
    }

    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 1.95), neonAccentMat);
    strip.position.set(side * 1.18, 0.21, 0.25);
    strip.rotation.y = side * (jetId === 'phantom' || jetId === 'cyber_kitsune' ? -0.35 : 0.44);
    group.add(strip);

    const spineNeon = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.55), neonAccentMat);
    spineNeon.position.set(side * 0.34, 0.37, 0.35);
    group.add(spineNeon);
  }

  // 6. Twin Dorsal Cyber-Rail Cannons
  const buildCannon = (xPos: number): { cannon: THREE.Group; muzzle: THREE.Mesh } => {
    const cannon = new THREE.Group();
    cannon.position.set(xPos, 0.36, -0.25);

    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.78), darkFrameMat);
    cannon.add(mount);

    const coilRing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 6, 12), neonAccentMat);
    coilRing.position.set(0, 0.03, -0.58);
    cannon.add(coilRing);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.12, 10), trimSteelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.68);
    cannon.add(barrel);

    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.18, 10), greenLaserAccentMat);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(0, 0.03, -1.22);
    cannon.add(tip);

    const muzzleGeo = new THREE.SphereGeometry(0.22, 10, 10);
    const muzzleMat = new THREE.MeshBasicMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzle.position.set(0, 0.03, -1.32);
    cannon.add(muzzle);

    group.add(cannon);
    return { cannon, muzzle };
  };

  const leftC = buildCannon(-0.62);
  const rightC = buildCannon(0.62);

  // 7. Twin Aft Vectoring Engine Nacelles & Thruster Flames
  const nozzlePts = [
    new THREE.Vector2(0.21, 0),
    new THREE.Vector2(0.34, 0.18),
    new THREE.Vector2(0.3, 0.56),
    new THREE.Vector2(0.19, 0.68),
  ];
  const nozzleGeo = new THREE.LatheGeometry(nozzlePts, 14);
  nozzleGeo.rotateX(Math.PI / 2);

  const flameGeo = new THREE.ConeGeometry(0.25, 1.85, 12, 1, true);
  flameGeo.rotateX(Math.PI / 2);
  flameGeo.translate(0, 0, 0.9);

  const buildThruster = (xPos: number): THREE.Mesh => {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.72, 10), secondaryArmorMat);
    housing.rotation.x = Math.PI / 2;
    housing.position.set(xPos, 0.08, 1.05);
    group.add(housing);

    const nozzle = new THREE.Mesh(nozzleGeo, darkFrameMat);
    nozzle.position.set(xPos, 0.08, 1.38);
    group.add(nozzle);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 8, 16), neonAccentMat);
    ring.position.set(xPos, 0.08, 1.56);
    group.add(ring);

    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 6, 16), cyberCyanMat);
    outerRing.position.set(xPos, 0.08, 1.44);
    group.add(outerRing);

    const flameMat = new THREE.MeshBasicMaterial({
      color: effectiveTrailHex,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(xPos, 0.08, 1.54);
    group.add(flame);
    return flame;
  };

  const buildAfterburnerTrail = (xPos: number): THREE.Mesh => {
    const trailGeo = new THREE.ConeGeometry(0.38, 5.0, 12, 1, true);
    trailGeo.rotateX(Math.PI / 2);
    trailGeo.translate(0, 0, 2.5);
    const trailMat = new THREE.MeshBasicMaterial({
      color: effectiveTrailHex,
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

  const leftFlame = buildThruster(-0.44);
  const rightFlame = buildThruster(0.44);
  const leftAfterburnerTrail = buildAfterburnerTrail(-0.44);
  const rightAfterburnerTrail = buildAfterburnerTrail(0.44);

  // Ram energy prow cone for Afterburner ram-kills
  const ramGeo = new THREE.ConeGeometry(2.15, 4.6, 16, 1, true);
  ramGeo.rotateX(-Math.PI / 2);
  const ramMat = new THREE.MeshBasicMaterial({
    color: effectiveTrailHex,
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

  // Special Boost Cyber-Aura Envelope (pulses during Q special overdrive/boost)
  const boostGeo = new THREE.ConeGeometry(2.4, 4.4, 8, 1, true);
  boostGeo.rotateX(-Math.PI / 2);
  const boostMat = new THREE.MeshBasicMaterial({
    color: effectiveAccentHex,
    transparent: true,
    opacity: 0,
    wireframe: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const boostAura = new THREE.Mesh(boostGeo, boostMat);
  boostAura.position.set(0, 0.12, -0.35);
  boostAura.visible = false;
  group.add(boostAura);

  // 8. Shield / Aura Sphere
  const shieldGeo = new THREE.SphereGeometry(2.5, 24, 16);
  shieldGeo.scale(1.1, 0.55, 1.25);
  const shieldMat = new THREE.MeshBasicMaterial({
    color: effectiveAccentHex,
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
    secondaryRing,
    boostAura,
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
      metalness: 0.56,
      roughness: 0.36,
      emissive: armorEmissiveHex,
      emissiveIntensity: 0.22,
    });

  // Bright titanium-steel secondary framing for crisp silhouette separation
  const contrastSteelMat = () =>
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.72,
      roughness: 0.28,
      emissive: 0x1e293b,
      emissiveIntensity: 0.12,
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
      emissiveIntensity: 0.68,
      roughness: 0.25,
      metalness: 0.15,
    });

  const coreGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: kind === 'bomber' ? 0xff2e93 : 0xff6a00,
    emissiveIntensity: 1.05,
    roughness: 0.2,
    metalness: 0.12,
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
    const wingShape = createCyberWingShape(1.65, 1.85, -0.25);
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
      : kind === 'wingman'
      ? 0xf59e0b
      : 0x22c55e;

  const shardMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.45,
    roughness: 0.2,
    metalness: 0.35,
  });

  if (kind === 'wingman') {
    // Distinct miniature dual-chevron holographic escort core + twin rings
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.25, 4), shardMat);
    core.rotation.x = -Math.PI / 2;
    group.add(core);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.09, 0.45), shardMat);
    wing.position.set(0, 0, 0.15);
    group.add(wing);

    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.06, 6, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.92 })
    );
    group.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.05, 6, 20),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 })
    );
    ring2.rotation.y = Math.PI / 2;
    group.add(ring2);
    return group;
  }

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

export function createWingmanEscortMesh(accentHex: number, trailHex: number): THREE.Group {
  const group = new THREE.Group();

  const holoHullMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: accentHex,
    emissiveIntensity: 0.55,
    roughness: 0.28,
    metalness: 0.65,
    transparent: true,
    opacity: 0.86,
  });

  const wingShape = createCyberWingShape(1.15, 1.45, 0.34, 0.25);
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 1,
  });
  wingGeo.rotateX(Math.PI / 2);
  wingGeo.center();
  const wings = new THREE.Mesh(wingGeo, holoHullMat);
  group.add(wings);

  const wireEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(wingGeo),
    new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.88 })
  );
  group.add(wireEdges);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 1.15, 6),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      emissive: accentHex,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.9,
    })
  );
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0.06, -0.32);
  group.add(nose);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.9, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: trailHex,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  flame.rotation.x = Math.PI / 2;
  flame.position.set(0, 0.02, 0.9);
  group.add(flame);

  // Protective mini holo-barrier ring (signals bomb interception capability)
  const guardRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.035, 6, 20),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  guardRing.rotation.x = Math.PI / 2;
  group.add(guardRing);

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

export function createCallsignSprite(label: string, color = '#38bdf8'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(4, 12, 22, 0.78)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(12, 10, 232, 44, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 18), 128, 33);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.4, 0.85, 1);
  return sprite;
}

export function disposeObjectTree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Sprite) {
      obj.material.map?.dispose();
      obj.material.dispose();
    } else if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
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
