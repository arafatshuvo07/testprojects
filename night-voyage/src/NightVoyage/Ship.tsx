import { useMemo } from "react";
import * as THREE from "three";
import { mulberry32 } from "./scene";

// Ship-local space: bow toward -Z, stern at +Z, waterline at y = 0.

const footprint = (hw: number, zStern: number, zFront: number, nose: number) => {
  const s = new THREE.Shape();
  const r = Math.min(0.6, hw * 0.3);
  s.moveTo(-hw + r, zStern);
  s.lineTo(hw - r, zStern);
  s.quadraticCurveTo(hw, zStern, hw, zStern - r);
  s.lineTo(hw, zFront + nose);
  s.bezierCurveTo(hw, zFront + nose * 0.45, hw * 0.35, zFront, 0, zFront);
  s.bezierCurveTo(-hw * 0.35, zFront, -hw, zFront + nose * 0.45, -hw, zFront + nose);
  s.lineTo(-hw, zStern - r);
  s.quadraticCurveTo(-hw, zStern, -hw + r, zStern);
  return s;
};

const slab = (shape: THREE.Shape, y0: number, h: number) => {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: false,
    curveSegments: 10,
  });
  g.rotateX(Math.PI / 2); // shape y -> world z, extrusion -> world -y
  g.translate(0, y0 + h, 0);
  return g;
};

// Window strip texture: rows of warm cabin lights with some dark cabins.
const windowTexture = (seed: number, cols: number, rows: number, litRatio: number) => {
  const rand = mulberry32(seed);
  const cw = 8;
  const ch = 16;
  const canvas = document.createElement("canvas");
  canvas.width = cols * cw;
  canvas.height = rows * ch;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#c9ced3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = rand() < litRatio;
      const warm = 200 + Math.floor(rand() * 55);
      ctx.fillStyle = lit
        ? `rgb(255, ${warm}, ${Math.floor(warm * 0.62)})`
        : rand() < 0.5
          ? "#2c3a48"
          : "#232a33";
      ctx.fillRect(c * cw + 1, r * ch + 4, cw - 2, ch - 8);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
};

type Deck = { y: number; h: number; hw: number; zs: number; zf: number; nose: number };

const HULL = { hw: 2.55, zs: 16, zf: -16.8, nose: 10 };

const DECKS: Deck[] = Array.from({ length: 7 }, (_, i) => ({
  y: 2.7 + i * 0.6,
  h: 0.6,
  hw: 2.45 - i * 0.025,
  zs: 15.6 - (i > 2 ? (i - 2) * 0.75 : 0),
  zf: -11.6 + i * 0.32,
  nose: 4.2,
}));

const TOP_Y = DECKS[DECKS.length - 1].y + DECKS[DECKS.length - 1].h;

const Strip: React.FC<{
  readonly from: number;
  readonly to: number;
  readonly x: number;
  readonly y: number;
  readonly h: number;
  readonly tex: THREE.Texture;
}> = ({ from, to, x, y, h, tex }) => {
  const len = Math.abs(to - from);
  return (
    <mesh position={[x, y, (from + to) / 2]} rotation={[0, x > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
      <planeGeometry args={[len, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
};

export const Ship: React.FC = () => {
  const parts = useMemo(() => {
    const white = new THREE.MeshStandardMaterial({
      color: "#e9ecef",
      roughness: 0.55,
      emissive: "#3a4046",
      emissiveIntensity: 0.55,
    });
    const navy = new THREE.MeshStandardMaterial({ color: "#16202c", roughness: 0.7 });
    const blue = new THREE.MeshStandardMaterial({
      color: "#2f5d9c",
      roughness: 0.6,
      emissive: "#16304f",
      emissiveIntensity: 0.6,
    });
    const funnelMat = new THREE.MeshStandardMaterial({
      color: "#f2c230",
      roughness: 0.45,
      emissive: "#a8780a",
      emissiveIntensity: 0.9,
    });
    const black = new THREE.MeshStandardMaterial({ color: "#0d0f12", roughness: 0.8 });
    const glass = new THREE.MeshStandardMaterial({
      color: "#1a2633",
      roughness: 0.2,
      emissive: "#5d6f82",
      emissiveIntensity: 0.35,
    });
    const pool = new THREE.MeshBasicMaterial({ color: "#6fd3e8", toneMapped: false });
    const boat = new THREE.MeshStandardMaterial({
      color: "#d9cdb4",
      emissive: "#3a3326",
      emissiveIntensity: 0.4,
    });

    const hullShape = footprint(HULL.hw, HULL.zs, HULL.zf, HULL.nose);
    const hullWhite = slab(hullShape, 0.55, 2.15);
    const hullDark = slab(hullShape, -0.6, 1.15);
    const decks = DECKS.map((d) => slab(footprint(d.hw, d.zs, d.zf, d.nose), d.y, d.h - 0.06));
    const lines = DECKS.map((d) =>
      slab(footprint(d.hw + 0.05, d.zs + 0.05, d.zf - 0.05, d.nose), d.y + d.h - 0.08, 0.08),
    );

    const deckTex = DECKS.map((_, i) => {
      const t = windowTexture(100 + i, 160, 1, i < 2 ? 0.82 : 0.6);
      return t;
    });
    const hullTex = windowTexture(42, 140, 2, 0.35);
    const sternTex = windowTexture(77, 44, 9, 0.45);

    return { white, navy, blue, funnelMat, black, glass, pool, boat, hullWhite, hullDark, decks, lines, deckTex, hullTex, sternTex };
  }, []);

  const lifeboats = Array.from({ length: 9 }, (_, i) => -6.5 + i * 1.75);

  return (
    <group>
      <mesh geometry={parts.hullDark} material={parts.navy} />
      <mesh geometry={parts.hullWhite} material={parts.white} />
      {parts.decks.map((g, i) => (
        <mesh key={`d${i}`} geometry={g} material={parts.white} />
      ))}
      {parts.lines.map((g, i) => (
        <mesh key={`l${i}`} geometry={g} material={i === DECKS.length - 1 ? parts.blue : parts.white} />
      ))}

      {/* cabin window rows */}
      {DECKS.map((d, i) => (
        <group key={`w${i}`}>
          <Strip from={d.zs - 0.6} to={d.zf + d.nose} x={d.hw + 0.012} y={d.y + d.h * 0.45} h={0.26} tex={parts.deckTex[i]} />
          <Strip from={d.zs - 0.6} to={d.zf + d.nose} x={-(d.hw + 0.012)} y={d.y + d.h * 0.45} h={0.26} tex={parts.deckTex[i]} />
        </group>
      ))}
      <Strip from={14.5} to={-11} x={HULL.hw + 0.012} y={1.75} h={0.5} tex={parts.hullTex} />
      <Strip from={14.5} to={-11} x={-(HULL.hw + 0.012)} y={1.75} h={0.5} tex={parts.hullTex} />

      {/* terraced stern windows */}
      <mesh position={[0, 4.4, 16.02]}>
        <planeGeometry args={[4.4, 3.4]} />
        <meshBasicMaterial map={parts.sternTex} toneMapped={false} />
      </mesh>

      {/* top deck: blue sun deck, pools, sports deck */}
      <mesh position={[0, TOP_Y + 0.01, 1.2]} rotation={[-Math.PI / 2, 0, 0]} material={parts.blue}>
        <planeGeometry args={[4.6, 24]} />
      </mesh>
      <mesh position={[0, TOP_Y + 0.04, -1.6]} rotation={[-Math.PI / 2, 0, 0]} material={parts.pool}>
        <planeGeometry args={[1.5, 2.6]} />
      </mesh>
      <mesh position={[0.9, TOP_Y + 0.04, 9.5]} rotation={[-Math.PI / 2, 0, 0]} material={parts.pool}>
        <planeGeometry args={[1.1, 1.5]} />
      </mesh>
      <mesh position={[0, TOP_Y + 0.12, -1.6]} material={parts.white}>
        <boxGeometry args={[2.4, 0.24, 3.6]} />
      </mesh>
      {/* glass-roofed atrium */}
      <mesh position={[0, TOP_Y + 0.3, 3.4]} material={parts.glass}>
        <boxGeometry args={[3.0, 0.6, 3.0]} />
      </mesh>
      <mesh position={[0, TOP_Y + 0.35, 12.2]} material={parts.white}>
        <boxGeometry args={[3.4, 0.7, 3.0]} />
      </mesh>

      {/* bridge with wings */}
      <mesh position={[0, TOP_Y - 0.25, -8.2]} material={parts.white}>
        <boxGeometry args={[5.9, 0.5, 1.6]} />
      </mesh>
      <mesh position={[0, TOP_Y - 0.2, -9.02]} material={parts.black}>
        <boxGeometry args={[5.4, 0.22, 0.02]} />
      </mesh>
      <mesh position={[0, TOP_Y + 0.35, -7.0]} material={parts.white}>
        <boxGeometry args={[3.2, 0.7, 2.6]} />
      </mesh>
      {/* mast */}
      <mesh position={[0, TOP_Y + 1.4, -6.6]} material={parts.white}>
        <cylinderGeometry args={[0.06, 0.08, 2.2, 8]} />
      </mesh>
      <mesh position={[0, TOP_Y + 2.55, -6.6]}>
        <sphereGeometry args={[0.13, 12, 8]} />
        <meshBasicMaterial color="#fff6e0" toneMapped={false} />
      </mesh>
      <mesh position={[2.95, TOP_Y - 0.1, -8.2]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshBasicMaterial color="#3dff7a" toneMapped={false} />
      </mesh>
      <mesh position={[-2.95, TOP_Y - 0.1, -8.2]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshBasicMaterial color="#ff3b3b" toneMapped={false} />
      </mesh>

      {/* funnel */}
      <group position={[0, TOP_Y, 6.6]} rotation={[0.12, 0, 0]}>
        <mesh position={[0, 1.4, 0]} scale={[0.6, 1, 1]} material={parts.funnelMat}>
          <cylinderGeometry args={[1.25, 1.45, 2.8, 28]} />
        </mesh>
        <mesh position={[0, 2.95, 0]} scale={[0.6, 1, 1]} material={parts.black}>
          <cylinderGeometry args={[1.18, 1.25, 0.32, 28]} />
        </mesh>
      </group>

      {/* lifeboats on both sides */}
      {lifeboats.map((z) => (
        <group key={`b${z}`}>
          <mesh position={[2.62, 3.05, z]} material={parts.boat}>
            <capsuleGeometry args={[0.24, 1.05, 4, 8]} />
          </mesh>
          <mesh position={[-2.62, 3.05, z]} material={parts.boat}>
            <capsuleGeometry args={[0.24, 1.05, 4, 8]} />
          </mesh>
        </group>
      ))}

      {/* searchlight lamps at the bow */}
      <mesh position={[-1.1, 5.4, -13.2]}>
        <sphereGeometry args={[0.22, 12, 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh position={[1.1, 5.4, -13.2]}>
        <sphereGeometry args={[0.22, 12, 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>

      {/* the ship's own deck and floodlights */}
      <pointLight position={[0, TOP_Y + 3, 2]} color="#ffd9a0" intensity={60} distance={22} decay={1.6} />
      <pointLight position={[0, TOP_Y + 2.5, 9.5]} color="#ffe2a8" intensity={45} distance={12} decay={1.6} />
      <pointLight position={[0, 5, 20]} color="#ffe6c0" intensity={50} distance={16} decay={1.6} />
    </group>
  );
};
