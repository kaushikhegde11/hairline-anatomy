// live.mjs: Hairline's interaction layer for anatomy figures.
//
// The browser half (clocks, hit testing, the loop, the pointer, the slider) is
// inlined into a page with liveScript() from scripts/inline-kit.mjs, after
// kitScript(). The build half (cardHtml, LIVE_CSS) is imported by build.mjs.
// Every name here is global on the page: do not declare your own spring,
// stepS, tween, tset, tval, tdone, bezier, EASE, calm, unproj, along,
// toViewBox, live, pointer, slider, rangeAt, stagger, nearest, cardHtml or
// LIVE_CSS.

/* ---------- the two clocks (interaction.md, rule 08) ---------- */

// The continuous clock: one spring per moving number. Write .t to retarget.
// Defaults are Hairline's k 100, c 18, m 1. Change them only for a reason you
// can state, such as a real spring in the object being explained.
export function spring(x, { k = 100, c = 18, m = 1, eps = 1e-3 } = {}) {
  return { x, v: 0, t: x, k, c, m, eps };
}

// Advances by dt seconds in 4 sub-steps. Lands at once under reduced motion.
// Returns whether it is still moving.
export function stepS(sp, dt) {
  if (calm()) { sp.x = sp.t; sp.v = 0; return false; }
  const h = dt / 4;
  for (let i = 0; i < 4; i++) {
    const a = (sp.k * (sp.t - sp.x) - sp.c * sp.v) / sp.m;
    sp.v += a * h;
    sp.x += sp.v * h;
  }
  if (Math.abs(sp.t - sp.x) < sp.eps && Math.abs(sp.v) < sp.eps) { sp.x = sp.t; sp.v = 0; return false; }
  return true;
}

// A CSS cubic-bezier as a function of progress 0..1.
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (p) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - p, d = dx(t);
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    t = Math.min(1, Math.max(0, t));
    return sy(t);
  };
}
export const EASE = bezier(0.32, 0.72, 0, 1);

// The discrete clock: a 700 ms tween on (.32, .72, 0, 1), for "which one".
export function tween(v, dur = 700) {
  return { from: v, to: v, start: 0, dur, delay: 0 };
}
// Retargets from where it is now, after delay ms (the stagger). The same
// target again does nothing, so calling it on every pointer move is safe.
export function tset(tw, to, now, delay = 0) {
  if (tw.to === to) return;
  tw.from = tval(tw, now);
  tw.to = to;
  tw.start = now;
  tw.delay = delay;
}
export function tval(tw, now) {
  if (calm()) return tw.to;
  const p = (now - tw.start - tw.delay) / tw.dur;
  if (p <= 0) return tw.from;
  if (p >= 1) return tw.to;
  return tw.from + (tw.to - tw.from) * EASE(p);
}
export function tdone(tw, now) {
  return calm() || now - tw.start - tw.delay >= tw.dur;
}

// Rule 02: the delay of item i when the pointer chose item a.
export const stagger = (i, a, step = 40) => Math.abs(i - a) * step;

let calmQuery = null;
// True when the reader asked for less motion. Springs and tweens land at once.
export function calm() {
  if (typeof matchMedia === "undefined") return false;
  calmQuery = calmQuery || matchMedia("(prefers-reduced-motion: reduce)");
  return calmQuery.matches;
}

/* ---------- hit testing against what does not move (rule 01) ---------- */

// The world [x, y] under a viewBox point, on the plane at height z.
// P is the anatomy projection from fitProjection. The plane never moves, so
// the answer never moves with the parts.
export function unproj(P, sx, sy, z = 0) {
  const a = (P.azimuth ?? 45) * Math.PI / 180, e = (P.elevation ?? 30) * Math.PI / 180;
  const k = P.scale * Math.sqrt(1.6);
  const u = (sx - P.origin[0]) / k;
  const w = ((sy - P.origin[1]) / k + z * Math.cos(e)) / Math.sin(e);
  return [u * Math.sin(a) + w * Math.cos(a), -u * Math.cos(a) + w * Math.sin(a)];
}

// How far along a fixed world line the pointer is: the t for which
// from + t * dir lands nearest the viewBox point on screen. Use it for a part
// that travels on a rail or slot: the rail is the static hit area, so a still
// pointer gives a still target. A plane (unproj) suits a field; a line suits
// travel, because a hand moving along the rail on screen means "along it".
export function along(P, [sx, sy], from, dir) {
  const a = (P.azimuth ?? 45) * Math.PI / 180, e = (P.elevation ?? 30) * Math.PI / 180;
  const k = P.scale * Math.sqrt(1.6);
  const at = ([x, y, z]) => [P.origin[0] + (x * Math.sin(a) - y * Math.cos(a)) * k, P.origin[1] + ((x * Math.cos(a) + y * Math.sin(a)) * Math.sin(e) - z * Math.cos(e)) * k];
  const o = at(from), q = at([from[0] + dir[0], from[1] + dir[1], from[2] + dir[2]]);
  const vx = q[0] - o[0], vy = q[1] - o[1], len = vx * vx + vy * vy;
  return len ? ((sx - o[0]) * vx + (sy - o[1]) * vy) / len : 0;
}

// A client point to viewBox units. The svg itself never moves, so this is
// the one DOM measurement a figure may make. Never measure a moving part.
export function toViewBox(svg, clientX, clientY) {
  const m = svg.getScreenCTM();
  if (!m) return [0, 0];
  const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
  return [p.x, p.y];
}

// Index of the item whose REST point is nearest a viewBox point.
// rests: screen points [sx, sy] of each item at rest, computed at build time.
export function nearest(rests, [sx, sy], axis = "x") {
  let best = -1, d = Infinity;
  rests.forEach(([x, y], i) => {
    const q = axis === "x" ? Math.abs(x - sx) : axis === "y" ? Math.abs(y - sy) : Math.hypot(x - sx, y - sy);
    if (q < d) { d = q; best = i; }
  });
  return best;
}

/* ---------- the one loop (rule 07) ---------- */

// Runs tick(dt seconds, now ms) on animation frames while the stage is on
// screen and tick returns true. Sleeps when everything has settled or the
// stage is off screen. Returns { wake, stop }: call wake() after any input.
export function live(stage, tick) {
  let frame = 0, last = 0, visible = false, stopped = false;
  const step = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const more = tick(dt, now);
    frame = !stopped && visible && more ? requestAnimationFrame(step) : 0;
    if (!frame) last = 0;
  };
  const wake = () => { if (!frame && visible && !stopped) frame = requestAnimationFrame(step); };
  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) wake();
  }, { rootMargin: "120px 0px" });
  io.observe(stage);
  const stop = () => { stopped = true; io.disconnect(); if (frame) cancelAnimationFrame(frame); frame = 0; };
  return { wake, stop };
}

/* ---------- the pointer ---------- */

// Calls handlers with points in viewBox units. A touch tap acts as a move then
// a down, since touch has no hover. The page still scrolls (pan-y).
export function pointer(stage, svg, { move, down, leave } = {}) {
  stage.style.touchAction = "pan-y";
  const at = (e) => toViewBox(svg, e.clientX, e.clientY);
  const onMove = (e) => { if (e.pointerType !== "touch" && move) move(at(e)); };
  const onDown = (e) => { const p = at(e); if (move) move(p); if (down) down(p); };
  const onLeave = (e) => { if (e.pointerType !== "touch" && leave) leave(); };
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointerleave", onLeave);
  return () => {
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerdown", onDown);
    stage.removeEventListener("pointerleave", onLeave);
  };
}

/* ---------- the slider ---------- */

// Intensity 0..1 to the figure's own number: two straight lines that meet at
// 0.5, as in Hairline. range is [at 0, at 0.5, at 1]; the middle is the default.
export function rangeAt([lo, mid, hi], i) {
  const v = i <= 0.5 ? lo + (i / 0.5) * (mid - lo) : mid + ((i - 0.5) / 0.5) * (hi - mid);
  return Math.round(v * 1000) / 1000;
}

// Wires the card's slider. onValue gets the figure's own number (on range),
// once now and again on every change. ?intensity=0..1 in the URL sets it
// before the figure starts, for checking either end.
export function slider(root, range, onValue) {
  const input = root.querySelector("[data-intensity]");
  if (!input) throw new Error("slider: the card has no [data-intensity] input; build it with cardHtml");
  const q = typeof location !== "undefined" ? new URLSearchParams(location.search).get("intensity") : null;
  if (q !== null && q.trim() !== "" && Number.isFinite(Number(q))) input.value = String(Math.min(1, Math.max(0, Number(q))));
  const send = () => onValue(rangeAt(range, Number(input.value)));
  input.addEventListener("input", send);
  send();
  return input;
}

/* ---------- the card (build side) ---------- */

// A plain framed card with no words in or on it, and (when slider is true)
// the slider under the drawing. body is the stage markup (a div.iso-stage
// holding the svg). label is the slider's accessible name: read aloud, never shown.
export function cardHtml({ body, label = "Intensity", value = 0.5, slider = true }) {
  const controls = slider
    ? `<div class="hla-controls"><input type="range" min="0" max="1" step="0.01" value="${value}" data-intensity aria-label="${String(label).replace(/"/g, "&quot;")}"></div>`
    : "";
  return `<figure class="iso-figure hla-figure"><div class="iso-plate hla-card">${body}</div>${controls}</figure>`;
}

// Styles for cardHtml. Add them after ISO_CSS: pageHtml({ ..., body: `<style>${LIVE_CSS}</style>` + card }).
export const LIVE_CSS = `
.hla-figure{margin:24px 0}
.hla-card{padding:28px 20px;border-radius:14px}
.hla-card .iso-stage{outline:none;border-radius:10px}
.hla-card .iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.hla-controls{display:flex;align-items:center;margin-top:14px;padding:0 2px}
.hla-controls input[type=range]{flex:1 1 auto;min-width:0;height:32px;margin:0;background:transparent;cursor:pointer;-webkit-appearance:none;appearance:none}
.hla-controls input[type=range]::-webkit-slider-runnable-track{height:1px;background:var(--anatomy-muted)}
.hla-controls input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;margin-top:-6px;border-radius:50%;border:1px solid var(--anatomy-strong);background:var(--anatomy-page)}
.hla-controls input[type=range]::-moz-range-track{height:1px;background:var(--anatomy-muted)}
.hla-controls input[type=range]::-moz-range-thumb{width:11px;height:11px;border-radius:50%;border:1px solid var(--anatomy-strong);background:var(--anatomy-page)}
.hla-controls input[type=range]:focus-visible{outline:1.5px solid var(--anatomy-strong);outline-offset:2px}
`;
