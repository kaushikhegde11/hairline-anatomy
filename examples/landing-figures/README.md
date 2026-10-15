# Landing figures

Four lighter hairline-anatomy figures built to sit inside someone's own page, as the section links of a portfolio landing page. No slider, no words in the drawings, the host's palette in light and dark.

| Figure | The pointer | Rest | Light |
| --- | --- | --- | --- |
| `easel` | Nearer the hinge, the monitor on its arm swings out beside the canvas | Monitor half tucked | none |
| `camera` | Nearer the lens, the iris closes to f/8, the wide knurled zoom ring turns and the lens front slides out | Half closed | `led`: a blue status light on the grip |
| `laptop` | The pointer's height sets the lid angle (18 to 112 degrees) | Half open | `screen`: a dim screen glow that grows as the lid opens and spills onto the keys |
| `book` | Nearer the book, it opens wider; seven pages always fan out evenly between the covers | Slightly open | none |

Run `node examples/landing-figures/demo.mjs` from the skill folder. It writes `landing-figures-demo.html` (one self-contained page with all four and a light/dark switch; it opens from the file or from `localhost`) and `stills/<name>.svg` (the rest poses, for `<noscript>`).

## The pattern

**One module per figure** (`figures/<name>.mjs`) exports `create(VIEW)` and returns:

- `P`: the projection, fitted to the most extreme pose (rule 03);
- `rest`: the pointer value the figure returns to (rule 05);
- `label`: the accessible description;
- `groups`: `{ id, markup }` for parts drawn once, `{ id, draw(t) }` for parts rebuilt when the pointer value `t` (0 to 1) changes; groups are painted in list order, and a group that reorders itself (the book's leaves) sorts inside `draw`;
- `target(pt)`: a viewBox point to `t`, measured against something that never moves (rule 01): `nearness` to a rest point, the card's height, a rail line;
- `glow` (optional): `{ kind, ...data }` for a recipe in `kit/glows.mjs`, plus `values(t)` for per-frame uniforms.

**One runtime** (`host-live.js`) finds every `[data-hla-figure]`, builds its SVG (or reuses one already in the page), puts the pointer on the nearest `[data-hla-stage]`, runs one `live()` loop per figure with Hairline's spring on `t`, redraws only the groups that move and only when `t` changed, adds the WebGL layer for figures that ask for light (fading it in once), and follows the page's theme (`data-theme` on the root, or the system setting). Arrow keys step `t`, Home and End go to the ends, Escape returns to rest.

**The host's palette** comes through `kit/theme.css`. The host defines `--paper`, `--accent` and `--ink` (or sets `--hla-paper`, `--hla-line`, `--hla-ink` on `.hla-fig`). Faces stay grey, every line takes the accent, and hover changes no colours unless the host asks for it.

## Putting them on a page

```html
<link rel="stylesheet" href="iso.css">          <!-- the kit's ISO_CSS (kit/iso.css) -->
<link rel="stylesheet" href="theme.css">        <!-- kit/theme.css -->
<a class="card" href="#photography" data-hla-stage aria-label="Explore Photography">
  <div class="canvas hla-fig iso" data-hla-figure="camera" aria-hidden="true">
    <noscript><img class="hla-still" src="stills/camera.svg" alt="" width="500" height="400"></noscript>
  </div>
</a>
<script type="module" src="host-live.js"></script>
```

Give each canvas a 5:4 box (the figures use a 500 x 400 viewBox) and `position: relative`. Keep `kit/` and this folder in the same relative places, or change the four import lines at the top of `host-live.js` and `figures/common.mjs`. A page that loads modules has to be served (`python3 -m http.server`), not opened as a file.

## Checks these passed

In headless Chromium, light and dark: every figure ready, the two lights running, no frames with the pointer held still on each figure or after it left, no colour change on hover, reduced motion landing at once, no sideways scroll at 390 px, a clean console.
