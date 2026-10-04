import { useMemo } from "react";
import * as THREE from "three";
import { BEAMS, BEAM_LENGTH } from "./scene";

const vertexShader = /* glsl */ `
  varying float vAlong;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    vAlong = 1.0 - uv.y; // 0 at the lamp, 1 at the far end
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uIntensity;
  uniform float uEdge;
  uniform float uTime;
  varying float vAlong;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    float facing = abs(dot(normalize(vN), normalize(vView)));
    float core = pow(facing, uEdge);
    float fall = pow(1.0 - vAlong, 2.1) * smoothstep(0.0, 0.015, vAlong);
    // slow drifting haze inside the beam
    float haze = 0.85 + 0.15 * sin(vAlong * 38.0 - uTime * 1.3) * sin(vAlong * 11.0 + uTime * 0.7);
    float a = core * fall * haze * uIntensity;
    gl_FragColor = vec4(vec3(0.78, 0.86, 0.93) * a, 1.0);
  }
`;

const makeMaterial = (intensity: number, edge: number) =>
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uIntensity: { value: intensity },
      uEdge: { value: edge },
      uTime: { value: 0 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

const coneGeometry = (radius: number) => {
  const g = new THREE.ConeGeometry(radius, BEAM_LENGTH, 48, 32, true);
  g.translate(0, -BEAM_LENGTH / 2, 0); // apex at origin, opening toward -Y
  return g;
};

type Props = {
  readonly time: number;
  readonly sway: number;
};

export const Beams: React.FC<Props> = ({ time, sway }) => {
  const layers = useMemo(
    () => [
      { geo: coneGeometry(7), mat: makeMaterial(0.55, 2.4) },
      { geo: coneGeometry(15), mat: makeMaterial(0.2, 1.4) },
    ],
    [],
  );
  layers.forEach((l) => {
    l.mat.uniforms.uTime.value = time;
  });

  return (
    <>
      {BEAMS.map((b, i) => {
        const dir = b.dir
          .clone()
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), sway * (i === 0 ? 1 : -1));
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
        return (
          <group key={i} position={b.origin} quaternion={q}>
            {layers.map((l, j) => (
              <mesh key={j} geometry={l.geo} material={l.mat} renderOrder={10} />
            ))}
          </group>
        );
      })}
    </>
  );
};
