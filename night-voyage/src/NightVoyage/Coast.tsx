import { useMemo } from "react";
import * as THREE from "three";
import { FOG_COLOR, FOG_GLSL, MOON_DIR, mulberry32 } from "./scene";

// Deterministic value noise for the terrain heightfield.
const makeNoise = (seed: number) => {
  const rand = mulberry32(seed);
  const perm = new Float32Array(512 * 512);
  for (let i = 0; i < perm.length; i++) perm[i] = rand();
  const at = (x: number, y: number) =>
    perm[(((y % 512) + 512) % 512) * 512 + (((x % 512) + 512) % 512)];
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
};

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
};

export const buildTerrain = () => {
  const noise = makeNoise(7);
  const fbm = (x: number, y: number) => {
    let sum = 0;
    let amp = 0.5;
    let f = 1;
    for (let o = 0; o < 6; o++) {
      sum += amp * noise(x * f, y * f);
      f *= 2.03;
      amp *= 0.5;
    }
    return sum;
  };
  // ridged variant gives mountain spurs running down to the sea
  const ridge = (x: number, y: number) => {
    let sum = 0;
    let amp = 0.5;
    let f = 1;
    for (let o = 0; o < 5; o++) {
      const n = 1 - Math.abs(noise(x * f, y * f) * 2 - 1);
      sum += amp * n * n;
      f *= 2.1;
      amp *= 0.5;
    }
    return sum;
  };

  const coastZ = (x: number) =>
    -270 +
    70 * Math.sin(x * 0.0045 + 0.6) +
    35 * Math.sin(x * 0.013 + 2.0) +
    (fbm(x * 0.01, 3.3) - 0.5) * 60;

  const height = (x: number, z: number) => {
    const c = coastZ(x);
    const inland = c - z; // >0 on land
    const mask = smooth(-20, 45, inland);
    const mountains =
      ridge(x * 0.003, z * 0.003) * 300 + fbm(x * 0.012, z * 0.012) * 70;
    const rise = smooth(0, 110, inland);
    let h = mask * (16 + mountains * (0.35 + 0.65 * rise)) - 14;
    // a low flat headland reaching toward the ship
    const hx = (x + 70) / 210;
    const hz = (z - (c + 75)) / 85;
    const head = Math.exp(-(hx * hx + hz * hz) * 2.0);
    h = Math.max(h, head * 9 - 2 + fbm(x * 0.05, z * 0.05) * 3);
    return h;
  };

  const xs = 560;
  const zs = 380;
  const x0 = -3200;
  const x1 = 3200;
  const z0 = -180;
  const z1 = -5200;
  const pos = new Float32Array((xs + 1) * (zs + 1) * 3);
  let k = 0;
  for (let j = 0; j <= zs; j++) {
    // denser rows near the shore
    const tz = Math.pow(j / zs, 1.7);
    const z = z0 + (z1 - z0) * tz;
    for (let i = 0; i <= xs; i++) {
      const x = x0 + ((x1 - x0) * i) / xs;
      pos[k++] = x;
      pos[k++] = height(x, z);
      pos[k++] = z;
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < zs; j++) {
    for (let i = 0; i < xs; i++) {
      const a = j * (xs + 1) + i;
      const b = a + 1;
      const c = a + xs + 1;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
};

const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormal = normal;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uMoonDir;
  varying vec3 vWorld;
  varying vec3 vNormal;
  ${FOG_GLSL}
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.07; a *= 0.5; }
    return s;
  }
  void main() {
    vec3 n = normalize(vNormal);
    float diff = max(dot(n, uMoonDir), 0.0);
    float slope = 1.0 - n.y;
    vec3 base = vec3(0.012, 0.016, 0.018);
    // soft skylight from above plus a low key from the upper left carves the ridges
    float sky = 0.5 + 0.5 * n.y;
    float key = max(dot(n, normalize(vec3(-0.75, 0.55, 0.35))), 0.0);
    vec3 col = base * (0.35 + 0.6 * sky * sky + 1.6 * key * key + 0.9 * diff);
    col *= 0.7 + 0.6 * fbm(vWorld.xz * 0.02);
    float d = length(cameraPosition - vWorld);
    // pale mist pools in the valleys, ridges stay dark
    float patches = fbm(vWorld.xz * vec2(0.006, 0.011) + vec2(3.1, 7.7));
    float mist = (0.22 + 0.7 * smoothstep(0.32, 0.7, patches)) * exp(-max(vWorld.y, 0.0) / 220.0);
    float far = 1.0 - exp(-pow(max(d - 750.0, 0.0) * 0.0009, 1.5));
    col = mix(col, uFogColor * 1.7, clamp(max(mist, far * 0.85), 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export const Coast: React.FC = () => {
  const geometry = useMemo(buildTerrain, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uMoonDir: { value: MOON_DIR.clone() },
          uFogColor: { value: FOG_COLOR.clone() },
        },
      }),
    [],
  );
  return <mesh geometry={geometry} material={material} />;
};
