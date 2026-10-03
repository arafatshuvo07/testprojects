import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import meta from "./imageMeta.json";
import type { Motion } from "./shots";
import { MONO } from "./fonts";

type Meta = Record<string, { w: number; h: number }>;
const META = meta as Meta;

const ease = Easing.bezier(0.33, 0, 0.67, 1);

// Archival grade: lifted blacks, muted colour, slight warmth.
const GRADE = "saturate(0.55) sepia(0.18) contrast(1.08) brightness(0.92)";

const camera = (motion: Motion, p: number) => {
  // returns [scale, x%, y%]
  switch (motion) {
    case "in":
      return [interpolate(p, [0, 1], [1.04, 1.16]), 0, 0];
    case "out":
      return [interpolate(p, [0, 1], [1.18, 1.05]), 0, 0];
    case "left":
      return [1.14, interpolate(p, [0, 1], [3, -3]), 0];
    case "right":
      return [1.14, interpolate(p, [0, 1], [-3, 3]), 0];
    case "up":
      return [1.14, 0, interpolate(p, [0, 1], [3, -3])];
    case "down":
      return [1.14, 0, interpolate(p, [0, 1], [-3, 3])];
    default:
      return [interpolate(p, [0, 1], [1.03, 1.06]), 0, 0];
  }
};

export const Photo: React.FC<{
  img: string;
  motion: Motion;
  focus?: [number, number];
  duration: number; // frames
  dim?: number;
}> = ({ img, motion, focus = [50, 50], duration, dim = 0 }) => {
  const frame = useCurrentFrame();
  const p = ease(Math.min(1, Math.max(0, frame / Math.max(1, duration))));
  const [s, x, y] = camera(motion, p);
  const m = META[img];
  const isDoc = img.startsWith("doc_");

  if (!m) {
    return (
      <AbsoluteFill style={{ background: "#141210", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: MONO, color: "#5c554a", fontSize: 28, letterSpacing: 4 }}>
          [ ARCHIVE IMAGE · {img} ]
        </div>
      </AbsoluteFill>
    );
  }

  const src = staticFile(`img/${img}.jpg`);
  const aspect = m.w / m.h;

  // Documents: a sheet of paper on a dark desk, the camera drifting across it.
  if (isDoc && aspect < 1.2) {
    return (
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #2a2520 0%, #0d0b09 75%)" }}>
        <AbsoluteFill style={{ scale: String(s * 1.25), translate: `${x}% ${y + 18}%` }}>
          <Img
            src={src}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              height: "135%",
              translate: "-50% -50%",
              rotate: "-1.2deg",
              filter: "sepia(0.35) contrast(1.15) brightness(0.95)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.85)",
            }}
          />
        </AbsoluteFill>
        <AbsoluteFill style={{ background: `rgba(8,6,4,${dim})` }} />
      </AbsoluteFill>
    );
  }

  // Portrait-shaped photos: blurred plate behind, framed print in front.
  if (aspect < 1.25) {
    return (
      <AbsoluteFill style={{ background: "#0c0a08" }}>
        <Img
          src={src}
          style={{
            position: "absolute",
            inset: -80,
            width: "calc(100% + 160px)",
            height: "calc(100% + 160px)",
            objectFit: "cover",
            filter: `${GRADE} blur(38px) brightness(0.45)`,
            scale: String(s),
          }}
        />
        <AbsoluteFill style={{ scale: String(1 + (s - 1) * 0.6), translate: `${x * 0.6}% ${y * 0.6}%` }}>
          <Img
            src={src}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              height: "92%",
              translate: "-50% -50%",
              filter: GRADE,
              boxShadow: "0 30px 90px rgba(0,0,0,0.8)",
            }}
          />
        </AbsoluteFill>
        <AbsoluteFill style={{ background: `rgba(8,6,4,${dim})` }} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: "#0c0a08", overflow: "hidden" }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${focus[0]}% ${focus[1]}%`,
          filter: GRADE,
          scale: String(s),
          translate: `${x}% ${y}%`,
          transformOrigin: `${focus[0]}% ${focus[1]}%`,
        }}
      />
      <AbsoluteFill style={{ background: `rgba(8,6,4,${dim})` }} />
    </AbsoluteFill>
  );
};
