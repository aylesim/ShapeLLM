"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { vectorToForm } from "@/lib/reading/form";
import { describeForm } from "@/lib/reading/palette";
import { AXES, type AffectVector } from "@/lib/reading/types";
import {
  CORE_FRAGMENT,
  CORE_VERTEX,
  GLOW_FRAGMENT,
  GLOW_VERTEX,
  MEMBRANE_FRAGMENT,
  MEMBRANE_VERTEX,
  RING_FRAGMENT,
  RING_VERTEX,
} from "./specimen-shader";

type SpecimenStageProps = {
  vector: AffectVector;
  voiceLevel?: number;
  seed?: number;
  className?: string;
  showCage?: boolean;
};

const DEFAULT_VECTOR: AffectVector = {
  valence: 0.5,
  arousal: 0.5,
  dominance: 0.5,
  tension: 0.5,
  warmth: 0.5,
  certainty: 0.5,
};

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  return reduced;
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    setMobile(query.matches);
    const handler = (event: MediaQueryListEvent) => setMobile(event.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  return mobile;
}

function SpecimenMesh({
  vector,
  seed,
  voiceLevel,
  reduced,
  mobile,
  pulseRef,
}: {
  vector: AffectVector;
  seed: number;
  voiceLevel: number;
  reduced: boolean;
  mobile: boolean;
  pulseRef: React.MutableRefObject<number>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const current = useRef<AffectVector>({ ...DEFAULT_VECTOR });
  const currentVoice = useRef(0);
  const previousTarget = useRef<AffectVector>({ ...vector });

  const geometry = useMemo(
    () => new THREE.IcosahedronGeometry(1.16, mobile ? 4 : 5),
    [mobile],
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpike: { value: 0.2 },
      uTwist: { value: 0 },
      uScale: { value: 1 },
      uJitter: { value: 0.1 },
      uVoice: { value: 0 },
      uSeed: { value: seed },
      uColorA: { value: new THREE.Color("#7fa08c") },
      uColorB: { value: new THREE.Color("#d8b25e") },
      uArousal: { value: 0.2 },
      uRough: { value: 0.5 },
      uGlow: { value: 0.2 },
    }),
    [seed],
  );

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const time = state.clock.elapsedTime;

    for (const axis of AXES) {
      current.current[axis] = THREE.MathUtils.damp(
        current.current[axis],
        vector[axis],
        reduced ? 10 : 3.1,
        delta,
      );
    }

    currentVoice.current = THREE.MathUtils.damp(
      currentVoice.current,
      voiceLevel,
      7,
      delta,
    );

    const distance = AXES.reduce(
      (sum, axis) => sum + Math.abs(previousTarget.current[axis] - vector[axis]),
      0,
    );
    if (distance > 0.12) {
      pulseRef.current = Math.min(1, pulseRef.current + distance * 0.9);
    }
    previousTarget.current = { ...vector };
    pulseRef.current = Math.max(0, pulseRef.current - delta * 1.4);

    const form = vectorToForm(current.current, seed);
    const material = materialRef.current;
    if (material) {
      material.uniforms.uTime.value = time;
      material.uniforms.uSpike.value = form.spike;
      material.uniforms.uTwist.value = form.twist;
      material.uniforms.uScale.value = form.scale;
      material.uniforms.uJitter.value = form.jitter;
      material.uniforms.uVoice.value = currentVoice.current;
      material.uniforms.uSeed.value = seed;
      material.uniforms.uArousal.value = current.current.arousal;
      material.uniforms.uRough.value = form.roughness;
      material.uniforms.uGlow.value = form.glow + pulseRef.current * 0.2;
      material.uniforms.uColorA.value.set(form.colorA);
      material.uniforms.uColorB.value.set(form.colorB);
    }

    const mesh = meshRef.current;
    if (mesh) {
      mesh.rotation.y += delta * (reduced ? 0.04 : form.rotationSpeed);
      mesh.rotation.x = Math.sin(time * 0.18) * 0.06;
      mesh.position.y = Math.sin(time * 0.8) * 0.025;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={CORE_VERTEX}
        fragmentShader={CORE_FRAGMENT}
        toneMapped={false}
      />
    </mesh>
  );
}

function Membrane({
  vector,
  seed,
  voiceLevel,
  reduced,
  mobile,
}: {
  vector: AffectVector;
  seed: number;
  voiceLevel: number;
  reduced: boolean;
  mobile: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const current = useRef<AffectVector>({ ...DEFAULT_VECTOR });
  const currentVoice = useRef(0);

  const geometry = useMemo(
    () => new THREE.IcosahedronGeometry(1.16, mobile ? 3 : 4),
    [mobile],
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpike: { value: 0.2 },
      uTwist: { value: 0 },
      uScale: { value: 1 },
      uJitter: { value: 0.1 },
      uVoice: { value: 0 },
      uSeed: { value: seed },
      uColorB: { value: new THREE.Color("#d8b25e") },
      uTension: { value: 0.2 },
      uOpacity: { value: 1 },
    }),
    [seed],
  );

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    for (const axis of AXES) {
      current.current[axis] = THREE.MathUtils.damp(
        current.current[axis],
        vector[axis],
        reduced ? 9 : 2.4,
        delta,
      );
    }
    currentVoice.current = THREE.MathUtils.damp(
      currentVoice.current,
      voiceLevel,
      6,
      delta,
    );

    const form = vectorToForm(current.current, seed);
    const material = materialRef.current;
    if (material) {
      material.uniforms.uTime.value = state.clock.elapsedTime;
      material.uniforms.uSpike.value = form.spike;
      material.uniforms.uTwist.value = form.twist;
      material.uniforms.uScale.value = form.scale;
      material.uniforms.uJitter.value = form.jitter;
      material.uniforms.uVoice.value = currentVoice.current;
      material.uniforms.uTension.value = current.current.tension;
      material.uniforms.uColorB.value.set(form.colorB);
      material.uniforms.uOpacity.value = 0.3 + currentVoice.current * 0.12;
    }

    const mesh = meshRef.current;
    if (mesh) {
      mesh.rotation.y -= delta * (reduced ? 0.02 : 0.08 + form.rotationSpeed * 0.2);
      mesh.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.08;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={MEMBRANE_VERTEX}
        fragmentShader={MEMBRANE_FRAGMENT}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function Cage({ visible, reduced }: { visible: boolean; reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current && !reduced) {
      ref.current.rotation.y -= delta * 0.035;
      ref.current.rotation.x += delta * 0.008;
    }
  });

  if (!visible) return null;

  return (
    <mesh ref={ref} rotation={[0.1, 0, 0]}>
      <icosahedronGeometry args={[1.58, 1]} />
      <meshBasicMaterial
        color="#b9b2a6"
        wireframe
        transparent
        opacity={0.12}
      />
    </mesh>
  );
}

function Plinth() {
  return (
    <group position={[0, -1.58, 0]}>
      <mesh>
        <cylinderGeometry args={[1.8, 1.95, 0.08, 96]} />
        <meshStandardMaterial
          color="#0b0b0d"
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[1.78, 1.78, 0.008, 96]} />
        <meshBasicMaterial color="#2b2a27" />
      </mesh>
    </group>
  );
}

function FloorRing({
  vector,
  voiceLevel,
  pulseRef,
}: {
  vector: AffectVector;
  voiceLevel: number;
  pulseRef: React.MutableRefObject<number>;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const currentVoice = useRef(0);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#d8b25e") },
      uOpacity: { value: 0.7 },
      uPulse: { value: 0 },
    }),
    [],
  );

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    currentVoice.current = THREE.MathUtils.damp(
      currentVoice.current,
      voiceLevel,
      6,
      delta,
    );
    const form = vectorToForm(vector);
    if (materialRef.current) {
      materialRef.current.uniforms.uColor.value.set(form.colorB);
      materialRef.current.uniforms.uPulse.value =
        pulseRef.current + currentVoice.current * 0.5;
    }
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.535, 0]}
    >
      <ringGeometry args={[1.7, 1.73, 180]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={RING_VERTEX}
        fragmentShader={RING_FRAGMENT}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function Glow({ vector }: { vector: AffectVector }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#c2543a") },
      uOpacity: { value: 0.2 },
    }),
    [],
  );

  useFrame(() => {
    const form = vectorToForm(vector);
    if (materialRef.current) {
      materialRef.current.uniforms.uColor.value.set(form.colorA);
      materialRef.current.uniforms.uOpacity.value = 0.12 + vector.arousal * 0.22;
    }
  });

  return (
    <mesh position={[0, 0, -2.6]}>
      <planeGeometry args={[8.5, 8.5]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={GLOW_VERTEX}
        fragmentShader={GLOW_FRAGMENT}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function Dust({ reduced, vector }: { reduced: boolean; vector: AffectVector }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  const positions = useMemo(() => {
    const count = 150;
    const random = seededRandom(0x5eed);
    const array = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = 0.8 + random() * 2.6;
      const angle = random() * Math.PI * 2;
      array[index * 3] = Math.cos(angle) * radius;
      array[index * 3 + 1] = -1.2 + random() * 3.4;
      array[index * 3 + 2] = Math.sin(angle) * radius;
    }
    return array;
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current && !reduced) {
      pointsRef.current.rotation.y += delta * 0.012;
    }
    if (materialRef.current) {
      materialRef.current.opacity = 0.12 + vector.arousal * 0.32;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color="#d8b25e"
        size={0.014}
        sizeAttenuation
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </points>
  );
}

function SpecimenScene({
  vector,
  voiceLevel,
  seed,
  reduced,
  mobile,
  showCage,
}: {
  vector: AffectVector;
  voiceLevel: number;
  seed: number;
  reduced: boolean;
  mobile: boolean;
  showCage: boolean;
}) {
  const pulseRef = useRef(0);

  return (
    <>
      <ambientLight intensity={0.16} />
      <directionalLight position={[4, 5, 3]} intensity={1.15} color="#ffe4c0" />
      <directionalLight position={[-4, 2, -3]} intensity={0.75} color="#9fb7d4" />
      <pointLight position={[0, -1.1, 2.4]} intensity={0.55} color="#ffb27a" />

      <Glow vector={vector} />
      <SpecimenMesh
        vector={vector}
        seed={seed}
        voiceLevel={voiceLevel}
        reduced={reduced}
        mobile={mobile}
        pulseRef={pulseRef}
      />
      <Membrane
        vector={vector}
        seed={seed}
        voiceLevel={voiceLevel}
        reduced={reduced}
        mobile={mobile}
      />
      <Cage visible={showCage} reduced={reduced} />
      <Plinth />
      <FloorRing vector={vector} voiceLevel={voiceLevel} pulseRef={pulseRef} />
      <Dust reduced={reduced} vector={vector} />
      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.6}
        scale={7}
        blur={2.6}
        far={4.5}
        resolution={512}
        color="#000000"
      />
      <OrbitControls
        enabled={!mobile}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={Math.PI / 1.75}
      />
    </>
  );
}

export default function SpecimenStage({
  vector,
  voiceLevel = 0,
  seed = 0,
  className = "",
  showCage = true,
}: SpecimenStageProps) {
  const reduced = usePrefersReducedMotion();
  const mobile = useIsMobile();
  const form = useMemo(() => vectorToForm(vector, seed), [vector, seed]);
  const description = useMemo(() => describeForm(form), [form]);

  return (
    <div
      className={`specimen-stage ${className}`}
      data-specimen-stage
      role="img"
      aria-label={`3D specimen: ${description}`}
    >
      <Canvas
        camera={{ position: [0, 0.12, 6.4], fov: 38, near: 0.1, far: 28 }}
        dpr={[1, 1.7]}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <SpecimenScene
          vector={vector}
          voiceLevel={voiceLevel}
          seed={seed}
          reduced={reduced}
          mobile={mobile}
          showCage={showCage}
        />
      </Canvas>
      <div className="stage-vignette" aria-hidden="true" />
      <div className="stage-grain" aria-hidden="true" />
      <div className="stage-crosshair" aria-hidden="true" />
      <div className="stage-corner stage-corner--tl" aria-hidden="true" />
      <div className="stage-corner stage-corner--tr" aria-hidden="true" />
      <div className="stage-corner stage-corner--bl" aria-hidden="true" />
      <div className="stage-corner stage-corner--br" aria-hidden="true" />
    </div>
  );
}
