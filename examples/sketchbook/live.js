// Runtime for the sketchbook: builds the figure's SVG, runs one sleeping loop on
// Hairline's spring, and reads the pointer on the stage (kit/live.mjs).
import { spring, stepS, live, pointer } from "../../kit/live.mjs";
import { VIEW, figureMarkup } from "./common.mjs";
import * as book from "./sketchbook.mjs";

function mount(canvas) {
  const fig = book.create(VIEW);
  canvas.insertAdjacentHTML("afterbegin", figureMarkup(fig));
  const svg = canvas.querySelector("svg.hla-svg");
  const groups = fig.groups.filter((g) => g.draw).map((g) => ({ draw: g.draw, el: svg.querySelector(`[data-g="${g.id}"]`) }));
  const stage = canvas;
  const value = spring(fig.rest);
  const lift = spring(0);                         // the float: 0 on the mat, 1 floating
  let drawn = null;
  const draw = () => {
    const key = value.x.toFixed(4) + "/" + lift.x.toFixed(4);
    if (key === drawn) return;
    drawn = key;
    for (const g of groups) g.el.innerHTML = g.draw(value.x, lift.x);
  };
  const loop = live(stage, (dt) => {
    const moving = stepS(value, dt) | stepS(lift, dt);
    draw();
    return moving;
  });
  let spoken = "";
  const aim = (t) => {
    value.t = Math.min(1, Math.max(0, t));
    const w = fig.words(value.t);
    if (w !== spoken) { spoken = w; stage.setAttribute("aria-valuetext", w); stage.setAttribute("aria-valuenow", String(Math.round(value.t * book.N))); }
    loop.wake();
  };
  pointer(stage, svg, { move: (pt) => { lift.t = 1; aim(fig.target(pt)); }, leave: () => { lift.t = 0; aim(fig.rest); } });
  stage.addEventListener("blur", () => { lift.t = 0; aim(fig.rest); });
  stage.addEventListener("keydown", (e) => {
    const step = (e.shiftKey ? 3 : 1) / book.N;
    let to = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") to = value.t - step;      // right is back toward the right-hand pile
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = value.t + step;
    if (e.key === "Home") to = 0;
    if (e.key === "End") to = 1;
    if (e.key === "Escape") to = fig.rest;
    if (to === null) return;
    e.preventDefault();
    aim(to);
  });
  draw();
  stage.setAttribute("aria-valuetext", fig.words(fig.rest));
  canvas.dataset.ready = "true";
}
document.querySelectorAll("[data-hla-figure]").forEach((canvas) => { try { mount(canvas); } catch (error) { console.error("hla figure", error); } });
