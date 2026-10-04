import * as THREE from "three";

// World units are roughly metres / 8. The ship is ~33 units long.
export const SHIP_HEADING = 0.38; // radians, ship sails toward -Z, veering left
export const SHIP_SPEED = 3.2; // units per second

export const shipForward = new THREE.Vector3(
  -Math.sin(SHIP_HEADING),
  0,
  -Math.cos(SHIP_HEADING),
);

export const shipPositionAt = (t: number) =>
  shipForward.clone().multiplyScalar(SHIP_SPEED * t);

// Moon sits low, ahead and to the right, hidden behind the haze.
export const MOON_DIR = new THREE.Vector3(0.0, 0.12, -1).normalize();

export const FOG_COLOR = new THREE.Color("#28333a");
export const DEEP_WATER = new THREE.Color("#07121a");

// Bow searchlights in ship-local space (bow points toward -Z).
const beamDir = (side: -1 | 1) =>
  new THREE.Vector3(side * Math.cos(0.42), -0.06, -Math.sin(0.42)).normalize();

export const BEAMS = [
  { origin: new THREE.Vector3(-1.1, 5.4, -13.2), dir: beamDir(-1) },
  { origin: new THREE.Vector3(1.1, 5.4, -13.2), dir: beamDir(1) },
];
export const BEAM_LENGTH = 120;

// Shared GLSL fog so custom shaders match each other.
export const FOG_GLSL = /* glsl */ `
  uniform vec3 uFogColor;
  float fogFactor(float d, float h) {
    float f = 1.0 - exp(-pow(max(d - 420.0, 0.0) * 0.0011, 1.4));
    // valleys and the sea surface far away hold more mist
    f = max(f, (1.0 - exp(-max(d - 620.0, 0.0) * 0.003)) * exp(-max(h, 0.0) / 30.0) * 0.9);
    return clamp(f, 0.0, 1.0);
  }
`;

export const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
