export const NOISE_GLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

export const CORE_VERTEX = `
uniform float uTime;
uniform float uSpike;
uniform float uTwist;
uniform float uScale;
uniform float uJitter;
uniform float uVoice;
uniform float uSeed;

varying vec3 vViewPos;
varying vec3 vViewNormal;
varying vec3 vWorldPos;
varying float vNoise;

${NOISE_GLSL}

void main() {
  vec3 p = position;

  float angle = uTwist * (p.y * 0.9 + 0.1);
  float c = cos(angle);
  float s = sin(angle);
  p.xz = mat2(c, -s, s, c) * p.xz;

  vec3 n = normalize(normal);

  float freq = 2.0 + uSpike * 5.0;
  float spikeField = abs(
    sin(p.x * freq + uSeed * 6.2831) *
    sin(p.y * freq * 1.31 - uSeed * 4.1) *
    sin(p.z * freq * 0.83 + uSeed * 2.7)
  );
  float spike = pow(spikeField, 1.1 + uSpike * 2.4);
  float noise = snoise(p * (2.2 + uSpike * 3.4) + vec3(uSeed * 9.0, uTime * 0.18, -uTime * 0.14));
  float breathe = sin(uTime * 1.4 + p.y * 2.2) * 0.008;

  float disp = spike * (0.04 + uSpike * 0.7);
  disp += noise * (0.025 + uSpike * 0.09);
  disp += breathe;
  disp += uJitter * 0.035 * snoise(p * 14.0 + vec3(uTime * 0.7, uTime * 0.4, uSeed));
  disp += uVoice * 0.05 * sin(uTime * 18.0 + p.y * 9.0);

  p += n * disp;
  p *= uScale;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vViewPos = mv.xyz;
  vViewNormal = normalize(normalMatrix * n);
  vWorldPos = (modelMatrix * vec4(p, 1.0)).xyz;
  vNoise = noise;

  gl_Position = projectionMatrix * mv;
}
`;

export const CORE_FRAGMENT = `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uArousal;
uniform float uRough;
uniform float uGlow;
uniform float uVoice;

varying vec3 vViewPos;
varying vec3 vViewNormal;
varying vec3 vWorldPos;
varying float vNoise;

void main() {
  vec3 smoothN = normalize(vViewNormal);
  vec3 dx = dFdx(vViewPos);
  vec3 dy = dFdy(vViewPos);
  vec3 faceN = normalize(cross(dx, dy));
  vec3 V = normalize(-vViewPos);
  if (dot(faceN, V) < 0.0) faceN = -faceN;
  vec3 N = normalize(mix(smoothN, faceN, 0.2 + uArousal * 0.25));

  vec3 L1 = normalize(vec3(-0.45, 0.85, 0.55));
  vec3 L2 = normalize(vec3(0.75, 0.2, -0.65));
  vec3 L3 = normalize(vec3(0.0, -0.6, 0.8));

  float d1 = max(dot(N, L1), 0.0);
  float d2 = max(dot(N, L2), 0.0);
  float d3 = max(dot(N, L3), 0.0);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);

  vec3 H = normalize(L1 + V);
  float specPower = mix(10.0, 90.0, 1.0 - uRough);
  float spec = pow(max(dot(N, H), 0.0), specPower) * (0.18 + uArousal * 0.85);

  vec3 baseColor = mix(vec3(0.82, 0.79, 0.73), uColorA, 0.62);
  vec3 color = baseColor * (0.16 + d1 * 0.86);
  color += uColorB * d2 * 0.38;
  color += uColorA * d3 * 0.18;
  color += vec3(1.0, 0.95, 0.88) * spec * 0.9;
  color += uColorB * fres * (0.18 + uGlow * 0.7 + uVoice * 0.18);
  color += uColorA * uGlow * 0.14;
  color *= 0.92 + vNoise * 0.08;

  color = color / (color + vec3(1.0));
  gl_FragColor = vec4(pow(color, vec3(0.92)), 1.0);
}
`;

export const MEMBRANE_VERTEX = `
uniform float uTime;
uniform float uSpike;
uniform float uTwist;
uniform float uScale;
uniform float uJitter;
uniform float uSeed;

varying vec3 vViewPos;
varying vec3 vViewNormal;

${NOISE_GLSL}

void main() {
  vec3 p = position;

  float angle = uTwist * (p.y * 0.9 + 0.1) * 1.15;
  float c = cos(angle);
  float s = sin(angle);
  p.xz = mat2(c, -s, s, c) * p.xz;

  vec3 n = normalize(normal);
  float freq = 2.0 + uSpike * 4.0;
  float spike = pow(abs(
    sin(p.x * freq + uSeed * 5.1) *
    sin(p.y * freq * 1.2 - uSeed * 3.7) *
    sin(p.z * freq * 0.9 + uSeed * 2.2)
  ), 1.2 + uSpike * 2.0);
  float noise = snoise(p * (1.6 + uSpike * 2.5) + vec3(uSeed * 7.0, uTime * 0.12, -uTime * 0.1));
  float disp = spike * (0.05 + uSpike * 0.55) + noise * 0.04;
  disp += uJitter * 0.05 * snoise(p * 11.0 + vec3(uTime * 0.6, uSeed, 0.0));

  p += n * disp;
  p *= uScale * 1.08;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vViewPos = mv.xyz;
  vViewNormal = normalize(normalMatrix * n);
  gl_Position = projectionMatrix * mv;
}
`;

export const MEMBRANE_FRAGMENT = `
uniform vec3 uColorB;
uniform float uTension;
uniform float uOpacity;

varying vec3 vViewPos;
varying vec3 vViewNormal;

void main() {
  vec3 N = normalize(vViewNormal);
  vec3 V = normalize(-vViewPos);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.0);
  float alpha = (0.035 + fres * 0.17 + uTension * 0.055) * uOpacity;
  vec3 color = uColorB * (0.42 + fres * 0.85);
  gl_FragColor = vec4(color, alpha);
}
`;

export const RING_VERTEX = `
varying vec2 vUv;
varying vec3 vPos;

void main() {
  vUv = uv;
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const RING_FRAGMENT = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uPulse;

varying vec2 vUv;
varying vec3 vPos;

void main() {
  float angle = atan(vPos.y, vPos.x);
  float ticks = step(0.94, fract(angle / 6.2831853 * 72.0));
  float major = step(0.985, fract(angle / 6.2831853 * 12.0));
  float alpha = (0.10 + ticks * 0.18 + major * 0.25 + uPulse * 0.15) * uOpacity;
  gl_FragColor = vec4(uColor, alpha);
}
`;

export const GLOW_VERTEX = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const GLOW_FRAGMENT = `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  vec2 p = vUv - 0.5;
  float d = length(p);
  float a = 1.0 - smoothstep(0.02, 0.5, d);
  gl_FragColor = vec4(uColor, a * a * uOpacity);
}
`;
