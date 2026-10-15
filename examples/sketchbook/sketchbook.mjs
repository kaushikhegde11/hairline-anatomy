// Design: a spiral-bound sketchbook lying open on a self-healing cutting mat.
// Seven blank leaves turn about a real wire spiral. The pointer sweeps along the
// book, right to left, and the leaves follow it over: the one being turned stands
// up in the middle of the spread, the turned ones pile on the left cover, the
// rest wait on the right. While the pointer is over the card the whole book floats
// a little off the mat, its shadow softening beneath it.
//
// 01 hit     the sweep is read along a fixed line across the spread (`along`) and the
//            float from the pointer being over the card, never from a moving part.
// 03 reach   the sweep is clamped (all right / all left) and the float tops out at LIFT.
// 04 accent  the leaf being turned has the one lit outline; it moves to the next as it lands.
// 05 rest    one leaf turned, the next lifted part-way, the book flat on the mat.
// 08 clock   both the sweep and the float are positions: Hairline's spring (in live.js).
import { k, G, S, L, clamp, roundRect, at as atF } from "./common.mjs";
import { along } from "../../kit/live.mjs";
import { tubePieces, tubeSvg } from "../../kit/tube.mjs";

export const N = 7;                                    // leaves
const PW = 31, PH = 42, PT = 0.5;                      // leaf width from the spiral, height along it, thickness
const COVER = { w: PW + 2.2, h: PH + 2.2, t: 0.7, r: 1.4 };
const MAT = { w: 88, d: 72, t: 1.4, r: 3.5, mx: 5, my: 6 };    // size, corner radius, printed-area margins
const STRIP = 2.4;                                     // the ruler strip between the printed area and the mat edge
const TOP = MAT.t + COVER.t;                           // top face of the covers
const BASE = TOP + 0.5;                                // lowest leaf's hinge height
const LIFT = 3.4;                                      // how far the book floats at full hover
const Y = [0, 1, 0];
const RINGS = 12, RING_R = 1.9, WIRE_R = 0.42;
const ringY = (i) => -PH / 2 + 2.6 + (i * (PH - 5.2)) / (RINGS - 1);
const RING_Z = BASE + (PT * N) / 2 + 0.1;
const AZ = 40, EL = 30;
const VIEW_DIR = [Math.cos((AZ * Math.PI) / 180) * Math.cos((EL * Math.PI) / 180), Math.sin((AZ * Math.PI) / 180) * Math.cos((EL * Math.PI) / 180), Math.sin((EL * Math.PI) / 180)];
const BETA = Math.atan2(VIEW_DIR[2], VIEW_DIR[0]);     // the angle at which a leaf is seen edge-on
export const REST = 1.4 / N;

const ease = (s) => s * s * (3 - 2 * s);
const hingeZ = (j, e) => BASE + PT * (N - 1 - j) * (1 - e) + PT * j * e + 0.2;   // right pile: leaf 0 on top; left pile: leaf N-1 on top

export function create(VIEW) {
  const pts = [];
  for (const x of [-MAT.w / 2, MAT.w / 2]) for (const y of [-MAT.d / 2, MAT.d / 2]) pts.push([x, y, 0], [x, y, MAT.t]);
  for (let i = 0; i <= 12; i++) {
    const th = (i / 12) * Math.PI;
    for (const y of [-PH / 2, PH / 2]) pts.push([(PW + 0.4) * Math.cos(th), y, BASE + (PW + 0.4) * Math.sin(th) + PT * N + LIFT]);
  }
  const P = k.fitProjection(pts, VIEW[0], VIEW[1], { pad: 10, azimuth: AZ, elevation: EL });
  const at = (p) => k.iso(p, P);

  // the mat: painted once
  function base() {
    const out = [`<path class="iso-halo" d="${k.haloOf({ x: -MAT.w / 2, y: -MAT.d / 2, w: MAT.w, d: MAT.d, r: MAT.r }, -1, 1, P)}" style="filter:blur(5px)"/>`];
    out.push(S(k.slabOf({ x: -MAT.w / 2, y: -MAT.d / 2, w: MAT.w, d: MAT.d, r: MAT.r }, 0, MAT.t, P, 6, 0.4), { tone: "mid" }));
    const z = MAT.t + 0.01;
    const x0 = -MAT.w / 2 + MAT.mx, x1 = MAT.w / 2 - MAT.mx, y0 = -MAT.d / 2 + MAT.my, y1 = MAT.d / 2 - MAT.my;
    // the printed grid: every 5, a heavier line every 20, running edge to edge of the printed area
    const minor = [], major = [];
    for (let x = x0 + 5; x < x1 - 0.1; x += 5) (Math.abs(x) % 20 < 0.01 ? major : minor).push(k.lineOnTop([x, y0], [x, y1], z, P));
    for (let y = y0 + 5; y < y1 - 0.1; y += 5) (Math.abs(y) % 20 < 0.01 ? major : minor).push(k.lineOnTop([x0, y], [x1, y], z, P));
    out.push(L(minor.join(""), { tone: "faint" }), L(major.join(""), { tone: "lo" }));
    out.push(L(k.onTop([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z, P, true), { tone: "mid" }));
    // the ruler strip: an outer outline, with ticks hanging from the printed area's edge
    // (every 2.5; every 10 they run the strip's full width and end on the outer outline)
    out.push(L(k.onTop([[x0 - STRIP, y0 - STRIP], [x1 + STRIP, y0 - STRIP], [x1 + STRIP, y1 + STRIP], [x0 - STRIP, y1 + STRIP]], z, P, true), { tone: "lo" }));
    const ticks = [], long = [];
    for (let x = x0 + 2.5; x < x1 - 0.1; x += 2.5) {
      const l = Math.abs((x - x0) % 10) < 0.01 ? long : ticks, len = l === long ? STRIP : 1.1;
      l.push(k.lineOnTop([x, y0], [x, y0 - len], z, P), k.lineOnTop([x, y1], [x, y1 + len], z, P));
    }
    for (let y = y0 + 2.5; y < y1 - 0.1; y += 2.5) {
      const l = Math.abs((y - y0) % 10) < 0.01 ? long : ticks, len = l === long ? STRIP : 1.1;
      l.push(k.lineOnTop([x0, y], [x0 - len, y], z, P), k.lineOnTop([x1, y], [x1 + len, y], z, P));
    }
    out.push(L(ticks.join(""), { tone: "lo" }), L(long.join(""), { tone: "mid" }));
    // the angle guide in the front-left corner: two arcs and three rays, all ending on edges
    const cx = x0, cy = y1, arc = (r) => k.onTop(Array.from({ length: 25 }, (_, i) => [cx + r * Math.cos((i / 24) * (Math.PI / 2)), cy - r * Math.sin((i / 24) * (Math.PI / 2))]), z, P);
    const rays = [30, 45, 60].map((a) => k.lineOnTop([cx, cy], [cx + 22 * Math.cos((a * Math.PI) / 180), cy - 22 * Math.sin((a * Math.PI) / 180)], z, P));
    out.push(L(arc(12) + arc(22) + rays.join(""), { tone: "lo" }));
    return out.join("");
  }

  // the book's shadow on the mat: tight and dark when it lies flat, wider and softer as it floats
  function shadow(f) {
    const grow = f * 2.2;
    const plan = { x: -COVER.w - 0.3 - grow, y: -COVER.h / 2 - grow + 0.6, w: COVER.w * 2 + 0.6 + grow * 2, d: COVER.h + grow * 2, r: COVER.r + grow };
    return `<path class="iso-halo" d="${k.haloOf(plan, MAT.t, 0.2, P)}" style="filter:blur(${(3 + f * 4).toFixed(2)}px);opacity:${((0.85 - f * 0.3) * 0.7).toFixed(3)}"/>`;
  }

  // one half of every spiral ring as a real wire (a tube, with its own shine and shade).
  // Each loop climbs a little along the spiral, like a coil, not a flat circle.
  function wire(half, lift) {
    const pieces = [];
    for (let i = 0; i < RINGS; i++) {
      const a0 = half === "lower" ? Math.PI : 0;
      const pts3 = Array.from({ length: 25 }, (_, s) => {
        const t = s / 24, a = a0 + t * Math.PI;
        return [RING_R * Math.cos(a), ringY(i) + ((a / (Math.PI * 2)) * 1.1) - 0.55, RING_Z + lift + RING_R * Math.sin(a)];
      });
      pieces.push(...tubePieces(pts3, WIRE_R, P, { maxLength: 40, spacing: 0.5, caps: false }));
    }
    return pieces.map((p) => tubeSvg(p, { tone: "mid" })).join("");
  }

  // one leaf, p = how many leaves have been turned so far (fractional)
  function leaf(j, p, lit, lift) {
    const s = clamp(p - j, 0, 1), e = ease(s), th = Math.PI * e;
    const d = [Math.cos(th), 0, Math.sin(th)], n = [-Math.sin(th), 0, Math.cos(th)];
    const hinge = [0, 0, hingeZ(j, e) + lift];
    const c = hinge.map((h, i) => h + d[i] * (PW / 2 + 0.4));
    const F = G.frameOf(c, n, Y, d);
    const out = [S(G.prismOf(F, roundRect(PH, PW, 0.6, 3), -PT / 2, PT / 2, P), { tone: "lo" })];
    if (lit) {
      const facing = n[0] * VIEW_DIR[0] + n[1] * VIEW_DIR[1] + n[2] * VIEW_DIR[2];
      const sf = (facing >= 0 ? 1 : -1) * (PT / 2 + 0.01);
      out.push(L(k.pathOf(roundRect(PH, PW, 0.6, 3).map(([u, v]) => at(atF(F, u, v, sf))), true), { tone: "lit" }));
    }
    const outline = roundRect(PH, PW, 0.6, 3).map(([u, v]) => atF(F, u, v, 0));
    return { th, z: hinge[2], svg: out.join(""), outline };
  }

  // The shadow a leaf in the air throws on the pile under it (right pile while it leans right, left pile once it
  // has passed upright). The outline is thrown along a fixed light (toward the lower right on screen) onto the
  // pile's top plane, kept inside the cover, and fades as the leaf stands up: tight and darker near the pile,
  // wider and fainter higher up.
  const LIGHT = [0.7, -0.15];
  function castShadow(it, p, lift) {
    const right = Math.cos(it.th) >= 0;
    const rest = Array.from({ length: N }, (_, j) => (right ? p - j <= 0.001 : p - j >= 0.999)).filter(Boolean).length;
    const plane = (rest ? BASE + PT * rest - 0.05 : TOP) + lift;
    const hs = it.outline.map((w) => Math.max(0, w[2] - plane));
    const hmax = Math.max(...hs), hmean = hs.reduce((a, b) => a + b, 0) / hs.length;
    if (hmax < 0.3) return null;
    const K = 0.8 * Math.pow(clamp(1 - hmax / (PW * 1.05), 0, 1), 1.6);
    if (K < 0.02) return null;
    const flat = k.pathOf(it.outline.map((w, i) => at([w[0] + LIGHT[0] * hs[i], w[1] + LIGHT[1] * hs[i], plane + 0.03])), true);
    const x0 = right ? 0.3 : -0.3 - COVER.w, id = right ? "sb-clip-r" : "sb-clip-l";
    const rect = k.pathOf([[x0, -COVER.h / 2], [x0 + COVER.w, -COVER.h / 2], [x0 + COVER.w, COVER.h / 2], [x0, COVER.h / 2]].map(([x, y]) => at([x, y, plane])), true);
    const svg = `<clipPath id="${id}"><path d="${rect}"/></clipPath><g clip-path="url(#${id})"><path class="iso-halo" d="${flat}" style="transform:none;filter:blur(${(1.2 + 0.16 * hmean).toFixed(2)}px);opacity:calc(var(--anatomy-halo-opacity) * ${K.toFixed(3)})"/></g>`;
    return { svg, pileKey: right ? BETA : Math.PI - BETA };
  }

  // covers, spiral and leaves, floated by f (0 = on the mat, 1 = fully floating)
  function book(t, f = 0) {
    const p = t * N, lift = f * LIFT;
    const out = [];
    for (const sx of [-1, 1]) {
      const x = sx > 0 ? 0.3 : -0.3 - COVER.w;
      out.push(S(k.slabOf({ x, y: -COVER.h / 2, w: COVER.w, d: COVER.h, r: COVER.r }, MAT.t + lift, COVER.t, P, 4, 0.2), { tone: "mid" }));
    }
    out.push(wire("lower", lift));
    const jl = p > 0.02 && p < N - 0.02 ? Math.min(N - 1, Math.floor(p)) : -1;
    const items = Array.from({ length: N }, (_, j) => leaf(j, p, j === jl, lift));
    // painter's order: the leaf nearest edge-on to the viewer is drawn last (key = angle away from edge-on, largest first)
    const entries = items.map((it) => ({ key: Math.abs(it.th - BETA), z: it.z, svg: it.svg }));
    // each shadow goes on its pile (after the leaves lying there) and under the leaf that throws it
    for (const it of items) {
      const sh = castShadow(it, p, lift);
      if (!sh) continue;
      const key = Math.abs(it.th - BETA);
      entries.push({ key: key < sh.pileKey ? key + 1e-6 : sh.pileKey - 1e-6, z: 0, svg: sh.svg });
    }
    entries.sort((a, b) => b.key - a.key || a.z - b.z);   // leaves lying flat on one pile tie: the higher one last
    out.push(entries.map((e) => e.svg).join(""), wire("upper", lift));
    return out.join("");
  }

  const from = [PW + 3, 0, BASE], dir = [-2 * (PW + 3), 0, 0];
  const turned = (t) => Math.round(t * N);
  return {
    name: "sketchbook",
    P,
    rest: REST,
    label: "A spiral-bound sketchbook with seven blank leaves, lying open on a cutting mat. Sweep the pointer along the book from right to left and its leaves turn over in turn; the leaf being turned stands up in the middle. While the pointer is over the card, the book floats slightly off the mat.",
    groups: [
      { id: "base", markup: base() },
      { id: "shadow", draw: (t, f = 0) => shadow(f) },
      { id: "book", draw: book },
    ],
    words: (t) => `${turned(t)} of ${N} leaves turned`,
    target: (pt) => clamp((along(P, pt, from, dir) - 0.1) / 0.8, 0, 1),
  };
}
