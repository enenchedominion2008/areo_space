import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createPlayerShip, disposeObjectTree, type PlayerShipRig } from '../game/models';
import { JET_SKINS, JETS, TRAIL_COLORS, type JetId, type JetSkinId, type TrailColorId } from '../game/types';

interface JetPreviewCanvasProps {
  jetId: JetId;
  skinId: JetSkinId;
  trailId: TrailColorId;
  slideDirection?: 1 | -1;
  className?: string;
  children?: React.ReactNode;
}

export const JetPreviewCanvas: React.FC<JetPreviewCanvasProps> = ({
  jetId,
  skinId,
  trailId,
  slideDirection = 1,
  className = '',
  children,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<PlayerShipRig | null>(null);
  const outgoingRigRef = useRef<{ rig: PlayerShipRig; dir: number; x: number; scale: number } | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const platformRingMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);

  const prevJetIdRef = useRef<JetId | null>(null);
  const slideDirRef = useRef<number>(slideDirection);
  slideDirRef.current = slideDirection;

  // Incoming animation state for smooth jet swaps and subtle cosmetic equip pop
  const incomingAnimRef = useRef<{ x: number; scale: number; roll: number; pulse: number }>({
    x: 0,
    scale: 0.78,
    roll: 0,
    pulse: 0,
  });
  const baseScaleRef = useRef<number>(0.78);

  const [webglLost, setWebglLost] = useState(false);

  // One-time Three.js preview studio setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      setWebglLost(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth || 320, container.clientHeight || 260);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030812);
    sceneRef.current = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    const w = container.clientWidth || 320;
    const h = container.clientHeight || 260;
    baseScaleRef.current = w < 540 ? 0.7 : 0.8;
    const camera = new THREE.PerspectiveCamera(40, w / Math.max(1, h), 0.1, 60);
    camera.position.set(0, 2.25, 6.75);
    camera.lookAt(0, 0.08, 0);

    // 3-point studio lighting
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1e0, 2.15);
    keyLight.position.set(5, 7, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.35);
    rimLight.position.set(-5, 3, -5);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    // Hangar turntable pedestal
    const padGroup = new THREE.Group();
    padGroup.position.y = -0.88;
    padGroup.scale.setScalar(0.8);
    const padDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(2.35, 2.55, 0.14, 36),
      new THREE.MeshStandardMaterial({
        color: 0x0b1424,
        metalness: 0.78,
        roughness: 0.34,
      })
    );
    padGroup.add(padDisc);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.78,
    });
    platformRingMatRef.current = ringMat;
    const padRing = new THREE.Mesh(new THREE.TorusGeometry(2.36, 0.04, 8, 48), ringMat);
    padRing.rotation.x = Math.PI / 2;
    padRing.position.y = 0.075;
    padGroup.add(padRing);

    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(1.45, 1.5, 36),
      new THREE.MeshBasicMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
      })
    );
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.08;
    padGroup.add(innerRing);
    scene.add(padGroup);

    // Interactive orbit drag state
    let yaw = -0.58;
    let pitch = 0.12;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let userInteracting = false;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      userInteracting = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      yaw += dx * 0.012;
      pitch = THREE.MathUtils.clamp(pitch + dy * 0.008, -0.35, 0.55);
    };
    const onPointerUp = () => {
      dragging = false;
      userInteracting = false;
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const onContextRestored = () => {
      setWebglLost(false);
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const cw = Math.max(120, Math.round(entry.contentRect.width));
      const ch = Math.max(120, Math.round(entry.contentRect.height));
      baseScaleRef.current = cw < 540 ? 0.7 : 0.8;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch, false);
    });
    resizeObserver.observe(container);

    let rafId = 0;
    let prev = performance.now();
    const animate = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - prev) / 1000));
      prev = now;

      if (!userInteracting) {
        yaw += dt * 0.58;
      }

      const dampFactor = 1 - Math.exp(-10 * dt);
      const anim = incomingAnimRef.current;
      anim.x = THREE.MathUtils.lerp(anim.x, 0, dampFactor);
      anim.roll = THREE.MathUtils.lerp(anim.roll, 0, dampFactor);
      anim.pulse = Math.max(0, anim.pulse - dt * 5.2);
      const targetScale = baseScaleRef.current + Math.sin(anim.pulse * Math.PI) * 0.06;
      anim.scale = THREE.MathUtils.lerp(anim.scale, targetScale, dampFactor);

      const rig = rigRef.current;
      if (rig) {
        rig.group.position.set(anim.x, 0.24 + Math.sin(now * 0.0028) * 0.05, 0);
        rig.group.rotation.y = yaw;
        rig.group.rotation.x = pitch;
        rig.group.rotation.z = anim.roll;
        rig.group.scale.setScalar(anim.scale);

        const flicker = 0.92 + Math.sin(now * 0.04) * 0.14;
        rig.leftFlame.scale.set(1, 1, flicker);
        rig.rightFlame.scale.set(1, 1, flicker);
        if (rig.accentRing) rig.accentRing.rotation.z += dt * 2.2;
        if (rig.secondaryRing) rig.secondaryRing.rotation.z -= dt * 1.7;
      }

      const outgoing = outgoingRigRef.current;
      if (outgoing) {
        const targetOutX = -outgoing.dir * 6.8;
        outgoing.x = THREE.MathUtils.lerp(outgoing.x, targetOutX, 1 - Math.exp(-11 * dt));
        outgoing.scale = THREE.MathUtils.lerp(outgoing.scale, 0.4, 1 - Math.exp(-10 * dt));
        outgoing.rig.group.position.x = outgoing.x;
        outgoing.rig.group.rotation.y = yaw;
        outgoing.rig.group.rotation.z = outgoing.dir * 0.35;
        outgoing.rig.group.scale.setScalar(outgoing.scale);

        if (Math.abs(outgoing.x) > 5.2) {
          scene.remove(outgoing.rig.group);
          disposeObjectTree(outgoing.rig.group);
          outgoingRigRef.current = null;
        }
      }

      padGroup.rotation.y = yaw * 0.5;
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);

      if (rigRef.current) {
        scene.remove(rigRef.current.group);
        disposeObjectTree(rigRef.current.group);
        rigRef.current = null;
      }
      if (outgoingRigRef.current) {
        scene.remove(outgoingRigRef.current.rig.group);
        disposeObjectTree(outgoingRigRef.current.rig.group);
        outgoingRigRef.current = null;
      }
      scene.remove(padGroup);
      disposeObjectTree(padGroup);
      envTarget.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
      sceneRef.current = null;
      platformRingMatRef.current = null;
      rimLightRef.current = null;
    };
  }, []);

  // Swap/update jet mesh cleanly whenever jet, skin, or trail changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const jetChanged = prevJetIdRef.current !== null && prevJetIdRef.current !== jetId;
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (outgoingRigRef.current) {
      scene.remove(outgoingRigRef.current.rig.group);
      disposeObjectTree(outgoingRigRef.current.rig.group);
      outgoingRigRef.current = null;
    }

    if (rigRef.current) {
      if (jetChanged && !prefersReducedMotion) {
        outgoingRigRef.current = {
          rig: rigRef.current,
          dir: slideDirRef.current,
          x: rigRef.current.group.position.x,
          scale: rigRef.current.group.scale.x || 1.08,
        };
      } else {
        scene.remove(rigRef.current.group);
        disposeObjectTree(rigRef.current.group);
      }
      rigRef.current = null;
    }

    const nextRig = createPlayerShip(jetId, skinId, trailId);
    if (jetChanged && !prefersReducedMotion) {
      const dir = slideDirRef.current;
      incomingAnimRef.current = {
        x: dir * 6.4,
        scale: 0.44,
        roll: -dir * 0.38,
        pulse: 0,
      };
      nextRig.group.position.set(dir * 6.4, 0.24, 0);
      nextRig.group.scale.setScalar(0.44);
    } else {
      const restScale = baseScaleRef.current;
      incomingAnimRef.current = {
        x: 0,
        scale: restScale,
        roll: 0,
        pulse: prevJetIdRef.current === jetId ? 1 : 0,
      };
      nextRig.group.position.set(0, 0.24, 0);
      nextRig.group.scale.setScalar(restScale);
    }

    prevJetIdRef.current = jetId;
    scene.add(nextRig.group);
    rigRef.current = nextRig;

    const accentHex =
      TRAIL_COLORS[trailId]?.hex ?? JET_SKINS[skinId]?.accentHex ?? JETS[jetId].accentHex;
    platformRingMatRef.current?.color.setHex(accentHex);
    rimLightRef.current?.color.setHex(accentHex);
  }, [jetId, skinId, trailId]);

  const jet = JETS[jetId];
  const skin = JET_SKINS[skinId];
  const trail = TRAIL_COLORS[trailId];
  const fallbackColor = trail.hex ? trail.cssColor : skin.swatchColor || jet.primaryColor;

  return (
    <div
      className={`relative overflow-hidden rounded-sm border border-emerald-500/40 bg-[#030812] ${className}`}
    >
      <div
        ref={mountRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        aria-label={`3D Hangar preview of ${jet.name}`}
      />

      {webglLost && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030812] p-4">
          <svg viewBox="0 0 180 120" className="w-40 h-28" aria-hidden="true">
            <polygon
              points="90,10 112,56 164,88 112,84 102,104 90,94 78,104 68,84 16,88 68,56"
              fill={fallbackColor}
              fillOpacity="0.22"
              stroke={fallbackColor}
              strokeWidth="2.5"
            />
            <circle cx="90" cy="54" r="7" fill={fallbackColor} />
          </svg>
        </div>
      )}

      {children}
    </div>
  );
};
