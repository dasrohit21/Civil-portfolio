"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clocks, fx } from "@/lib/store";
import { SKY_DROP, daylight } from "./daylight";

const PAPER = "#f3eee3";

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
  uniform vec3 uCloudTop;
  uniform vec3 uCloudHorizon;
  uniform vec3 uCloudLit;
  uniform vec3 uCloudShade;
  uniform vec3 uSun;
  uniform vec3 uMoon;
  uniform float uSunShow;
  uniform float uMoonShow;
  uniform float uMoonAge;
  uniform float uMoonFlip;
  uniform float uStars;
  uniform float uCover;
  uniform vec2 uDrift;
  uniform float uTime;
  uniform float uDrop;
  uniform float uMix;
  uniform float uGrey;
  uniform float uFlash;
  varying vec3 vDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }

  void main() {
    vec3 d = normalize(vDir);
    // Heights are measured from the sky's own horizon, where the land ends behind the city.
    float h = d.y + uDrop;
    vec3 sky = mix(uHorizon, uMiddle, smoothstep(0.0, 0.08, h));
    sky = mix(sky, uTop, smoothstep(0.06, 0.4, h));
    float above = smoothstep(-0.005, 0.01, h);

    // Stars, twinkling, on clear nights
    vec3 cell = floor(d * 260.0);
    float s = hash3(cell);
    float star = step(0.993, s) * smoothstep(0.42, 0.1, length(fract(d * 260.0) - 0.5));
    sky += vec3(0.9, 0.93, 1.0) * star * (0.6 + 0.4 * sin(uTime * 2.0 + s * 80.0)) * uStars * smoothstep(0.01, 0.06, h);

    // The sun: a warm disc and its glow
    float toSun = dot(d, uSun);
    sky += uGlow * pow(max(toSun, 0.0), 12.0) * 0.55 * (1.0 - uGrey);
    float disc = smoothstep(0.99955, 0.99968, toSun);
    sky = mix(sky, mix(uGlow, vec3(1.0, 0.98, 0.92), 0.5) * 1.15, disc * uSunShow * above);

    // The moon, lit as tonight's phase: the sun lights it from the side, then from behind us
    vec3 right = normalize(cross(uMoon, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, uMoon);
    float r = 0.024;
    vec2 m = vec2(dot(d, right), dot(d, up)) / r;
    float inMoon = smoothstep(1.0, 0.94, length(m)) * step(0.0, dot(d, uMoon));
    float phase = uMoonAge * 6.2831853;
    vec3 n = vec3(m * uMoonFlip, sqrt(max(0.0, 1.0 - dot(m, m))));
    float lit = smoothstep(-0.04, 0.08, dot(n, vec3(sin(phase), 0.0, -cos(phase))));
    float maria = 0.82 + 0.18 * noise(m * 2.6 + 3.0);
    vec3 moon = vec3(0.96, 0.94, 0.86) * maria * (0.07 + 0.93 * lit);
    sky += vec3(0.55, 0.62, 0.8) * pow(max(dot(d, uMoon), 0.0), 900.0) * 0.35 * uMoonShow;
    sky = mix(sky, moon, inMoon * uMoonShow * above);

    // Clouds drifting with the wind, as many as the weather says
    vec2 uv = d.xz / (max(h, 0.0) + 0.035) * 0.32 + uDrift;
    float c = fbm(uv);
    float t = mix(0.78, 0.28, uCover);
    float density = smoothstep(t, t + 0.2, c) * smoothstep(0.0, 0.03, h);
    vec3 cloud = mix(uCloudLit, uCloudShade, smoothstep(t + 0.05, t + 0.45, c));
    cloud += uGlow * pow(max(toSun, 0.0), 6.0) * 0.35 * uSunShow;
    sky = mix(sky, cloud, density * 0.95);

    vec3 clouded = mix(uCloudHorizon, uCloudTop, smoothstep(0.0, 0.5, h));
    sky = mix(sky, clouded, uGrey);
    sky += vec3(0.75, 0.8, 1.0) * uFlash;
    gl_FragColor = vec4(mix(uPaper, sky, uMix), 1.0);
    #include <colorspace_fragment>
  }
`;

function skyMaterial(mix: number) {
  const p = daylight.palette;
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: p.top.clone() },
      uMiddle: { value: p.middle.clone() },
      uHorizon: { value: p.horizon.clone() },
      uGlow: { value: p.glow.clone() },
      uPaper: { value: new THREE.Color(PAPER) },
      uCloudTop: { value: p.cloudedTop.clone() },
      uCloudHorizon: { value: p.cloudedHorizon.clone() },
      uCloudLit: { value: p.cloudLit.clone() },
      uCloudShade: { value: p.cloudShade.clone() },
      uSun: { value: daylight.sunDir.clone() },
      uMoon: { value: daylight.moonDir.clone() },
      uSunShow: { value: daylight.sunShow },
      uMoonShow: { value: daylight.moonShow },
      uMoonAge: { value: daylight.moonAge },
      uMoonFlip: { value: daylight.moonFlip },
      uStars: { value: daylight.night },
      uCover: { value: daylight.cover },
      uDrift: { value: daylight.drift.clone() },
      uTime: { value: 0 },
      uDrop: { value: SKY_DROP },
      uMix: { value: mix },
      uGrey: { value: fx.grey },
      uFlash: { value: 0 },
    },
  });
}

/**
 * The sky dome. `follow` fades it in from the paper as the building rises (and back when it folds),
 * and follows the visitor's clock and weather every frame: the sun or the moon in tonight's phase,
 * stars, and clouds on the wind. Without it the sky is drawn once, as it is now, for the
 * reflections (the Scene draws it again when the sky has changed enough to show).
 */
export function Sky({ follow = false }: { follow?: boolean }) {
  const material = useMemo(() => skyMaterial(follow ? 0 : 1), [follow]);
  const mesh = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((state) => {
    if (!follow || !mesh.current) return;
    const u = mesh.current.material.uniforms;
    const p = daylight.palette;
    u.uMix.value = THREE.MathUtils.smoothstep(clocks.build, 0, 1.8);
    u.uTop.value.copy(p.top);
    u.uMiddle.value.copy(p.middle);
    u.uHorizon.value.copy(p.horizon);
    u.uGlow.value.copy(p.glow);
    u.uCloudTop.value.copy(p.cloudedTop);
    u.uCloudHorizon.value.copy(p.cloudedHorizon);
    u.uCloudLit.value.copy(p.cloudLit);
    u.uCloudShade.value.copy(p.cloudShade);
    u.uSun.value.copy(daylight.sunDir);
    u.uMoon.value.copy(daylight.moonDir);
    u.uSunShow.value = daylight.sunShow * (1 - 0.85 * fx.grey);
    u.uMoonShow.value = daylight.moonShow * (1 - fx.grey);
    u.uMoonAge.value = daylight.moonAge;
    u.uMoonFlip.value = daylight.moonFlip;
    u.uStars.value = daylight.night * (1 - daylight.cover) * (1 - fx.grey);
    u.uCover.value = daylight.cover;
    u.uDrift.value.copy(daylight.drift);
    u.uTime.value = state.clock.elapsedTime;
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
