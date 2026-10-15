// About Me: one book lying on its back cover. The nearer the pointer, the
// wider it opens, and its seven pages always fan out evenly between the covers.
//
// 01 hit     closeness is measured to the book's rest centre, which never moves.
// 03 reach   the front cover runs from slightly open to nearly flat the other way.
// 04 accent  the page edges are the one lit set of lines (one thing: the pages).
// 05 rest    slightly open, pages just parted.
// 08 clock   closeness is a position: Hairline's spring.
import { k, G, S, L, D, lerp, nearness, roundRect, at as atF } from "./common.mjs";

const PAGES = 7;
const LEN = 44, W = 31, COVER_T = 1.1, PAGE_LEN = 41.6, PAGE_W = 29.6;
const HINGE = [0, 0, COVER_T];                  // spine line, along x
const OPEN = [16, 174];                          // front cover angle, degrees
const X = [1, 0, 0];
const VIEW_DIR = [Math.cos((40 * Math.PI) / 180) * Math.cos(Math.PI / 6), Math.sin((40 * Math.PI) / 180) * Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)];
const BETA = Math.atan2(VIEW_DIR[2], VIEW_DIR[1]);   // the leaf angle seen edge-on
const LIGHT_UP = 0.6;

const coverAt = (t) => (lerp(OPEN[0], OPEN[1], t) * Math.PI) / 180;

export function create(VIEW) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI;
    for (const x of [-LEN / 2, LEN / 2]) pts.push([x, HINGE[1] + W * Math.cos(a), HINGE[2] + W * Math.sin(a)]);
  }
  pts.push([-LEN / 2, -3, 0], [LEN / 2, -3, 0], [-LEN / 2, W, 0], [LEN / 2, W, 0]);
  const P = k.fitProjection(pts, VIEW[0], VIEW[1], { pad: 40, azimuth: 40 });
  const at = (p) => k.iso(p, P);

  function base() {
    const out = [`<path class="iso-halo" d="${k.haloOf({ x: -LEN / 2, y: -2, w: LEN, d: W + 2, r: 2 }, -1, 1, P)}"/>`];
    // the spine: a rounded back along the hinge, with headbands at both ends
    const spineF = G.frameOf([-LEN / 2, HINGE[1] - 0.6, HINGE[2] - 0.2], X, [0, 1, 0], [0, 0, 1]);
    out.push(S(G.disc(0, LEN, 1.9, spineF, P), { tone: "mid" }));
    return out.join("");
  }

  // one leaf (cover or page) at angle a about the spine
  function leaf(a, kind) {
    const dir = [0, Math.cos(a), Math.sin(a)];
    const n = [0, -Math.sin(a), Math.cos(a)];
    if (kind === "page") {
      const c = HINGE.map((h, i) => h + dir[i] * (PAGE_W / 2 + 0.3));
      const F = G.frameOf(c, n, X, dir);
      const ring = roundRect(PAGE_LEN, PAGE_W, 0.5, 2).map(([u, v]) => at(atF(F, u, v, 0)));
      const facing = n[0] * VIEW_DIR[0] + n[1] * VIEW_DIR[1] + n[2] * VIEW_DIR[2];
      const up = Math.abs(facing) > 0.08 ? (facing > 0 ? n[2] : -n[2]) : 0;
      const shade = up > LIGHT_UP ? "" : up > 0.2 ? ' data-shade="3"' : ' data-shade="2"';
      const fill = shade ? `<path class="iso-shade"${shade} d="${k.pathOf(ring, true)}"/>` : `<path class="iso-top" d="${k.pathOf(ring, true)}"/>`;
      const lines = [];
      if (Math.abs(facing) > 0.35) {
        // a few printed lines on the side you see
        for (let r = 0; r < 5; r++) {
          const v = PAGE_W / 2 - 5 - r * 3.4;
          lines.push(k.pathOf([atF(F, -PAGE_LEN / 2 + 5, v, 0), atF(F, PAGE_LEN / 2 - (r === 4 ? 16 : 5), v, 0)].map(at)));
        }
      }
      return `<g class="hla-page">${fill}${lines.length ? L(lines.join(""), { tone: "faint", free: true }) : ""}${L(k.pathOf(ring, true), { tone: "lit" })}</g>`;
    }
    const c = HINGE.map((h, i) => h + dir[i] * (W / 2));
    const F = G.frameOf(c, n, X, dir);
    const [s0, s1] = kind === "back" ? [-COVER_T, 0] : [0, COVER_T];
    return S(G.prismOf(F, roundRect(LEN, W, 1.2, 3), s0, s1, P), { tone: "mid" });
  }

  function leaves(t) {
    const af = coverAt(t);
    const items = [{ a: 0, kind: "back" }, { a: af, kind: "front" }];
    for (let i = 1; i <= PAGES; i++) items.push({ a: (af * i) / (PAGES + 1), kind: "page" });
    // painter's order: the leaf nearest edge-on to the viewer is drawn last
    items.sort((p, q) => Math.abs(q.a - BETA) - Math.abs(p.a - BETA));
    return items.map((it) => leaf(it.a, it.kind)).join("");
  }

  const centre = at([0, W / 2, W * 0.4]);
  return {
    name: "book",
    P,
    rest: 0.05,
    label: "A hardback book lying on a table, slightly open. Bring the pointer closer and it opens wider, its seven pages fanning out evenly between the covers.",
    groups: [
      { id: "spine", markup: base() },
      { id: "leaves", draw: leaves },
    ],
    target: (pt) => nearness(pt, centre, 20, 170),
  };
}
