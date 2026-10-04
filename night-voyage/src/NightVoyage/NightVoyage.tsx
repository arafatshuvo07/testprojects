import { loadFont } from "@remotion/fonts";
import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  staticFile,
  useVideoConfig,
} from "remotion";
import * as THREE from "three";
import { Beams } from "./Beams";
import { CameraRig } from "./CameraRig";
import { Coast } from "./Coast";
import { Ocean } from "./Ocean";
import { FOG_COLOR, MOON_DIR, SHIP_HEADING, shipForward, shipPositionAt } from "./scene";
import { Ship } from "./Ship";

const fontFamily = "Inter";
loadFont({ family: fontFamily, url: staticFile("fonts/inter-latin-300-normal.woff2"), weight: "300" });
loadFont({ family: fontFamily, url: staticFile("fonts/inter-latin-400-normal.woff2"), weight: "400" });

export type NightVoyageProps = {
  readonly location: string;
  readonly timestamp: string;
};

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const skyFragment = /* glsl */ `
  uniform vec3 uFogColor;
  uniform vec3 uMoonDir;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 col = mix(uFogColor * 1.1, vec3(0.06, 0.08, 0.1), pow(h, 0.45));
    col += vec3(0.5, 0.55, 0.58) * pow(max(dot(vDir, uMoonDir), 0.0), 12.0) * 0.4;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const Sky: React.FC = () => {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uFogColor: { value: FOG_COLOR.clone() },
          uMoonDir: { value: MOON_DIR.clone() },
        },
      }),
    [],
  );
  return (
    <mesh material={material} renderOrder={-1}>
      <sphereGeometry args={[7500, 32, 16]} />
    </mesh>
  );
};

// Tiny far-off fishing boats near the headland.
const DistantBoats: React.FC = () => (
  <>
    {[
      [-35, -372],
      [-14, -380],
      [130, -350],
    ].map(([x, z]) => (
      <group key={`${x}`} position={[x, 0, z]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.2, 1, 3]} />
          <meshStandardMaterial color="#c9d0d4" emissive="#58606a" />
        </mesh>
        <mesh position={[0, 1.6, 0]}>
          <sphereGeometry args={[0.35, 8, 6]} />
          <meshBasicMaterial color="#fff4dc" toneMapped={false} />
        </mesh>
      </group>
    ))}
  </>
);

export const NightVoyage: React.FC<NightVoyageProps> = ({ location, timestamp }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const progress = frame / (durationInFrames - 1);

  const shipPos = shipPositionAt(t);

  // Slow documentary aerial: drifting push-in with a gentle handheld float.
  const ease = Easing.inOut(Easing.sin)(progress);
  const offset = new THREE.Vector3(
    THREE.MathUtils.lerp(70, 52, ease),
    THREE.MathUtils.lerp(160, 146, ease),
    THREE.MathUtils.lerp(455, 405, ease),
  );
  const float = new THREE.Vector3(
    Math.sin(t * 0.63) * 0.7 + Math.sin(t * 1.7 + 2) * 0.15,
    Math.sin(t * 0.81 + 1) * 0.5,
    Math.sin(t * 0.47 + 3) * 0.6,
  );
  const camPos = shipPos.clone().add(offset).add(float);
  const target = shipPos
    .clone()
    .add(shipForward.clone().multiplyScalar(THREE.MathUtils.lerp(80, 72, ease)))
    .add(new THREE.Vector3(Math.sin(t * 0.55) * 0.6, 0, 0));
  const roll = Math.sin(t * 0.5 + 0.4) * 0.004;

  const fadeIn = interpolate(frame, [0, 1.2 * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.33, 0, 0.2, 1),
  });
  const fadeOut = interpolate(frame, [durationInFrames - 0.8 * fps, durationInFrames - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ThreeCanvas width={width} height={height} flat linear={false} camera={{ fov: 18, near: 1, far: 9000 }}>
        <CameraRig position={camPos} target={target} roll={roll} fov={18} />
        <ambientLight intensity={0.35} color="#8394a3" />
        <hemisphereLight args={["#56677a", "#05080a", 0.6]} />
        <directionalLight
          position={MOON_DIR.clone().multiplyScalar(300).toArray()}
          intensity={1.6}
          color="#cbd8e4"
        />
        <Sky />
        <Coast />
        <Ocean time={t} shipPos={shipPos} cameraXZ={[camPos.x, camPos.z]} />
        <DistantBoats />
        <group
          position={[shipPos.x, Math.sin(t * 1.1) * 0.05, shipPos.z]}
          rotation={[Math.sin(t * 0.9) * 0.006, SHIP_HEADING, Math.sin(t * 0.7 + 1) * 0.009]}
        >
          <Ship />
          <Beams time={t} sway={Math.sin(t * 0.45) * 0.05} />
        </group>
      </ThreeCanvas>

      {/* lens & grade */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 75% 70% at 50% 55%, rgba(0,0,0,0) 45%, rgba(0,6,10,0.55) 100%)",
        }}
      />
      <AbsoluteFill style={{ backgroundColor: "rgba(20,40,50,0.08)", mixBlendMode: "soft-light" }} />
      <AbsoluteFill style={{ opacity: 0.13, mixBlendMode: "overlay" }}>
        <svg width={width} height={height}>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </AbsoluteFill>

      {/* documentary caption */}
      <Interactive.Div
        name="Caption"
        style={{
          position: "absolute",
          left: 120,
          bottom: 130,
          color: "rgba(232,238,240,0.88)",
          fontFamily,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          opacity: interpolate(frame, [1.6 * fps, 2.8 * fps, 7.6 * fps, 8.6 * fps], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.45, 0, 0.55, 1),
          }),
          translate: interpolate(frame, [1.6 * fps, 3.2 * fps], ["0px 10px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 300, letterSpacing: "0.42em" }}>{location}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 46, height: 1, backgroundColor: "rgba(232,238,240,0.7)" }} />
          <div style={{ fontSize: 19, fontWeight: 400, letterSpacing: "0.3em", opacity: 0.8 }}>{timestamp}</div>
        </div>
      </Interactive.Div>

      {/* cinematic letterbox, ~2:1 like the reference */}
      <AbsoluteFill style={{ justifyContent: "space-between" }}>
        <div style={{ height: 60, backgroundColor: "#000" }} />
        <div style={{ height: 60, backgroundColor: "#000" }} />
      </AbsoluteFill>

      <AbsoluteFill style={{ backgroundColor: "#000", opacity: Math.max(fadeIn, fadeOut) }} />
    </AbsoluteFill>
  );
};
