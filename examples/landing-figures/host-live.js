// Host runtime for hairline-anatomy figures on an ordinary page.
// Every [data-hla-figure="name"] element becomes a live figure: its SVG is
// built here, the pointer is read on the nearest [data-hla-stage] (the host's
// link or card), each figure runs one sleeping loop on Hairline's spring, and
// figures that ask for light get the WebGL layer from kit/glows.mjs.
// Keep the relative paths below, or adjust them to where kit/ lives.
import { spring, stepS, live, pointer } from "../../kit/live.mjs";
import { glLayer, glCamera, smooth } from "../../kit/gl.mjs";
import { VIEW, figureMarkup } from "./figures/common.mjs";
import * as GLOWS from "../../kit/glows.mjs";

const FIGURES = {
  camera: () => import("./figures/camera.mjs"),
  easel: () => import("./figures/easel.mjs"),
  laptop: () => import("./figures/laptop.mjs"),
  book: () => import("./figures/book.mjs"),
};
const root = document.documentElement;
const darkQuery = matchMedia("(prefers-color-scheme: dark)");
const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : darkQuery.matches);
// The host's line colour, resolved through any var() chain by a probe element.
const lineColour = (el) => {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;color:var(--hla-line, var(--accent, #2b4cff))";
  el.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g) || ["43", "76", "255"];
  probe.remove();
  return m.slice(0, 3).map((v) => Number(v) / 255);
};
const themeOf = (el) => ({ light: isDark() ? 0 : 1, blue: lineColour(el) });
const views = [];

async function mount(canvas) {
  const key = canvas.dataset.hlaFigure;
  if (!FIGURES[key]) return;
  const mod = await FIGURES[key]();
  const fig = mod.create(VIEW);
  let svg = canvas.querySelector("svg.hla-svg");
  if (!svg) {
    canvas.insertAdjacentHTML("afterbegin", figureMarkup(fig));
    svg = canvas.querySelector("svg.hla-svg");
  }
  const groups = fig.groups.filter((g) => g.draw).map((g) => ({ draw: g.draw, el: svg.querySelector(`[data-g="${g.id}"]`) }));
  const stage = canvas.closest("[data-hla-stage]") || canvas;
  const value = spring(fig.rest);
  const view = { canvas, fig, value, glow: null, level: { x: 0, v: 0 }, drawn: null };

  // light, when the figure has one
  if (fig.glow && GLOWS[fig.glow.kind]) {
    const kind = GLOWS[fig.glow.kind];
    const gl = document.createElement("canvas");
    gl.className = "hla-gl";
    gl.setAttribute("aria-hidden", "true");
    canvas.appendChild(gl);
    const build = () => glLayer({ canvas: gl, fragment: kind.fragment, view: VIEW, camera: glCamera(fig.P), uniforms: kind.uniforms, fixed: kind.fixed(fig.glow, themeOf(canvas)), onError: () => {} });
    view.glow = { kind, canvas: gl, layer: build(), rebuild: build };
    if (view.glow.layer) canvas.setAttribute("data-gl", "");
    else gl.remove();
  }
  const paintTheme = () => {
    canvas.toggleAttribute("data-dark", isDark());
    if (view.glow && view.glow.layer) { view.glow.layer.set(view.glow.kind.fixed(fig.glow, themeOf(canvas))); view.drawn = null; }
  };
  paintTheme();

  let first = 0;
  const draw = (now) => {
    const t = value.x;
    const level = view.glow ? Math.round(view.level.x * 1000) / 1000 : 0;
    const key = t.toFixed(4) + "/" + level;
    if (key === view.drawn) return;
    if (view.drawn === null || t.toFixed(4) !== view.drawn.split("/")[0]) for (const g of groups) g.el.innerHTML = g.draw(t);
    view.drawn = key;
    if (view.glow && view.glow.layer) {
      const extra = fig.glow.values ? fig.glow.values(t) : {};
      view.glow.layer.draw({ uLevel: view.level.x, ...extra }, 0.8);
    }
  };
  const loop = live(stage, (dt, now) => {
    const moving = stepS(value, dt);
    let fading = false;
    if (view.glow && view.glow.layer) {
      if (!first) first = now;
      const want = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : smooth(0, 1, (now - first) / 900);
      fading = Math.abs(want - view.level.x) > 1e-3;
      view.level.x = want;
    }
    draw(now);
    return moving || fading;
  });
  view.wake = loop.wake;
  view.repaint = () => { paintTheme(); loop.wake(); draw(performance.now()); };
  const aim = (t) => { value.t = Math.min(1, Math.max(0, t)); loop.wake(); };
  pointer(stage, svg, { move: (pt) => aim(fig.target(pt)), leave: () => aim(fig.rest) });
  stage.addEventListener("blur", () => aim(fig.rest));
  stage.addEventListener("keydown", (e) => {
    let to = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") to = value.t + (e.shiftKey ? 0.5 : 0.1);
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = value.t - (e.shiftKey ? 0.5 : 0.1);
    if (e.key === "Home") to = 0;
    if (e.key === "End") to = 1;
    if (e.key === "Escape") to = fig.rest;
    if (to === null) return;
    e.preventDefault();
    aim(to);
  });
  canvas.dataset.ready = "true";
  views.push(view);
}

const repaintAll = () => views.forEach((v) => v.repaint());
new MutationObserver(repaintAll).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
darkQuery.addEventListener("change", repaintAll);
document.querySelectorAll("[data-hla-figure]").forEach((canvas) => mount(canvas).catch((error) => console.error("hla figure", canvas.dataset.hlaFigure, error)));
