import React from "react";
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import "./fonts";
import { Photo } from "./Photo";
import { OverlayLayer } from "./Overlays";
import { SHOTS, TOTAL } from "./shots";

const XFADE = 5; // frames of soft cross-dissolve at each cut

const Shot: React.FC<{ i: number; from: number; dur: number }> = ({ i, from, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = SHOTS[i];
  const t = (frame + from) / fps;
  const start = s.t;
  const end = (from + dur) / fps;
  return (
    <AbsoluteFill style={{ opacity: i === 0 ? 1 : interpolate(frame, [0, XFADE], [0, 1], { extrapolateRight: "clamp" }) }}>
      <AbsoluteFill style={{ background: "#0a0806" }} />
      {s.img ? <Photo img={s.img} motion={s.motion} focus={s.focus} duration={dur} dim={s.dim} /> : null}
      {(s.overlays ?? []).map((o, k) => (
        <OverlayLayer key={k} o={o} t={t} start={start} end={end} />
      ))}
    </AbsoluteFill>
  );
};

// Film texture: animated grain, vignette, soft exposure flicker and gate weave.
const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = frame % 12;
  const flicker = 0.035 + 0.025 * Math.sin(frame * 1.7) * Math.sin(frame * 0.37);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -1.6 1.25" />
          <feComposite in="SourceGraphic" operator="in" />
        </filter>
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.72) 100%)" }} />
      <AbsoluteFill style={{ background: `rgba(255,236,200,${flicker})`, mixBlendMode: "overlay" }} />
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.16, mixBlendMode: "overlay" }}>
        <filter id={`grain${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Documentary: React.FC = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const weaveX = Math.sin(frame * 0.9) * 0.6 + Math.sin(frame * 2.3) * 0.3;
  const weaveY = Math.sin(frame * 1.3) * 0.5;
  const total = Math.round(TOTAL * fps);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ translate: `${weaveX}px ${weaveY}px`, scale: "1.004" }}>
        {SHOTS.map((s, i) => {
          const from = Math.round(s.t * fps);
          const next = i + 1 < SHOTS.length ? Math.round(SHOTS[i + 1].t * fps) : total;
          const dur = next - from + (i + 1 < SHOTS.length ? XFADE : 0);
          return (
            <Sequence key={i} from={from} durationInFrames={dur} premountFor={fps}>
              <Shot i={i} from={from} dur={dur} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
      <Film />
      <Audio src={staticFile("narration.mp3")} />
      <Audio src={staticFile("score.wav")} volume={0.9} />
    </AbsoluteFill>
  );
};
