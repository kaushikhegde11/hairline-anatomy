import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { kitScript, liveScript } from "../../scripts/inline-kit.mjs";
import { cardHtml, LIVE_CSS } from "../../kit/live.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 380;

const PLATE = { x: -128, y: -64, w: 262, d: 128, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const MAG = { x: -112, y: -20, w: 44, d: 40, r: 3 };
const MAG_H = 24;
const POST = [-98, 0];
const POST_TOP = 122;
const CLAMP_Z = 100;

const DIAL = [58, 0];
const DIAL_R = 20;
const DIAL_Z = 82;
const DIAL_H = 10;
const DIAL_TOP = DIAL_Z + DIAL_H;
const PER_TURN = 20;

const RAIL_FROM = 2;
const RAIL_TO = 124;
const CARRIAGE = { x: -28, y: -24, w: 56, d: 48, r: 3 };
const CARRIAGE_Z = 3;
const CARRIAGE_TOP = 8;
const BLOCKS = [18, 14, 10];
const BLOCK_W = 15.6;
const STEP = 16;
const TIP_R = 2.6;
const CENTRE = -24 + BLOCK_W / 2;
const STOPS = BLOCKS.map((_, index) => DIAL[0] - CENTRE - STEP * index);
const REACH = [STOPS[STOPS.length - 1] - 6, STOPS[0] + 6];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [POST[0], POST[1], POST_TOP + 2], [DIAL[0] + DIAL_R, 0, DIAL_TOP]],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 42 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -110, y: PLATE.y + PLATE.d - 15, w: 230, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  return out.join("");
}

function rails() {
  const out = [];
  for (const y of [-20, 15]) {
    out.push(S(k.slabOf({ x: RAIL_FROM, y, w: RAIL_TO - RAIL_FROM, d: 5, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(D([RAIL_FROM + 6, RAIL_TO - 6].map((x) => at([x, y + 2.5, 3])), { size: 0.4 }));
  }
  for (const x of [RAIL_FROM - 5, RAIL_TO]) {
    out.push(S(k.slabOf({ x, y: -23, w: 5, d: 46, r: 1.2 }, 0, 7, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2.5, -18, 7]), at([x + 2.5, 18, 7])], { size: 0.45 }));
  }
  return out.join("");
}

function fixture() {
  const out = [];
  out.push(S(k.slabOf(MAG, 0, 11, P, 6, 0.8), { tone: "mid" }));
  out.push(S(k.slabOf(k.insetPlan(MAG, 0.8), 11, MAG_H - 11, P, 6, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(MAG, 3), MAG_H, P), { tone: "faint" }));
  out.push(D([at([MAG.x + 5, MAG.y + 5, MAG_H]), at([MAG.x + 5, MAG.y + MAG.d - 5, MAG_H]), at([MAG.x + MAG.w - 5, MAG.y + 5, MAG_H])], { size: 0.45 }));
  const knob = [MAG.x + 32, MAG.y + 28];
  out.push(S(k.cylinder(knob[0], knob[1], 6, MAG_H, 4, P, 32), { tone: "mid" }));
  out.push(L(k.knurl(knob[0], knob[1], 6, MAG_H, MAG_H + 4, 36, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([knob[0], knob[1]], [knob[0] + 6, knob[1]], MAG_H + 4, P), { tone: "hi" }));
  out.push(D([at([knob[0], knob[1], MAG_H + 4])], { size: 0.5, tone: "hi" }));
  out.push(S(k.cylinder(POST[0], POST[1], 5, MAG_H, 4, P, 28), { tone: "mid" }));
  const clamp = { x: POST[0] - 7, y: POST[1] - 7, w: 14, d: 14, r: 2.5 };
  out.push(S(k.cylinder(POST[0], POST[1], 3.2, MAG_H + 4, CLAMP_Z - 4 - MAG_H - 4, P, 28), { tone: "mid", crease: "none" }));
  out.push(L([60, 80].map((z) => k.sideArc(POST[0], POST[1], 3.2, z, P, 16)).join(""), { tone: "faint" }));
  out.push(S(k.slabOf(clamp, CLAMP_Z - 4, 12, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(POST[0], POST[1], 3.2, CLAMP_Z + 8, POST_TOP - CLAMP_Z - 8, P, 28), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(POST[0], POST[1], 3.8, POST_TOP, 2, P, 28), { tone: "mid" }));
  const arm = { x: POST[0] + 7, y: -3, w: DIAL[0] - DIAL_R - POST[0] - 7 + 2, d: 6, r: 2 };
  out.push(S(k.slabOf(arm, CLAMP_Z, 4, P, 4, 0.5), { tone: "mid" }));
  out.push(D([at([arm.x + 4, 0, CLAMP_Z + 4]), at([arm.x + arm.w - 5, 0, CLAMP_Z + 4])], { size: 0.45 }));
  const thumb = [clamp.x + 7, clamp.y + clamp.d + 3];
  out.push(S(k.slabOf({ x: thumb[0] - 1.4, y: clamp.y + clamp.d, w: 2.8, d: 3, r: 0.8 }, CLAMP_Z + 1, 4, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(thumb[0], thumb[1] + 1.4, 2.6, CLAMP_Z, 6, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(thumb[0], thumb[1] + 1.4, 2.6, CLAMP_Z, CLAMP_Z + 6, 18, P), { tone: "lo" }));
  return out.join("");
}

function carriage() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(CARRIAGE, 3), CARRIAGE_Z, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(CARRIAGE, CARRIAGE_Z, CARRIAGE_TOP - CARRIAGE_Z, P, 5, 0.6), { tone: "mid" }));
  out.push(D([-22, -8, 8, 22].map((x) => at([x, CARRIAGE.y + CARRIAGE.d - 2.6, CARRIAGE_TOP])), { size: 0.4, tone: "lo" }));
  out.push(L(k.lineOnTop([CARRIAGE.x, -15.5], [CARRIAGE.x + CARRIAGE.w, -15.5], CARRIAGE_TOP, P), { tone: "faint" }));
  out.push(L(k.lineOnTop([CARRIAGE.x, 15.5], [CARRIAGE.x + CARRIAGE.w, 15.5], CARRIAGE_TOP, P), { tone: "faint" }));
  BLOCKS.forEach((height, index) => {
    const plan = { x: -24 + STEP * index, y: -12, w: BLOCK_W, d: 24, r: 1 };
    out.push(S(k.slabOf(plan, CARRIAGE_TOP, height, P, 3, 0.5), { tone: "hi", crease: "lo" }));
    out.push(L(k.planOutline(k.insetPlan(plan, 2), CARRIAGE_TOP + height, P, 3), { tone: "faint" }));
  });
  const handle = [CARRIAGE.x + CARRIAGE.w - 8, CARRIAGE.y + CARRIAGE.d + 3];
  out.push(S(k.slabOf({ x: handle[0] - 2, y: CARRIAGE.y + CARRIAGE.d - 1, w: 4, d: 4, r: 1 }, CARRIAGE_Z + 1, 3, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(handle[0], handle[1] + 1, 3, CARRIAGE_Z, 5, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(handle[0], handle[1] + 1, 3, CARRIAGE_Z, CARRIAGE_Z + 5, 18, P), { tone: "lo" }));
  return out.join("");
}

function plunger() {
  const out = [];
  out.push(S(k.cylinder(DIAL[0], DIAL[1], TIP_R, 0, 2.4, P, 20), { tone: "hi", lit: true }));
  out.push(S(k.cylinder(DIAL[0], DIAL[1], 1.4, 2.4, 50, P, 16), { tone: "hi", crease: "none", lit: true }));
  return out.join("");
}

function dial() {
  const out = [];
  const [x, y] = DIAL;
  out.push(S(k.cylinder(x, y, 2.9, 54, DIAL_Z - 54, P, 20), { tone: "mid" }));
  out.push(L(k.sideArc(x, y, 2.9, 60, P, 12), { tone: "lo" }));
  out.push(S(k.slabOf({ x: x - DIAL_R - 6, y: -4, w: 8, d: 8, r: 1.5 }, DIAL_Z + 2, CLAMP_Z - DIAL_Z - 2, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3.4, DIAL_TOP, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 3.4, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, DIAL_R - 3, 50, 5, DIAL_TOP, [1.3, 2.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(S(k.slabOf({ x: x + DIAL_R - 1, y: -2.4, w: 5, d: 4.8, r: 1.2 }, DIAL_Z + 2, 5, P, 3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x + DIAL_R + 3.6, y: -3.2, w: 2.6, d: 6.4, r: 1.2 }, DIAL_Z + 1.2, 6.6, P, 3), { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.6, DIAL_TOP, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 9], DIAL_TOP, P, "x"), "0.01", { size: 2.4, tone: "lo", anchor: "middle" }));
  return out.join("");
}

const needleAt = (turn) => {
  const angle = turn * Math.PI * 2;
  const [x, y] = DIAL;
  return k.lineOnTop([x - Math.sin(angle) * 3.4, y + Math.cos(angle) * 3.4], [x + Math.sin(angle) * (DIAL_R - 4), y - Math.cos(angle) * (DIAL_R - 4)], DIAL_TOP + 0.2, P);
};

// ---------------------------------------------------------------------------
// Interaction, the Hairline way (interaction.md). The geometry above is the
// anatomy dial-indicator, unchanged. What changes is how it answers:
//
// Concept (one line): Dial indicator. The pointer's place along the rails
// slides the carriage; the plunger rides onto the block under it and the
// needle turns. The slider sets the dial's gain: travel per needle turn.
//
// 01 hit     the pointer is read along the rail line (along()), which never
//            moves, so the carriage target never moves under a still pointer.
// 03 reach   the target is clamped to REACH; the plate already frames it.
// 04 accent  the plunger and needle are the one lit part, at rest and in use.
// 05 rest    leaving parks the plunger on the middle block, not the first.
// 07 cost    one live() loop that sleeps when settled and offscreen.
// 08 clock   carriage on Hairline's spring (k 100, c 18); the plunger keeps
//            its real spring (420, 26) because it is a spring-loaded plunger.
// No read-out, no words on the card; the slider sits under the drawing.
// ---------------------------------------------------------------------------

const REST_X = STOPS[1] + 3;            // middle block, a little off centre
const RANGE = [40, 20, 10];             // px of travel per needle turn: weak to strong
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A dial indicator on a surface plate. Its plunger rests on three gauge blocks, 18, 14 and 10 tall, on a carriage that slides along two rails. Move along the rails to slide the carriage: the plunger rides onto the block under it and the needle turns by the same amount.",
  body: [
    plate(),
    rails(),
    fixture(),
    `<g data-part="carriage" transform="${k.translateAlong(P, [REST_X, 0, 0])}">${carriage()}</g>`,
    `<g data-part="plunger" transform="${k.translateAlong(P, [0, 0, CARRIAGE_TOP + BLOCKS[1]])}">${plunger()}</g>`,
    dial(),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(BLOCKS[1] / RANGE[1])}" style="stroke-width:1.1"/>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const BLOCKS = ${JSON.stringify(BLOCKS)};
const DIAL = ${JSON.stringify(DIAL)};
const DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP}, STEP = ${STEP}, BLOCK_W = ${BLOCK_W}, TIP_R = ${TIP_R}, BASE = ${CARRIAGE_TOP};
const REACH = ${JSON.stringify(REACH)}, REST_X = ${REST_X}, RANGE = ${JSON.stringify(RANGE)};
const stops = ${JSON.stringify(STOPS)};
const figure = document.querySelector(".hla-figure");
const stage = figure.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const carriage = svg.querySelector('[data-part="carriage"]');
const plunger = svg.querySelector('[data-part="plunger"]');
const needle = svg.querySelector('[data-part="needle"]');
const lim = (v, a, b) => Math.min(b, Math.max(a, v));
const heightUnder = (cx) => {
  let top = BASE;
  BLOCKS.forEach((h, i) => {
    const from = cx - 24 + STEP * i, to = from + BLOCK_W;
    if (to > DIAL[0] - TIP_R && from < DIAL[0] + TIP_R) top = Math.max(top, BASE + h);
  });
  return top;
};
const blockUnder = (cx) => BLOCKS.findIndex((_, i) => { const from = cx - 24 + STEP * i; return DIAL[0] >= from && DIAL[0] <= from + BLOCK_W; });
const needleAt = ${needleAt.toString().replace("k.lineOnTop", "lineOnTop")};

const car = spring(REST_X);                                   // where: Hairline's spring
const tip = spring(heightUnder(REST_X), { k: 420, c: 26, eps: 0.005 }); // the plunger's own spring
const gain = spring(RANGE[1], { eps: 0.01 });                 // the slider's number, eased
const drawn = { car: null, tip: null, turn: null };
let said = "";

function draw() {
  if (drawn.car !== car.x) { carriage.setAttribute("transform", translateAlong(P, [car.x, 0, 0])); drawn.car = car.x; }
  if (drawn.tip !== tip.x) { plunger.setAttribute("transform", translateAlong(P, [0, 0, tip.x])); drawn.tip = tip.x; }
  const turn = (tip.x - BASE) / gain.x;
  if (drawn.turn !== turn) { needle.setAttribute("d", needleAt(turn)); drawn.turn = turn; }
}
function describe() {                                           // only when the choice changes, never per frame
  const i = blockUnder(car.t);
  const text = (i < 0 ? "between blocks" : "on block " + (i + 1) + ", " + BLOCKS[i] + " tall") + "; one needle turn is " + gain.t + " px";
  if (text !== said) { stage.setAttribute("aria-valuetext", text); stage.setAttribute("aria-valuenow", String(i < 0 ? 0 : BLOCKS[i])); said = text; }
}
const loop = live(stage, (dt) => {
  const a = stepS(car, dt);
  tip.t = heightUnder(car.x);
  const b = stepS(tip, dt);
  const c = stepS(gain, dt);
  draw();
  return a || b || c;
});
const steer = (x) => { car.t = lim(x, REACH[0], REACH[1]); describe(); loop.wake(); };

pointer(stage, svg, {
  move: (pt) => steer(along(P, pt, [0, 0, 0], [1, 0, 0])),      // the rail line never moves (rule 01)
  leave: () => steer(REST_X),                                    // back to the designed rest (rule 05)
});
stage.addEventListener("keydown", (e) => {
  const here = stops.reduce((best, s, i) => (Math.abs(s - car.t) < Math.abs(stops[best] - car.t) ? i : best), 0);
  let to = null;
  if (e.key === "ArrowRight" || e.key === "ArrowUp") to = Math.max(0, here - 1);
  if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = Math.min(stops.length - 1, here + 1);
  if (e.key === "Home") to = 0;
  if (e.key === "End") to = stops.length - 1;
  if (e.key === "Escape") { e.preventDefault(); steer(REST_X); return; }
  if (to === null) return;
  e.preventDefault();
  steer(stops[to]);
});
slider(figure, RANGE, (v) => { gain.t = v; describe(); loop.wake(); });
draw();
describe();
`;

const body = cardHtml({
  label: "Dial gain",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Dial indicator: move along the rails, or use the arrow keys, to slide the carriage from block to block" aria-valuemin="0" aria-valuemax="18" aria-valuenow="14">${svg}</div>`,
});

const out = theme === "light" ? "dial-live-light.html" : "dial-live.html";
writeFileSync(join(HERE, out), k.pageHtml({ title: "Dial indicator", theme, body: `<style>${LIVE_CSS}</style>` + body, script: kitScript() + liveScript() + live }));
console.log("wrote", out);
