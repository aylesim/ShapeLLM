"use client";

import { useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

const vertexShader = `
  uniform float uAngry;
  uniform float uTime;

  varying vec3 vNormal;
  varying float vIntensity;

  float sharpNoise(vec3 p) {
    float a = sin(p.x * 3.5 + uTime * 0.8);
    float b = sin(p.y * 4.2 - uTime * 0.6);
    float c = sin(p.z * 5.1 + uTime * 0.9);
    return abs(a * b * c);
  }

  void main() {
    vNormal = normal;
    vec3 n = normalize(normal);
    float freq = mix(1.5, 8.0, uAngry);
    float spike = pow(sharpNoise(position * freq), mix(0.4, 2.8, uAngry));
    float disp = spike * uAngry * 0.62;
    vec3 pos = position + n * disp;
    vIntensity = spike;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float uAngry;

  varying vec3 vNormal;
  varying float vIntensity;

  void main() {
    vec3 calm = vec3(0.52, 0.60, 0.72);
    vec3 angry = vec3(0.94, 0.14, 0.06);
    vec3 base = mix(calm, angry, uAngry);

    vec3 light = normalize(vec3(0.4, 0.8, 1.0));
    float diff = max(dot(normalize(vNormal), light), 0.0);
    float flatMix = mix(diff, 1.0, uAngry * 0.9);
    vec3 color = base * (0.28 + flatMix * 0.72 + vIntensity * uAngry * 0.15);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function AngryMesh({ targetAngry }: { targetAngry: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const displayAngry = useRef(0);

  useFrame((state, delta) => {
    displayAngry.current = THREE.MathUtils.lerp(
      displayAngry.current,
      targetAngry,
      Math.min(delta * 4, 1),
    );

    if (materialRef.current) {
      materialRef.current.uniforms.uAngry.value = displayAngry.current;
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }

    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.25;
    }
  });

  const uniforms = useRef({
    uAngry: { value: 0 },
    uTime: { value: 0 },
  }).current;

  return (
    <mesh ref={meshRef} rotation={[0.4, 0.6, 0]}>
      <icosahedronGeometry args={[1.2, 5]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

function Scene({ targetAngry }: { targetAngry: number }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 3]} intensity={1.1} />
      <AngryMesh targetAngry={targetAngry} />
      <OrbitControls enablePan={false} minDistance={2.2} maxDistance={6} />
    </>
  );
}

export default function AngryCanvas({ targetAngry }: { targetAngry: number }) {
  return (
    <div className="min-h-[22rem] flex-1 w-full overflow-hidden rounded border border-[var(--border)] bg-[var(--canvas-bg)]">
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 42 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "var(--canvas-bg)" }}
      >
        <Scene targetAngry={targetAngry} />
      </Canvas>
    </div>
  );
}
