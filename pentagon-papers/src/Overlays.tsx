import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useVideoConfig } from "remotion";
import meta from "./imageMeta.json";
import { AMBER, INK, MONO, RED, SERIF, TYPE } from "./fonts";
import type { Overlay } from "./shots";

const META = meta as Record<string, { w: number; h: number }>;
const out = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// t = absolute narration time in seconds; end = time this shot ends
type P = { t: number; end: number };

const fade = (t: number, a: number, d = 0.45) => interpolate(t, [a, a + d], [0, 1], { ...clamp, easing: out });
const fadeOutAtEnd = (t: number, end: number) => interpolate(t, [end - 0.25, end], [1, 0], clamp);

// Characters revealed as if typed, starting at `a`, `cps` chars per second.
const typed = (s: string, t: number, a: number, cps = 28) =>
  s.slice(0, Math.max(0, Math.floor((t - a) * cps)));

const Stamp: React.FC<{ text: string; t: number; at: number; size?: number }> = ({ text, t, at, size = 150 }) => {
  if (t < at) return null;
  const k = interpolate(t, [at, at + 0.12], [0, 1], clamp);
  return (
    <div
      style={{
        fontFamily: TYPE,
        fontSize: size,
        color: RED,
        border: `10px solid ${RED}`,
        padding: "6px 42px 0",
        textTransform: "uppercase",
        letterSpacing: 10,
        opacity: interpolate(k, [0, 1], [0, 0.88]),
        scale: String(interpolate(k, [0, 1], [1.7, 1])),
        rotate: "-7deg",
        mixBlendMode: "screen",
        filter: "url(#ink)",
      }}
    >
      {text}
    </div>
  );
};

const Counter: React.FC<P> = ({ t, end }) => {
  const pages = Math.round(interpolate(t, [0.3, 1.3], [0, 7000], { ...clamp, easing: Easing.out(Easing.cubic) }));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fadeOutAtEnd(t, end) }}>
      <div style={{ display: "flex", gap: 140, alignItems: "flex-end", marginBottom: 40 }}>
        <div style={{ textAlign: "center", opacity: fade(t, 0.3, 0.2) }}>
          <div style={{ fontFamily: SERIF, fontSize: 210, color: INK, lineHeight: 1 }}>{pages.toLocaleString("en-US")}</div>
          <div style={{ fontFamily: MONO, fontSize: 30, color: INK, letterSpacing: 14, marginTop: 18 }}>PAGES</div>
        </div>
        <div style={{ textAlign: "center", opacity: fade(t, 1.65, 0.25) }}>
          <div style={{ fontFamily: SERIF, fontSize: 210, color: INK, lineHeight: 1 }}>47</div>
          <div style={{ fontFamily: MONO, fontSize: 30, color: INK, letterSpacing: 14, marginTop: 18 }}>VOLUMES</div>
        </div>
      </div>
      <div style={{ position: "absolute", top: "63%" }}>
        <Stamp text="Top Secret" t={t} at={3.1} size={120} />
      </div>
    </AbsoluteFill>
  );
};

const Year: React.FC<P & { text: string; at: number }> = ({ t, end, text, at }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fadeOutAtEnd(t, end) }}>
    <div
      style={{
        fontFamily: SERIF,
        fontSize: 300,
        color: INK,
        letterSpacing: interpolate(t, [at, end], [40, 70], clamp),
        opacity: fade(t, at, 0.6),
      }}
    >
      {text}
    </div>
    <div style={{ fontFamily: MONO, fontSize: 28, color: AMBER, letterSpacing: 10, opacity: fade(t, at + 1.2) }}>
      THE PENTAGON · ARLINGTON, VIRGINIA
    </div>
  </AbsoluteFill>
);

export const Label: React.FC<P & { title: string; sub?: string; at: number }> = ({ t, end, title, sub, at }) => {
  const k = fade(t, at, 0.6);
  return (
    <div
      style={{
        position: "absolute",
        left: 110,
        bottom: 120,
        opacity: k * fadeOutAtEnd(t, end),
        translate: `${interpolate(k, [0, 1], [-24, 0])}px 0px`,
      }}
    >
      <div style={{ width: interpolate(k, [0, 1], [0, 90]), height: 3, background: AMBER, marginBottom: 18 }} />
      <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 40, color: INK, letterSpacing: 5, textTransform: "uppercase", textShadow: "0 2px 18px rgba(0,0,0,0.9)" }}>
        {title}
      </div>
      {sub ? (
        <div style={{ fontFamily: MONO, fontSize: 26, color: "rgba(239,231,214,0.78)", letterSpacing: 2, marginTop: 8, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
};

const DateCard: React.FC<P & { text: string; place?: string; at: number }> = ({ t, end, text, place, at }) => (
  <div style={{ position: "absolute", left: 110, top: 110, opacity: fadeOutAtEnd(t, end) }}>
    <div style={{ fontFamily: TYPE, fontSize: 68, color: INK, textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
      {typed(text, t, at, 22)}
      <span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0 }}>_</span>
    </div>
    {place ? (
      <div style={{ fontFamily: MONO, fontSize: 26, color: AMBER, letterSpacing: 8, marginTop: 14, opacity: fade(t, at + 0.9) }}>
        {place.toUpperCase()}
      </div>
    ) : null}
  </div>
);

const PRESIDENTS = [
  { key: "truman", year: "1945", name: "Truman", x: 0.0 },
  { key: "eisenhower", year: "1953", name: "Eisenhower", x: 0.364 },
  { key: "kennedy", year: "1961", name: "Kennedy", x: 0.727 },
  { key: "johnson", year: "1963", name: "Johnson", x: 0.818 },
];

const Timeline: React.FC<P> = ({ t, end }) => {
  // the line is drawn while the narrator says "from 1945 to 1967"
  const a = 25.15;
  const b = 26.6;
  const prog = interpolate(t, [a, b], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const L = 220;
  const W = 1480;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #221d18 0%, #0a0806 80%)", opacity: fadeOutAtEnd(t, end) }}>
      <div style={{ position: "absolute", top: 120, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 24, color: AMBER, letterSpacing: 10, opacity: fade(t, 22.8) }}>
          OFFICE OF THE SECRETARY OF DEFENSE · VIETNAM TASK FORCE
        </div>
        <div style={{ fontFamily: TYPE, fontSize: 64, color: INK, marginTop: 26 }}>
          {typed("United States – Vietnam Relations", t, 23.0, 26)}
        </div>
      </div>
      {PRESIDENTS.map((p) => {
        const at = a + (b - a) * p.x;
        const k = fade(t, at, 0.4);
        const m = META[p.key];
        return (
          <div key={p.key} style={{ position: "absolute", left: L + W * p.x - 80, top: 330, width: 160, textAlign: "center", opacity: k, translate: `0px ${interpolate(k, [0, 1], [20, 0])}px` }}>
            <div style={{ width: 160, height: 200, overflow: "hidden", background: "#1b1814", boxShadow: "0 10px 40px rgba(0,0,0,0.7)" }}>
              {m ? (
                <Img src={staticFile(`img/${p.key}.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%", filter: "grayscale(1) contrast(1.1)" }} />
              ) : null}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 22, color: INK, marginTop: 14, letterSpacing: 2 }}>{p.name.toUpperCase()}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: L, top: 640, width: W * prog, height: 4, background: INK }} />
      {[...PRESIDENTS, { key: "end", year: "1967", name: "", x: 1 }].map((p) => {
        const at = a + (b - a) * p.x;
        const big = p.year === "1945" || p.year === "1967";
        return (
          <div key={p.year} style={{ position: "absolute", left: L + W * p.x - 100, top: 610, width: 200, textAlign: "center", opacity: fade(t, at, 0.25) }}>
            <div style={{ width: 4, height: 64, background: big ? AMBER : INK, margin: "0 auto" }} />
            <div style={{ fontFamily: SERIF, fontSize: big ? 84 : 46, color: big ? AMBER : INK, marginTop: 14 }}>{p.year}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", bottom: 110, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 26, color: "rgba(239,231,214,0.7)", letterSpacing: 6, opacity: fade(t, 26.7) }}>
        TWENTY-TWO YEARS · FOUR ADMINISTRATIONS
      </div>
    </AbsoluteFill>
  );
};

const Pages: React.FC<P & { from: number }> = ({ t, end, from }) => {
  const n = Math.round(interpolate(t, [from, end], [from > 50 ? 2400 : 6400, from > 50 ? 7000 : 7000], clamp));
  return (
    <div style={{ position: "absolute", right: 110, bottom: 110, textAlign: "right", opacity: fade(t, from + 0.2) * fadeOutAtEnd(t, end) }}>
      <div style={{ fontFamily: MONO, fontSize: 24, color: AMBER, letterSpacing: 8 }}>{from > 50 ? "PAGES COPIED" : "TOTAL"}</div>
      <div style={{ fontFamily: TYPE, fontSize: 96, color: INK }}>{n.toLocaleString("en-US")}</div>
    </div>
  );
};

const PAPERS = [
  "The Washington Post",
  "The Boston Globe",
  "St. Louis Post-Dispatch",
  "Chicago Sun-Times",
  "Los Angeles Times",
  "The Christian Science Monitor",
  "Newsday",
  "Knight Newspapers",
];

const Papers: React.FC<P> = ({ t, end }) => (
  <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 180, opacity: fadeOutAtEnd(t, end) }}>
    <div style={{ fontFamily: MONO, fontSize: 26, color: AMBER, letterSpacing: 8, marginBottom: 34, opacity: fade(t, 107.4) }}>
      JUNE 1971 · THE PAPERS SPREAD
    </div>
    {PAPERS.map((p, i) => {
      const at = 107.6 + i * 0.36;
      const k = fade(t, at, 0.35);
      return (
        <div key={p} style={{ fontFamily: SERIF, fontSize: 54, color: i === 0 ? INK : "rgba(239,231,214,0.85)", lineHeight: 1.22, opacity: k, translate: `${interpolate(k, [0, 1], [-30, 0])}px 0px` }}>
          {p}
        </div>
      );
    })}
  </AbsoluteFill>
);

const Ruling: React.FC<P> = ({ t, end }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fadeOutAtEnd(t, end) }}>
    <div style={{ textAlign: "center", marginTop: 80 }}>
      <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 64, color: INK, opacity: fade(t, 123.0) }}>
        New York Times Co. v. United States
      </div>
      <div style={{ display: "flex", gap: 90, justifyContent: "center", marginTop: 40, opacity: fade(t, 124.6) }}>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 200, color: INK, lineHeight: 1 }}>6</div>
          <div style={{ fontFamily: MONO, fontSize: 24, color: AMBER, letterSpacing: 6 }}>FOR THE PRESS</div>
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 200, color: "rgba(239,231,214,0.4)", lineHeight: 1 }}>–</div>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 200, color: "rgba(239,231,214,0.55)", lineHeight: 1 }}>3</div>
          <div style={{ fontFamily: MONO, fontSize: 24, color: "rgba(239,231,214,0.55)", letterSpacing: 6 }}>FOR THE GOVERNMENT</div>
        </div>
      </div>
    </div>
  </AbsoluteFill>
);

const Quote: React.FC<P & { text: string; source: string; start: number }> = ({ t, end, text, source, start }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 240px", opacity: fadeOutAtEnd(t, end) }}>
    <div style={{ fontFamily: SERIF, fontSize: 30, color: AMBER, letterSpacing: 8, marginBottom: 30, opacity: fade(t, start + 0.1) }}>
      PER CURIAM
    </div>
    <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 58, lineHeight: 1.35, color: INK, textAlign: "center", opacity: fade(t, start + 0.2, 0.9) }}>
      “{text}”
    </div>
    <div style={{ fontFamily: MONO, fontSize: 24, color: "rgba(239,231,214,0.65)", marginTop: 40, letterSpacing: 2, opacity: fade(t, start + 1.4) }}>
      {source}
    </div>
  </AbsoluteFill>
);

const Plumbers: React.FC<P> = ({ t, end }) => {
  const people = [
    { key: "hunt", name: "E. Howard Hunt", at: 140.3 },
    { key: "liddy", name: "G. Gordon Liddy", at: 140.55 },
  ];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fadeOutAtEnd(t, end) }}>
      <div style={{ fontFamily: MONO, fontSize: 26, color: AMBER, letterSpacing: 8, opacity: fade(t, 138.3) }}>
        WHITE HOUSE SPECIAL INVESTIGATIONS UNIT · 1971
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 120, color: INK, marginTop: 10, opacity: fade(t, 140.2, 0.3) }}>
        “The Plumbers”
      </div>
      <div style={{ display: "flex", gap: 60, marginTop: 40 }}>
        {people.map((p) =>
          META[p.key] ? (
            <div key={p.key} style={{ textAlign: "center", opacity: fade(t, p.at, 0.3) }}>
              <Img src={staticFile(`img/${p.key}.jpg`)} style={{ width: 200, height: 250, objectFit: "cover", objectPosition: "50% 20%", filter: "grayscale(1) contrast(1.1)", boxShadow: "0 10px 40px rgba(0,0,0,0.7)" }} />
              <div style={{ fontFamily: MONO, fontSize: 22, color: INK, marginTop: 12, letterSpacing: 2 }}>{p.name.toUpperCase()}</div>
            </div>
          ) : null,
        )}
      </div>
    </AbsoluteFill>
  );
};

const End: React.FC<P> = ({ t, end }) => (
  <AbsoluteFill style={{ background: "#070605", alignItems: "center", justifyContent: "center", opacity: interpolate(t, [end - 1.2, end], [1, 0], clamp) }}>
    <div style={{ fontFamily: SERIF, fontSize: 110, color: INK, letterSpacing: interpolate(t, [165.6, end], [14, 26], clamp), opacity: fade(t, 165.9, 1.2) }}>
      THE PENTAGON PAPERS
    </div>
    <div style={{ width: interpolate(fade(t, 166.6, 1), [0, 1], [0, 420]), height: 2, background: AMBER, margin: "34px 0" }} />
    <div style={{ fontFamily: MONO, fontSize: 28, color: "rgba(239,231,214,0.7)", letterSpacing: 12, opacity: fade(t, 167.0, 1) }}>
      1967 · 1971 · 1973
    </div>
  </AbsoluteFill>
);

export const OverlayLayer: React.FC<{ o: Overlay; t: number; start: number; end: number }> = ({ o, t, start, end }) => {
  const { fps } = useVideoConfig();
  void fps;
  switch (o.kind) {
    case "counter":
      return <Counter t={t} end={end} />;
    case "year":
      return <Year t={t} end={end} text={o.text} at={o.at} />;
    case "timeline":
      return <Timeline t={t} end={end} />;
    case "date":
      return <DateCard t={t} end={end} text={o.text} place={o.place} at={o.at} />;
    case "papers":
      return <Papers t={t} end={end} />;
    case "ruling":
      return <Ruling t={t} end={end} />;
    case "quote":
      return <Quote t={t} end={end} text={o.text} source={o.source} start={start} />;
    case "stamp":
      return (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <Stamp text={o.text} t={t} at={o.at} />
        </AbsoluteFill>
      );
    case "label":
      return <Label t={t} end={end} title={o.title} sub={o.sub} at={o.at} />;
    case "pages":
      return <Pages t={t} end={end} from={start} />;
    case "plumbers":
      return <Plumbers t={t} end={end} />;
    case "end":
      return <End t={t} end={end} />;
  }
};
