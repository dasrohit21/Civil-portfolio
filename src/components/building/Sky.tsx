"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clocks, fx } from "@/lib/store";

/** Golden hour: dusky blue overhead, peach in the middle, warm gold at the horizon, a glow where the sun sets. */
export const SUNSET = { top: "#5f7fb4", middle: "#f2b48c", horizon: "#ffd9a6", glow: "#fff0c8" };
/** The same sky under heavy cloud: Jamshedpur's weather blends towards this (fx.grey). */
export const CLOUDED = { top: "#5d6673", horizon: "#b9b6b1" };
const PAPER = "#f3eee3";
/** Where the sun is, seen from the building (low, front left). Matches the Rig's sun light. */
export const SUN_DIRECTION = new THREE.Vector3(-9, 5.5, 10).normalize();

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMiddle;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  uniform vec3 uPaper;
  uniform vec3 uSun;
  uniform vec3 uCloudTop;
  uniform vec3 uCloudHorizon;
  uniform float uMix;
  uniform float uGrey;
  uniform float uFlash;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -0.2, 1.0);
    vec3 sky = mix(uHorizon, uMiddle, smoothstep(-0.05, 0.18, h));
    sky = mix(sky, uTop, smoothstep(0.18, 0.75, h));
    sky += uGlow * pow(max(dot(d, uSun), 0.0), 12.0) * 0.55 * (1.0 - uGrey);
    vec3 clouded = mix(uCloudHorizon, uCloudTop, smoothstep(-0.05, 0.75, h));
    sky = mix(sky, clouded, uGrey);
    sky += vec3(0.75, 0.8, 1.0) * uFlash;
    gl_FragColor = vec4(mix(uPaper, sky, uMix), 1.0);
    #include <colorspace_fragment>
  }
`;

function skyMaterial(mix: number) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(SUNSET.top) },
      uMiddle: { value: new THREE.Color(SUNSET.middle) },
      uHorizon: { value: new THREE.Color(SUNSET.horizon) },
      uGlow: { value: new THREE.Color(SUNSET.glow) },
      uPaper: { value: new THREE.Color(PAPER) },
      uSun: { value: SUN_DIRECTION.clone() },
      uCloudTop: { value: new THREE.Color(CLOUDED.top) },
      uCloudHorizon: { value: new THREE.Color(CLOUDED.horizon) },
      uMix: { value: mix },
      uGrey: { value: 0 },
      uFlash: { value: 0 },
    },
  });
}

/**
 * The sky dome. `follow` fades it in from the paper as the building rises (and back when it folds)
 * and clouds it over with Jamshedpur's weather; without it the sky is always the clear sunset,
 * which is what the reflections are made from.
 */
export function Sky({ follow = false }: { follow?: boolean }) {
  const material = useMemo(() => skyMaterial(follow ? 0 : 1), [follow]);
  const mesh = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    if (!follow || !mesh.current) return;
    const u = mesh.current.material.uniforms;
    u.uMix.value = THREE.MathUtils.smoothstep(clocks.build, 0, 1.8);
    u.uGrey.value = fx.grey;
    u.uFlash.value = fx.flash;
  });
  return (
    <mesh ref={mesh} material={material} frustumCulled={false} renderOrder={-1}>
      {/* Big enough to hold the land and the skyline, inside the camera's far plane even on phones. */}
      <sphereGeometry args={[150, 32, 16]} />
    </mesh>
  );
}
