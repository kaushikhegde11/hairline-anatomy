// Shared helpers for the portfolio's hairline-anatomy figures.
// Runs in Node (build) and in the browser (live), so it imports only the kit.
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";

export { k, G };
export const VIEW = [600, 420];

export const S = (paths, style) => k.solidSvg(paths, style);
export const L = (d, style) => k.lineSvg(d, style);
export const D = (points, style) => k.dotsSvg(points, style);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth01 = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

// Closeness of a viewBox point to a fixed rest point: 1 on it, 0 far away.
// The rest point never moves, so a still pointer gives a still target (rule 01).
export const nearness = (pt, centre, inner = 18, reach = 170) =>
  1 - smooth01((Math.hypot(pt[0] - centre[0], pt[1] - centre[1]) - inner) / reach);

// A rounded rectangle as [u, v] points in a frame's plane, centred on 0.
export function roundRect(w, h, r, steps = 4) {
  const pts = [];
  const cs = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 1], [-w / 2 + r, -h / 2 + r, 2], [w / 2 - r, -h / 2 + r, 3]];
  for (const [cx, cy, q] of cs) {
    for (let i = 0; i <= steps; i++) {
      const a = (q * Math.PI) / 2 + (i / steps) * (Math.PI / 2);
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return pts;
}

// A path through world points.
export const pathW = (P, pts, closed = false) => k.pathOf(pts.map((p) => k.iso(p, P)), closed);

// Point in a frame's plane: origin + u*x + v*y + a*s.
export const at = (F, x, y, s = 0) => [
  F.o[0] + F.u[0] * x + F.v[0] * y + F.a[0] * s,
  F.o[1] + F.u[1] * x + F.v[1] * y + F.a[1] * s,
  F.o[2] + F.u[2] * x + F.v[2] * y + F.a[2] * s,
];

export function svgOpen(label, extra = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg hla-svg" viewBox="0 0 ${VIEW[0]} ${VIEW[1]}" role="img" aria-label="${label.replace(/"/g, "&quot;")}"${extra}>`;
}

// The whole figure at one value of its pointer variable (the rest pose by default).
export function figureMarkup(fig, t = fig.rest) {
  return svgOpen(fig.label) + fig.groups.map((g) => `<g data-g="${g.id}">${g.markup ?? g.draw(t)}</g>`).join("") + "</svg>";
}
