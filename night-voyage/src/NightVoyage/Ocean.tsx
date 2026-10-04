import { useMemo } from "react";
import * as THREE from "three";
import {
  BEAMS,
  BEAM_LENGTH,
  DEEP_WATER,
  FOG_COLOR,
  FOG_GLSL,
  MOON_DIR,
  SHIP_HEADING,
} from "./scene";

const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3 uMoonDir;
  uniform vec3 uDeep;
  uniform vec2 uShipPos;
  uniform vec2 uShipFwd;
  uniform vec3 uBeamO[2];
  uniform vec3 uBeamD[2];
  uniform float uBeamLen;
  varying vec3 vWorld;
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

  // Sum of directional gravity waves; small ones fade with distance to avoid shimmer.
  vec2 waveGrad(vec2 p, float t, float dist) {
    vec2 g = vec2(0.0);
    float wl = 9.0;
    float minWl = dist / 700.0; // ~4px on screen
    for (int i = 0; i < 28; i++) {
      float fi = float(i);
      float ang = 1.75 + (hash(vec2(fi, 3.7)) - 0.5) * 2.4;
      vec2 d = vec2(cos(ang), sin(ang));
      float k = 6.2831853 / wl;
      float w = sqrt(9.81 * k * 0.18);
      float ph = dot(d, p) * k + w * t + hash(vec2(fi, 9.1)) * 6.2831;
      float att = smoothstep(minWl, minWl * 3.0, wl);
      g += d * cos(ph) * 0.034 * att;
      wl *= 0.86;
    }
    return g;
  }

  float minWlCap(float d) { return d / 700.0; }

  void main() {
    vec2 p = vWorld.xz;
    vec3 toCam = cameraPosition - vWorld;
    float dist = length(toCam);
    vec3 V = toCam / dist;

    vec2 g = waveGrad(p, uTime, dist);
    // fine capillary chop
    float n1 = noise(p * 3.1 + vec2(uTime * 0.9, uTime * 0.3));
    float n2 = noise(p * 3.1 + vec2(0.37, 0.0) + vec2(uTime * 0.9, uTime * 0.3));
    float n3 = noise(p * 3.1 + vec2(0.0, 0.37) + vec2(uTime * 0.9, uTime * 0.3));
    g += vec2(n2 - n1, n3 - n1) * 0.2 * smoothstep(minWlCap(dist), minWlCap(dist) * 3.0, 0.32);

    // ship-local frame for wake
    vec2 rel = p - uShipPos;
    vec2 side = vec2(-uShipFwd.y, uShipFwd.x);
    float along = dot(rel, uShipFwd);
    float lat = dot(rel, side);
    float behindStern = -along - 16.0;
    float behindBow = 16.5 - along;

    float churn = 0.0;
    if (behindStern > -2.0) {
      float spread = 1.9 + behindStern * 0.07;
      churn = exp(-lat * lat / (2.0 * spread * spread)) * exp(-max(behindStern, 0.0) / 95.0);
      churn *= smoothstep(-2.0, 2.0, behindStern);
    }
    float arms = 0.0;
    if (behindBow > 0.0) {
      float armPos = 2.7 + behindBow * 0.33;
      float dd = abs(lat) - armPos;
      float wid = 0.5 + behindBow * 0.035;
      arms = exp(-dd * dd / (wid * wid)) * exp(-behindBow / 75.0);
      arms *= 0.55 + 0.45 * sin(behindBow * 1.3 - uTime * 2.0);
      arms *= smoothstep(0.0, 3.0, behindBow);
    }
    float foamN = noise(p * 0.9 + uTime * 0.4) * 0.6 + noise(p * 2.7 - uTime * 0.3) * 0.4;
    float foam = clamp(churn * (0.2 + 0.5 * foamN) * 0.3 + arms * 0.12 * foamN, 0.0, 1.0);
    g *= 1.0 + churn * 0.8 + arms * 0.6;

    vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
    vec3 R = reflect(-V, N);
    R.y = abs(R.y);

    float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
    float skyT = clamp(R.y, 0.0, 1.0);
    vec3 sky = mix(vec3(0.05, 0.075, 0.09), vec3(0.012, 0.025, 0.035), pow(skyT, 0.4));
    sky += vec3(0.45, 0.5, 0.52) * pow(max(dot(R, uMoonDir), 0.0), 10.0) * 0.25;

    vec3 col = mix(uDeep, sky, fres);

    // moon glitter path: broad sheen + sharp sparkles; rougher with distance
    float md = max(dot(R, uMoonDir), 0.0);
    float rough = smoothstep(300.0, 1400.0, dist);
    float sheen = pow(md, mix(320.0, 160.0, rough));
    float sparkle = pow(md, mix(2400.0, 900.0, rough));
    vec3 moonCol = vec3(0.86, 0.9, 0.94);
    col += moonCol * (sheen * 0.75 + sparkle * 4.0);

    // searchlight pools on the water
    for (int i = 0; i < 2; i++) {
      vec3 o = uBeamO[i];
      vec3 d = uBeamD[i];
      vec3 q = vec3(p.x, 0.0, p.y) - o;
      float t = clamp(dot(q, d), 0.0, uBeamLen);
      float dl = length(q - d * t);
      float r = 1.0 + t * 0.12;
      float glow = exp(-dl * dl / (r * r)) * pow(1.0 - t / uBeamLen, 1.4);
      float lit = 0.25 + 1.6 * pow(max(dot(N, normalize(-q + V * dist * 0.0 + vec3(0.0, 6.0, 0.0))), 0.0), 8.0);
      col += vec3(0.62, 0.7, 0.76) * glow * lit * 0.4;
    }

    // warm spill of the ship's lights around the hull
    float hullD = length(vec2(max(abs(along) - 15.0, 0.0), max(abs(lat) - 2.4, 0.0)));
    float spill = exp(-hullD / 5.0);
    float shimmer = 0.4 + 1.6 * pow(max(dot(R, normalize(vec3(-V.x, 0.35, -V.z))), 0.0), 6.0);
    col += vec3(0.95, 0.75, 0.45) * spill * shimmer * 0.03;

    vec3 foamCol = vec3(0.22, 0.26, 0.28) + vec3(0.12, 0.09, 0.05) * spill;
    col = mix(col, foamCol, foam * 0.75);

    col = mix(col, uFogColor, fogFactor(dist, 0.0));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

type Props = {
  readonly time: number;
  readonly shipPos: THREE.Vector3;
  readonly cameraXZ: [number, number];
};

export const Ocean: React.FC<Props> = ({ time, shipPos, cameraXZ }) => {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uMoonDir: { value: MOON_DIR.clone() },
        uDeep: { value: DEEP_WATER.clone() },
        uFogColor: { value: FOG_COLOR.clone() },
        uShipPos: { value: new THREE.Vector2() },
        uShipFwd: {
          value: new THREE.Vector2(
            -Math.sin(SHIP_HEADING),
            -Math.cos(SHIP_HEADING),
          ),
        },
        uBeamO: { value: [new THREE.Vector3(), new THREE.Vector3()] },
        uBeamD: { value: [new THREE.Vector3(), new THREE.Vector3()] },
        uBeamLen: { value: BEAM_LENGTH },
      },
    });
  }, []);

  // Uniforms are driven by the current frame only.
  material.uniforms.uTime.value = time;
  material.uniforms.uShipPos.value.set(shipPos.x, shipPos.z);
  const rot = new THREE.Matrix4().makeRotationY(SHIP_HEADING);
  BEAMS.forEach((b, i) => {
    material.uniforms.uBeamO.value[i]
      .copy(b.origin)
      .applyMatrix4(rot)
      .add(shipPos);
    material.uniforms.uBeamD.value[i].copy(b.dir).applyMatrix4(rot);
  });

  return (
    <mesh
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[cameraXZ[0], 0, cameraXZ[1] - 1500]}
    >
      <planeGeometry args={[7000, 7000, 1, 1]} />
    </mesh>
  );
};
