# Interaction: how the figure answers the pointer

This file carries Hairline's interaction method onto anatomy's machines. Anatomy decides what the object is and how it is built. This file decides how it answers a hand. Every helper named here is in `kit/live.mjs`, and `examples/dial-live/build.mjs` uses them all on a real figure.

## 1. The concept

A concept is two things: **an object** and **what the pointer does to it**. It fits on one line. There is no read-out, so the object must make the answer visible by itself.

1. **Find the object.** A real machine whose working is the idea (anatomy's "the object is the explanation"). Not a diagram.
2. **Find what gives it away.** For each kind of part, name the two or three features that make it what it is. Keep the list: the parts list is built from it and the 4x check looks for it.
3. **Find the variable.** Every idea has one number or one choice that matters: how far, which one, how fast, how long. That is what the pointer gets.
4. **Give the pointer that variable.** Where the pointer is sets a position (continuous). What it is over sets a choice (discrete). The answer is what a hand would expect from the object.
5. **Design the rest pose.** What the object looks like when nobody touches it. It is the thumbnail, so it already says what the figure is about.
6. **Decide on a slider.** A slider is optional. Add one when the figure has one number worth tuning by hand: a radius, a stagger, a gap, a gain, a rate. Write its values at intensity 0, 0.5 and 1 as `RANGE`; the middle one is the default, and the three move one way. Leave it out when the answer itself is the point, for example a figure used as a link or an icon on a page, and fix that number in the model instead (the camera in `examples/landing-figures` closes to f/8 with no slider).

Offer two or three concepts, one line each, and wait for the person to pick:

> **Name.** The object. What the pointer does to it. What the slider changes, if there is one.

Skip this only when the person arrived with the object and the gesture already chosen. If nobody can answer, take the concept with the strongest rest pose and say which you took.

### Six answers already proven

A new figure usually borrows one of these.

| Answer | Example | The pointer | The clock | The slider |
| --- | --- | --- | --- | --- |
| **A field** | pillars rise near the pointer | sets a position; height falls off with distance | a spring per part | the radius |
| **One of many** | the card under the pointer stands up | picks an item; its neighbours part, staggered outwards | tweens | the stagger |
| **Scrub and pick** | a window comes apart in layers | x scrubs the gap, y picks a layer, which gets the lit accent | a spring for the gap | the gap |
| **Paint and decay** | a dot matrix you can draw on | excites what it passes; marks fade; an idle loop returns | a decay per dot | the afterglow |
| **Dilate time** | crates ride a belt through a gate | the world keeps moving; hovering slows it so it can be read | a spring on the rate | the rate |
| **Push the camera** | a platter you flick round | pushes; friction bleeds the spin; detents catch it | friction, then a spring | the coast |

Anatomy's own patterns fit inside these: an exploded view is "scrub and pick", a carriage on a rail is "a field" along one axis, a dial you turn is "push the camera" (3D mode).

### A weak concept

Drop it or fix it when: it is dead at rest; it needs words to be understood; it holds two ideas (two gestures, two variables, two objects); the pointer has no reason to be there; it is a diagram; it is an icon (a padlock for "security"); it depends on colour.

## 2. The rules

Hairline has ten rules. Seven are about interaction and apply here as written, adapted to the anatomy kit. The other three (06 honesty, 09 radius, 10 quiet) are about drawing, and anatomy's craft rules replace them: painter's order and the audit, four-tone solids, and at most one tiny engraved label.

### 01 · hit: hit areas don't move

Test the pointer against the rest pose or the target pose, never the pose on screen. Otherwise the part lifts out from under the pointer, the hover drops, the part falls back, and the hover returns: a flicker loop.

- A field: `unproj(P, sx, sy, z)` puts the pointer on a plane that never moves.
- Travel on a rail or slot: `along(P, pt, from, dir)` reads how far along the rail line the pointer is.
- Items: compute each item's rest point on screen at build time and pick with `nearest(rests, pt)`. For parts at different heights, `unproj` onto each part's own rest top and take the nearest middle.
- When a choice depends on a moving value, read the spring's target (`.t`), not its position (`.x`).
- The only DOM measurement allowed is the svg itself (`toViewBox`, used by `pointer`). Never `getBoundingClientRect` on a moving part, `elementFromPoint`, or `:hover`.
- **Rejected when** a still pointer on a moving edge makes the figure oscillate. `scripts/interaction-check.mjs` holds the pointer still at five points and fails on any frame after 1.5 s.

### 02 · order: stagger by distance, safety wins

`delay = |i − a| × step`, with `stagger(i, a, step)`. The motion spreads out from what the pointer touched instead of running down a list. A step of 30 to 60 ms reads as one gesture.

- **Safety wins.** When parts staggered this way would pass through each other (an explode, parts threaded through each other), use anatomy's assembly order for those parts instead: outer parts leave first, and closing reverses it (`references/motion.md`, "Exploded views"). The audit decides, not the eye: if `node build.mjs --audit` fails with the pointer-distance order, switch the parts it names to the safe order.
- **Rejected when** items move in index order whatever was touched, all move at once when the idea is a spread, or the last starts after the first has landed.

### 03 · reach: clamp the reach

The answer has a far end, and the figure is still composed there.

- A falloff that reaches a floor; `Math.min`/`Math.max` on every lift, gap and lean; fit the camera with `fitProjection` to the most extreme pose (pass the lifted points), so nothing leaves the viewBox with the slider at 1.
- **Rejected when** at the far end of the answer (and at either end of the slider, when there is one) the figure comes apart, overlaps itself or leaves the frame. The checker measures the drawing's box at intensity 0 and 1, or at rest and at each held point when there is no slider.

### 04 · accent: one lit part

Anatomy already allows exactly one `lit` accent. Hairline adds how it moves:

- At rest, the lit part says where the eye should start.
- When the pointer chooses an item, the lit accent moves to what it chose and the rest mark gives it up. Use `data-on` on the chosen item and `data-focus` on the figure, as in `references/motion.md`, "Selection". Never two lit places at once.
- When the pointer sets a position (a field), the lit part is the one that answers it (the plunger and needle in `dial-live`), and it stays lit.
- **Rejected when** two places are lit at once, the rest mark stays lit beside the pointer's choice, or lit is decoration.

### 05 · rest: rest is designed, never flat

When the pointer leaves, the figure returns to a composition: a lean, a slight explode, a carriage parked off centre. The still frame is the thumbnail.

- Give every moving part a rest value that is not zero and not uniform. In `dial-live` the plunger rests on the middle block, a little off centre.
- `leave` sets every target back to rest. Then the loop settles and sleeps.
- **Idle tour only when the idea is ongoing motion** (a belt, a flow, a decay that returns). Then play anatomy's tour (`references/motion.md`, "Idle tour") and pass `--ambient` to the checker. Otherwise there is no tour.
- **Rejected when** at rest the figure is flat, symmetric, or looks like nothing has loaded.

### 07 · cost: the loop sleeps

All motion runs in one `live(stage, tick)` loop. `tick(dt, now)` returns `true` only while something still moves. Call `wake()` after every input.

- The loop stops when settled, stops offscreen (IntersectionObserver), and under reduced motion springs and tweens land at once.
- Keep the last drawn value and skip the write when it did not change.
- No `setInterval`, no second `requestAnimationFrame`, no CSS animation (anatomy's `data-flow` and `data-pulse` only for an ambient figure).
- **Rejected when** the checker sees frames after the pointer has left or held still.

### 08 · clock: two clocks

- **Which one** (a discrete choice) gets a 700 ms tween on `(.32, .72, 0, 1)`: `tween`, `tset(tw, to, now, delay)`, `tval`, `tdone`.
- **Where** (a continuous input) gets a spring, `k 100 · c 18 · m 1`: `spring(x)`, write `.t`, `stepS(sp, dt)`.
- Use these defaults unless the figure has a reason you can state. A real spring in the object is such a reason: `dial-live` keeps the plunger's own spring (420, 26) because it is a spring-loaded plunger. Anatomy's `settle` and physical springs stay available for that.
- **Rejected when** a tween follows the pointer's position, a spring animates a choice between items, constants are invented without a reason, or anything is linear.

## 3. The card and the optional slider

- **A plain framed card.** Thin rounded border. No words in or on it: no `Fig n`, no title, no hint, no read-out, no legend, no caption. Build it with `cardHtml({ body, label })`, not anatomy's `plateHtml`. Add `LIVE_CSS` after the kit's styles.
- **A slider, when the figure has one, sits under the drawing.** It carries an `aria-label` (read aloud, never shown). Wire it with `slider(figureEl, RANGE, onValue)`: `onValue` gets the figure's own number on `RANGE`, once at start and on every change. Ease the number with a spring so a slider drag never snaps a part. `?intensity=0` or `?intensity=1` in the page address sets it before the figure starts, for checking either end.
- **No slider:** `cardHtml({ body, slider: false })`, and fix the number in the model.
- **Inside a host page** (a portfolio, a docs site): keep the host's own card, caption and link, and use `kit/theme.css` so the figure takes the host's palette in both themes. See section 5.
- **Accessibility stays.** The stage is focusable (`tabindex="0"`), with a `role`, an `aria-label` explaining the controls, and `aria-valuetext` in words, written only when the reader's choice changes, never per frame. Keys: arrows step, Shift for bigger steps, Home and End go to the extremes, Escape returns to rest.

## 4. Page skeleton

```js
import * as k from "<skill>/kit/iso-kit.mjs";
import { kitScript, liveScript } from "<skill>/scripts/inline-kit.mjs";
import { cardHtml, LIVE_CSS } from "<skill>/kit/live.mjs";
// ... anatomy geometry: P = k.fitProjection(...), solids, figureSvg(...)

const live = `
const P = ${JSON.stringify(P)};
const RANGE = [a, b, c];
const figure = document.querySelector(".hla-figure");
const stage = figure.querySelector(".iso-stage"), svg = stage.querySelector("svg");
const part = spring(REST);                       // where
const loop = live(stage, (dt, now) => {
  const moving = stepS(part, dt);
  /* write transforms and paths through refs, skipping unchanged values */
  return moving;
});
pointer(stage, svg, {
  move: (pt) => { part.t = Math.min(MAX, Math.max(MIN, along(P, pt, FROM, DIR))); loop.wake(); },
  leave: () => { part.t = REST; loop.wake(); },
});
slider(figure, RANGE, (v) => { /* retarget the slider's spring */ loop.wake(); });
`;
const body = cardHtml({ label: "…", body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="…">${svg}</div>` });
writeFileSync(out, k.pageHtml({ title, theme, body: `<style>${LIVE_CSS}</style>` + body, script: kitScript() + liveScript() + live }));
```

With a shader: `kitScript() + liveScript() + glScript() + live`. With 3D: `turnScript() + liveScript() + glScript() + live`, and drive the turn group's target from the pointer with the same rules.

## 5. Figures inside a host page

`examples/landing-figures/` is four figures built for a portfolio landing page: an easel whose side monitor swings out, a camera whose iris closes while its knurled zoom ring turns and the lens slides out, a laptop whose lid follows the pointer's height, and a book whose seven pages fan out evenly as it opens. Its `README.md` explains the pattern; in short:

- **One module per figure** returns `{ P, rest, label, groups, target, glow? }`. `groups` is a list of `{ id, markup }` (drawn once) and `{ id, draw(t) }` (rebuilt when the pointer value `t` changes). `target(pt)` turns a viewBox point into `t`, measured against something that never moves (rule 01).
- **One host runtime** (`host-live.js`) finds every `[data-hla-figure]`, builds its SVG, runs one sleeping `live()` loop per figure on Hairline's spring, wires `pointer()` to the nearest `[data-hla-stage]` (the host's link or card), and adds the WebGL light from `kit/glows.mjs` when the figure asks for it.
- **The host keeps its palette.** `kit/theme.css` maps the kit's tones onto three host colours, `--paper`, `--accent` and `--ink` (override `--hla-paper`, `--hla-line`, `--hla-ink` if the host names them differently): faces stay grey, every line takes the accent, and `[data-dark]` (set by the runtime from the page's theme) switches the shading for dark pages.
- **No hover colour change** unless the host asks for one: the object's motion is the answer.
- **A still for visitors without scripts:** write the rest pose to an SVG file and put it in a `<noscript><img></noscript>` inside each canvas.
- `node examples/landing-figures/demo.mjs` writes one self-contained page with all four, for review in any browser (it works from a file or from `localhost`).
