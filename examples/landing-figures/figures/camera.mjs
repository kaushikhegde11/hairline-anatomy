// Photography: a camera whose iris closes as the pointer nears the lens.
// As the blades close, the wide knurled zoom ring turns and the front of the
// lens slides out. A blue status LED glows on the grip (WebGL, SVG fallback).
//
// 01 hit     closeness is measured to the lens centre's rest point.
// 03 reach   iris from f/2 (open) to f/8 (closest); zoom 0 to 7 units.
// 04 accent  the iris blades and opening are the one lit part.
// 05 rest    leaving returns to half closed, half zoomed.
// 08 clock   closeness is a position: Hairline's spring.
import { k, G, S, L, D, clamp, lerp, nearness } from "./common.mjs";

const BODY = { x: -44, y: -16, w: 88, d: 32, r: 5 };
const BODY_H = 50;
const TOP = { x: -42, y: -14, w: 84, d: 28, r: 4 };
const TOP_Z = BODY_H, TOP_H = 3;
const HUMP = { x: -26, y: -12, w: 36, d: 22, r: 4 };
const HUMP_Z = TOP_Z + TOP_H, HUMP_H = 11;
const LENS = [-8, BODY.y + BODY.d, 24];
const F = G.frameOf(LENS, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const BARREL_END = 23, LIP = 3;
const IRIS_R = 11.6, OPEN_R = 10.4, BLADES = 7;
const ZOOM = 7;                       // how far the front slides out at full close
const RING_TURN = 1.1;                // radians the wide ring turns, open to closed
const N_MIN = 8;                      // f/8 when the pointer is on the lens
const IDX = 0.62;
const GRIP = { x: 20, y: BODY.y + BODY.d - 1, w: 20, d: 7, r: 3 };
export const LED = [27, GRIP.y + GRIP.d, 39];
export const LED_R = 1.7;
export const GRIP_FACE = { x0: GRIP.x, x1: GRIP.x + GRIP.w, z0: 3, z1: 44, r: GRIP.r, y: GRIP.y + GRIP.d };

const fNumber = (t) => 2 * Math.pow(N_MIN / 2, t);
const irisRadius = (t) => (OPEN_R * 2) / fNumber(t);

export function create(VIEW) {
  const P = k.fitProjection(
    [...k.boxCorners(BODY, 0, HUMP_Z + HUMP_H + 6), G.pointOf(F, BARREL_END + LIP + ZOOM, 17, 0), G.pointOf(F, BARREL_END + LIP + ZOOM, 17, Math.PI), G.pointOf(F, BARREL_END + LIP + ZOOM, 17, -Math.PI / 2), G.pointOf(F, 0, 18, Math.PI / 2)],
    VIEW[0], VIEW[1], { pad: 40, azimuth: 40 },
  );
  const at = (p) => k.iso(p, P);

  function body() {
    const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(BODY, -2), -1, 1, P)}" style="filter:blur(5px)"/>`];
    const seams = [8, 42].map((z) => L(k.sideSeam(BODY, z, P, 8), { tone: "faint" })).join("");
    out.push(S(k.slabOf(BODY, 0, BODY_H, P, 8, 0.8), { tone: "mid", inner: seams }));
    const lug = G.frameOf([BODY.x + BODY.w, 0, 42], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    out.push(S(G.disc(0, 3, 3.2, lug, P), { tone: "mid" }));
    out.push(S(G.disc(3, 4.6, 1.8, lug, P), { tone: "mid" }));
    out.push(S(k.slabOf(GRIP, 3, 41, P, 6, 0.5), { tone: "mid" }));
    // status LED housing on the grip: the light itself is the shader's
    const ledF = G.frameOf(LED, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    out.push(S(G.disc(0, 0.6, LED_R + 0.9, ledF, P), { tone: "mid" }));
    out.push(`<g class="hla-led">${S(G.disc(0.6, 1.1, LED_R, ledF, P), { tone: "hi", lit: true })}</g>`);
    out.push(D([at([BODY.x + 5, BODY.y + BODY.d, 3]), at([BODY.x + BODY.w - 26, BODY.y + BODY.d, 3])], { size: 0.5, tone: "lo" }));
    return out.join("");
  }

  function top() {
    const out = [S(k.slabOf(TOP, TOP_Z, TOP_H, P, 6, 0.5), { tone: "mid" })];
    const parts = [
      { at: [-34, -2, HUMP_Z], svg: () => S(k.cylinder(-34, -2, 7, HUMP_Z, 5, P, 40, 0.4), { tone: "mid" }) + L(k.knurl(-34, -2, 7, HUMP_Z + 1.6, HUMP_Z + 5, 40, P, 0.2), { tone: "lo" }) + L(k.sideArc(-34, -2, 7, HUMP_Z + 1.6, P, 32), { tone: "faint" }) + L(k.lineOnTop([-34, -2], [-34 + 4.6, -2 + 4.6], HUMP_Z + 5, P), { tone: "mid" }) },
      { at: [-8, -1, HUMP_Z], svg: () => {
        const shoe = { x: -17, y: -8, w: 18, d: 14, r: 1 };
        return S(k.slabOf(HUMP, HUMP_Z, HUMP_H, P, 6, 0.6), { tone: "mid" })
          + S(k.slabOf(shoe, HUMP_Z + HUMP_H, 1.6, P, 2), { tone: "mid", crease: "none" })
          + L(k.planOutline(k.insetPlan(shoe, 2.4), HUMP_Z + HUMP_H + 1.6, P, 2), { tone: "lo" });
      } },
      { at: [22, -1, HUMP_Z], svg: () => S(k.cylinder(22, -1, 8, HUMP_Z, 5, P, 44, 0.4), { tone: "mid" }) + L(k.knurl(22, -1, 8, HUMP_Z + 1.6, HUMP_Z + 5, 44, P, 0.2), { tone: "lo" }) + L(k.sideArc(22, -1, 8, HUMP_Z + 1.6, P, 36), { tone: "faint" }) + L(k.ring(22, -1, 5.6, HUMP_Z + 5, P, 40), { tone: "faint" }) },
      { at: [34, 7, HUMP_Z], svg: () => S(k.cylinder(34, 7, 4.2, HUMP_Z, 2.4, P, 28), { tone: "mid" }) + S(k.cylinder(34, 7, 3, HUMP_Z + 2.4, 1.6, P, 24, 0.3), { tone: "mid" }) },
    ];
    parts.sort((a, b) => k.depthOf(a.at, P) - k.depthOf(b.at, P)).forEach((p) => out.push(p.svg()));
    // viewfinder window on the hump front
    const y = HUMP.y + HUMP.d, x0 = -18, x1 = 0, z0 = HUMP_Z + 3, z1 = HUMP_Z + 8;
    const ring = [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]].map(at);
    out.push(`<path class="iso-shade" data-shade="0" d="${k.pathOf(ring, true)}"/>` + L(k.pathOf(ring, true), { tone: "lo" }));
    return out.join("");
  }

  function lensBack() {
    const out = [];
    const rel = G.frameOf([16, LENS[1], 14], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    out.push(S(G.disc(0, 1.6, 3, rel, P), { tone: "mid" }));
    out.push(S(G.disc(1.6, 2.6, 2.2, rel, P), { tone: "mid" }));
    out.push(S(G.disc(0, 3, 17.4, F, P), { tone: "mid" }));                      // mount ring
    out.push(D(G.dotsOf(F, 1.5, 17.4, 12, P, { fade: [0.04, 0.42] }), { size: 0.45, tone: "lo" }));
    out.push(S(G.disc(3, BARREL_END, 15, F, P), { tone: "mid" }));               // barrel
    out.push(S(G.disc(7, 12, 15.9, F, P), { tone: "mid" }));                     // narrow aperture ring, still
    out.push(k.fadedSvg(G.ribsOf(F, 7.3, 11.7, 15.9, 36, P, { fade: [0.05, 0.4] }), { tone: "lo" }));
    out.push(L(k.pathOf([G.pointOf(F, 12, 15, IDX), G.pointOf(F, 14, 15, IDX)].map(at)), { tone: "hi" }));
    out.push(S(G.disc(14, 21, 15.9, F, P), { tone: "mid" }));                    // wide zoom ring body
    return out.join("");
  }

  // the wide ring's knurl, turned by the iris
  const ribs = (t) => k.fadedSvg(G.ribsOf(F, 14.3, 20.7, 15.9, 56, P, { fade: [0.05, 0.4], seams: true, phase: -RING_TURN * t }), { tone: "lo" });

  function irisPaths(rho, rot, front) {
    const proj3 = ([x, z]) => { const p = at([F.o[0] + x, F.o[1] + front, F.o[2] + z]); return p[0].toFixed(2) + " " + p[1].toFixed(2); };
    const half = Math.PI / BLADES, R = IRIS_R, verts = [], blades = [];
    for (let i = 0; i < BLADES; i++) {
      const phi = rot + (2 * Math.PI * i) / BLADES;
      const tx = rho * Math.cos(phi), ty = rho * Math.sin(phi), dx = -Math.sin(phi), dy = Math.cos(phi);
      const t0 = rho * Math.tan(half), t1 = Math.sqrt(Math.max(0, R * R - rho * rho));
      verts.push([tx + dx * t0, ty + dy * t0]);
      blades.push(`M${proj3([tx + dx * t0, ty + dy * t0])}L${proj3([tx + dx * t1, ty + dy * t1])}`);
    }
    const ring = [];
    for (let i = 0; i < 72; i++) { const a = (i / 72) * 2 * Math.PI; ring.push(proj3([R * Math.cos(a), R * Math.sin(a)])); }
    return { ring: "M" + ring.join("L") + "Z", open: "M" + verts.map(proj3).join("L") + "Z", blades: blades.join("") };
  }

  // everything that slides out with the zoom
  function lensFront(t) {
    const e = ZOOM * t, s0 = BARREL_END + e, front = s0 + LIP;
    const out = [];
    if (e > 0.05) out.push(S(G.disc(BARREL_END - 0.2, s0, 13.9, F, P), { tone: "mid" }));   // inner barrel
    out.push(S(G.disc(s0, front, 15.6, F, P), { tone: "mid" }));
    out.push(L(G.circleOf(F, front, 13.6, P), { tone: "lo" }));
    out.push(L(G.circleOf(F, front, IRIS_R + 0.6, P), { tone: "mid" }));
    const p = irisPaths(irisRadius(t), -0.55 * t, front);
    out.push(`<path class="iso-fill" d="${p.ring}"/>`);
    out.push(`<path class="iso-shade" data-shade="0" d="${p.open}"/>`);
    out.push(`<path class="iso-line" data-tone="lit" d="${p.blades}" style="stroke-width:.9"/>`);
    out.push(`<path class="iso-line" data-tone="lit" d="${p.open}" style="stroke-width:.9"/>`);
    out.push(`<path class="iso-line" data-tone="lo" d="${p.ring}"/>`);
    return out.join("");
  }

  const centre = at(G.pointOf(F, BARREL_END + LIP + ZOOM * 0.5, 0, 0));
  return {
    name: "camera",
    P,
    rest: 0.5,
    label: "A camera with its lens toward you and a blue status light on the grip. Bring the pointer near the lens and the iris blades close down while the knurled zoom ring turns and the lens slides out.",
    groups: [
      { id: "body", markup: body() },
      { id: "top", markup: top() },
      { id: "lens", markup: lensBack() },
      { id: "ribs", draw: ribs },
      { id: "front", draw: lensFront },
    ],
    target: (pt) => nearness(pt, centre, 16, 190),
    describe: (t) => `Aperture about f/${(Math.round(fNumber(t) * 10) / 10).toString()}`,
    glow: { kind: "led", led: LED, ledR: LED_R, face: [GRIP_FACE.x0, GRIP_FACE.x1, GRIP_FACE.z0, GRIP_FACE.z1], faceR: GRIP_FACE.r },
  };
}
