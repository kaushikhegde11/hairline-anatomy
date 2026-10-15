// Design: a studio easel with a sketch on its canvas and a monitor on a hinged
// arm at its right side. As the pointer nears the hinge, the monitor swings
// out beside the canvas and turns toward you; leaving tucks it half back.
//
// 01 hit     closeness is measured to the hinge's rest point, which never moves.
// 03 reach   the swing runs from folded against the easel to beside the canvas.
// 04 accent  the monitor's screen edge is the one lit line.
// 05 rest    half tucked, angled toward you.
// 08 clock   closeness is a position: Hairline's spring.
import { k, G, S, L, D, nearness, lerp, roundRect, at as atF, pathW } from "./common.mjs";

const TILT = Math.atan2(10, 122);
const UP = [0, -Math.sin(TILT), Math.cos(TILT)];        // along the front legs
const N = [0, Math.cos(TILT), Math.sin(TILT)];           // canvas normal, toward the front
const X = [1, 0, 0];
const LEG_LEN = 124;
const FOOT_Y = 5;
const legPoint = (x, z) => [x, FOOT_Y - Math.tan(TILT) * z, z];
const CANVAS = { w: 34, h: 48, t: 1.8, z0: 46 };
const HINGE = [25.5, legPoint(0, 84)[1], 84];      // the swing pin, beside the right leg
const ARM = 9, MON = { w: 34, h: 22, t: 2.2 };
const SWING = [-86, -12];                                // degrees: folded, out beside the canvas

const swingDir = (t) => { const a = (lerp(SWING[0], SWING[1], t) * Math.PI) / 180; return [Math.cos(a), Math.sin(a), 0]; };

export function create(VIEW) {
  // fit to the easel and every monitor position
  const pts = [[-26, -46, 0], [26, -46, 0], [-26, 10, 0], [26, 10, 0], [-26, -6, LEG_LEN + 2], [26, -6, LEG_LEN + 2]];
  for (let i = 0; i <= 8; i++) {
    const e = swingDir(i / 8), n = [-e[1], e[0], 0];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const sn of [-1, 1]) {
      const c = HINGE.map((h, j) => h + e[j] * (ARM + MON.w / 2));
      pts.push(c.map((v, j) => v + e[j] * sx * MON.w / 2 + [0, 0, 1][j] * sz * MON.h / 2 + n[j] * sn * MON.t));
    }
  }
  const P = k.fitProjection(pts, VIEW[0], VIEW[1], { pad: 26, azimuth: 40 });
  const at = (p) => k.iso(p, P);
  const box = (o, a, u, v, w, h, s0, s1, r = 0.6) => G.prismOf(G.frameOf(o, a, u, v), roundRect(w, h, r, 3), s0, s1, P);

  function easel() {
    const out = [`<path class="iso-halo" d="${k.haloOf({ x: -30, y: -44, w: 60, d: 54, r: 10 }, -1, 1, P)}" style="filter:blur(6px)"/>`];
    // rear leg: from the head piece down and back
    const head = legPoint(0, LEG_LEN);
    const rearTop = [0, head[1] - 2.2, LEG_LEN - 1], rearFoot = [0, -40, 1.2];
    const rd = rearTop.map((v, i) => v - rearFoot[i]), rl = Math.hypot(...rd), ra = rd.map((v) => v / rl);
    out.push(S(k.cylinder(0, -40, 2.6, 0, 1.2, P, 20), { tone: "mid" }));
    out.push(S(box(rearFoot, ra, X, [0, ra[2], -ra[1]], 3, 2.4, 0, rl), { tone: "mid" }));
    // left leg, the stretcher between the legs, right leg
    const leg = (x) => S(k.cylinder(x, FOOT_Y, 2.8, 0, 1.2, P, 20), { tone: "mid" }) + S(box(legPoint(x, 1.2), UP, X, N, 3.4, 2.6, 0, LEG_LEN - 1.2), { tone: "mid" });
    out.push(leg(-20));
    out.push(S(box(legPoint(-18.3, 24), X, N, UP, 2.2, 2.6, 0, 36.6), { tone: "mid" }));
    out.push(leg(20));
    // head piece across the leg tops
    out.push(S(box(legPoint(-23, LEG_LEN + 1.4), X, UP, N, 2.8, 3.4, 0, 46), { tone: "mid" }));
    // tray on the front of the legs, the canvas standing on it, the tray's lip
    const legFront = (z) => legPoint(0, z)[1] + 1.3 / Math.cos(TILT);
    const tray = { x: -26, y: legFront(43.5), w: 52, d: 8, r: 1 };
    out.push(S(k.slabOf(tray, 42, 3, P, 3, 0.4), { tone: "mid" }));
    const canvasCentre = legPoint(0, CANVAS.z0 + CANVAS.h / 2).map((v, i) => v + N[i] * (1.3 + CANVAS.t / 2) + UP[i] * 0);
    const CF = G.frameOf(canvasCentre, N, X, UP);
    out.push(S(G.prismOf(CF, roundRect(CANVAS.w, CANVAS.h, 0.8, 3), -CANVAS.t / 2, CANVAS.t / 2, P), { tone: "hi" }));
    const face = (u, v) => at(atF(CF, u, v, CANVAS.t / 2 + 0.01));
    const sketch = [];
    sketch.push(k.pathOf([[-14, -9], [-8, 0], [-4, -4], [2, 6], [7, -1], [10, 3], [14, -6]].map(([u, v]) => face(u, v))));
    sketch.push(k.pathOf([[-15, -12], [-5, -11.5], [6, -12.3], [15, -11.7]].map(([u, v]) => face(u, v))));
    const sun = []; for (let i = 0; i <= 28; i++) { const a = (i / 28) * Math.PI * 2; sun.push(face(7 + 3.6 * Math.cos(a), 14 + 3.6 * Math.sin(a))); }
    sketch.push(k.pathOf(sun, true));
    sketch.push(k.pathOf([[-12, 15], [-9, 17], [-6, 15]].map(([u, v]) => face(u, v))));
    out.push(L(sketch.join(""), { tone: "lo", free: true }));
    out.push(S(k.slabOf({ x: -26, y: tray.y + tray.d - 1.4, w: 52, d: 1.4, r: 0.6 }, 45, 1.8, P, 2), { tone: "mid", crease: "none" }));
    // top clamp over the canvas edge, with its knob
    const clampZ = CANVAS.z0 + CANVAS.h + 1.9;
    out.push(S(box(legPoint(-21.7, clampZ).map((v, i) => v + N[i] * 2.4), X, UP, N, 3.4, 3.2, 0, 43.4), { tone: "mid" }));
    out.push(S(G.disc(0, 2.2, 2.4, G.frameOf(legPoint(0, clampZ).map((v, i) => v + N[i] * 4), N, X, UP), P), { tone: "mid" }));
    // hinge collar on the right leg, its bracket and the swing pin
    out.push(S(box(legPoint(20, HINGE[2] - 3), UP, X, N, 5, 4, 0, 6, 1), { tone: "mid" }));
    out.push(S(box([22.4, HINGE[1], HINGE[2]], X, N, UP, 2.6, 2.4, 0, HINGE[0] - 22.4), { tone: "mid" }));
    out.push(S(k.cylinder(HINGE[0], HINGE[1], 1.6, HINGE[2] - 5.5, 11, P, 20), { tone: "mid" }));
    return out.join("");
  }

  function monitor(t) {
    const e = swingDir(t), n = [-e[1], e[0], 0], z = [0, 0, 1];
    const out = [];
    const armO = [HINGE[0], HINGE[1], HINGE[2] - 2];
    out.push(S(G.prismOf(G.frameOf(armO, e, n, z), roundRect(2.6, 2.4, 0.8, 3), 0, ARM + 1, P), { tone: "mid" }));
    out.push(S(k.cylinder(HINGE[0], HINGE[1], 2.1, HINGE[2] + 5.5, 1.2, P, 20), { tone: "mid" }));
    const c = HINGE.map((h, j) => h + e[j] * (ARM + MON.w / 2));
    const back = c.map((v, j) => v - n[j] * MON.t / 2);
    out.push(S(G.prismOf(G.frameOf(back.map((v, j) => v - e[j] * (MON.w / 2 - 0.5)), n, e, z), roundRect(5, 5, 1, 3), -1.4, 0, P), { tone: "mid" }));
    const MF = G.frameOf(c, n, e, z);
    out.push(S(G.prismOf(MF, roundRect(MON.w, MON.h, 1.4, 4), -MON.t / 2, MON.t / 2, P), { tone: "mid" }));
    const scr = roundRect(MON.w - 3.4, MON.h - 3.6, 0.6, 3).map(([u, v]) => at(atF(MF, u, v + 0.3, MON.t / 2 + 0.01)));
    const facing = n[0] * Math.cos(40 * Math.PI / 180) + n[1] * Math.sin(40 * Math.PI / 180) > 0;
    if (facing) {
      out.push(`<path class="iso-shade" data-shade="0" d="${k.pathOf(scr, true)}"/>`);
      out.push(L(k.pathOf(scr, true), { tone: "lit" }));
      out.push(D([at(atF(MF, 0, -MON.h / 2 + 1.0, MON.t / 2 + 0.01))], { size: 0.5, tone: "lo" }));
    }
    return out.join("");
  }

  const centre = at(HINGE);
  return {
    name: "easel",
    P,
    rest: 0.5,
    label: "A studio easel holding a canvas with a pencil sketch of hills and a sun, and a monitor on a hinged arm at its right side. Bring the pointer near the hinge and the monitor swings out beside the canvas.",
    groups: [
      { id: "easel", markup: easel() },
      { id: "monitor", draw: monitor },
    ],
    target: (pt) => nearness(pt, centre, 14, 180),
  };
}
