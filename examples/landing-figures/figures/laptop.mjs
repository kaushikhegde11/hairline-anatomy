// Projects: a laptop whose lid follows the pointer's height. The screen gives
// a dim blue light (WebGL, SVG tint without it) that grows as the lid opens
// and spills onto the keyboard.
//
// 01 hit     the pointer's height is read against the card, which never moves.
// 03 reach   the lid runs from nearly shut (18 deg) to leaning back (112 deg).
// 04 accent  the screen is the one lit part.
// 05 rest    half open.
// 08 clock   height is a position: Hairline's spring.
import { k, G, S, L, D, clamp, lerp, smooth01, roundRect, at as atF } from "./common.mjs";

const BASE = { x: -36, y: -24, w: 72, d: 48, r: 3.4 };
const BASE_H = 4;
const HINGE = [0, BASE.y + 1.2, BASE_H];       // the lid turns about this line (along x)
const LID = { w: 71, len: 46, t: 2.2, r: 3.2 };
const SCREEN = { hw: 32, near: 3.6, far: 42, r: 1.2 };
const OPEN = [18, 112];
const X = [1, 0, 0];
const openAt = (t) => (lerp(OPEN[0], OPEN[1], t) * Math.PI) / 180;

export function create(VIEW) {
  const lidPts = (a) => {
    const dir = [0, Math.cos(a), Math.sin(a)];
    return [-LID.w / 2, LID.w / 2].flatMap((x) => [0, LID.len].map((l) => [x, HINGE[1] + dir[1] * l, HINGE[2] + dir[2] * l]));
  };
  const P = k.fitProjection([...k.boxCorners(BASE, 0, BASE_H), ...lidPts(openAt(0)), ...lidPts(openAt(1)), ...lidPts(Math.PI / 2)], VIEW[0], VIEW[1], { pad: 40, azimuth: 40 });
  const at = (p) => k.iso(p, P);
  const top = BASE_H;

  function base() {
    const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(BASE, -2), -1, 1, P)}"/>`];
    out.push(S(k.slabOf(BASE, 0, BASE_H, P, 6, 0.6), { tone: "mid", inner: L(k.sideSeam(BASE, 1.4, P, 6), { tone: "faint" }) }));
    // keyboard well and keys
    const well = { x: -32, y: -20.5, w: 64, d: 24.5, r: 1.6 };
    out.push(L(k.planOutline(well, top, P, 3), { tone: "lo" }));
    const keys = [];
    const rows = 5, cols = 13, kw = (well.w - 2.4) / cols, kd = (well.d - 2.4) / rows;
    for (let r = 0; r < rows; r++) {
      if (r === rows - 1) {
        const y = well.y + 1.2 + r * kd;
        const spans = [[0, 2], [2, 4], [4, 9], [9, 11], [11, 13]];
        for (const [c0, c1] of spans) keys.push(k.planOutline({ x: well.x + 1.2 + c0 * kw + 0.35, y: y + 0.35, w: (c1 - c0) * kw - 0.7, d: kd - 0.7, r: 0.6 }, top, P, 2));
        continue;
      }
      for (let c = 0; c < cols; c++) {
        const x = well.x + 1.2 + c * kw, y = well.y + 1.2 + r * kd;
        keys.push(k.planOutline({ x: x + 0.35, y: y + 0.35, w: kw - 0.7, d: kd - 0.7, r: 0.6 }, top, P, 2));
      }
    }
    out.push(L(keys.join(""), { tone: "lo" }));
    // trackpad and palm-rest seam
    out.push(L(k.planOutline({ x: -12, y: 7, w: 24, d: 13.5, r: 1.4 }, top, P, 3), { tone: "mid" }));
    // ports on the right side, a status dot on the front lip
    const side = BASE.x + BASE.w;
    const slot = (y0, y1) => k.pathOf([[side, y0, 1.6], [side, y1, 1.6], [side, y1, 2.6], [side, y0, 2.6]].map(at), true);
    out.push(L(slot(-14, -10) + slot(-8, -4), { tone: "lo" }));
    out.push(D([at([side, 4, 2.1])], { size: 0.45, tone: "lo" }));
    // hinge barrel along the back edge
    const hingeF = G.frameOf([-24, HINGE[1], HINGE[2]], X, [0, 1, 0], [0, 0, 1]);
    out.push(S(G.disc(0, 48, 1.9, hingeF, P), { tone: "mid" }));
    return out.join("");
  }

  function lid(t) {
    const a = openAt(t);
    const dir = [0, Math.cos(a), Math.sin(a)];
    const n = [0, Math.sin(a), -Math.cos(a)];                // inner face normal
    const centre = HINGE.map((h, i) => h + dir[i] * LID.len / 2);
    const LF = G.frameOf(centre, n, X, dir);
    const out = [S(G.prismOf(LF, roundRect(LID.w, LID.len, LID.r, 4), -LID.t, 0, P), { tone: "mid" })];
    const V = [Math.cos(40 * Math.PI / 180) * Math.cos(Math.PI / 6), Math.sin(40 * Math.PI / 180) * Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)];
    const facing = n[0] * V[0] + n[1] * V[1] + n[2] * V[2];
    if (facing > 0.02) {
      const sc = (SCREEN.near + SCREEN.far) / 2 - LID.len / 2;
      const scr = roundRect(SCREEN.hw * 2, SCREEN.far - SCREEN.near, SCREEN.r, 3).map(([u, v]) => at(atF(LF, u, v + sc, 0.01)));
      out.push(`<path class="hla-screen" d="${k.pathOf(scr, true)}"/>`);
      out.push(L(k.pathOf(scr, true), { tone: "lit" }));
      out.push(D([at(atF(LF, 0, LID.len / 2 - 2, 0.01))], { size: 0.5, tone: "lo" }));
    }
    return out.join("");
  }

  return {
    name: "laptop",
    P,
    rest: 0.5,
    label: "A laptop with a dim blue screen. Move the pointer up to open the lid and down to close it; the screen's light grows as it opens.",
    groups: [
      { id: "base", markup: base() },
      { id: "lid", draw: lid },
    ],
    target: (pt) => clamp((VIEW[1] * 0.86 - pt[1]) / (VIEW[1] * 0.72), 0, 1),
    glow: {
      kind: "screen",
      hinge: HINGE,
      screen: [SCREEN.hw, SCREEN.near, SCREEN.far, SCREEN.r],
      deck: [BASE.w / 2 - 0.8, BASE.y + BASE.d - 0.8, BASE.y + 0.8, BASE_H],
      lidT: LID.t,
      values: (t) => { const a = openAt(t); return { uOpen: a, uBright: smooth01((a * 180 / Math.PI - 40) / 50) * 0.85 + 0.15 }; },
    },
  };
}
