// Writes sketchbook.html (self-contained: opens from a file or localhost) and
// sketchbook-still.svg (the rest pose, for <noscript>).   node build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ISO_CSS } from "../../kit/iso-kit.mjs";
import { cardHtml, LIVE_CSS } from "../../kit/live.mjs";
import { VIEW, figureMarkup } from "./common.mjs";
import * as book from "./sketchbook.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const ORDER = ["kit/iso-kit.mjs", "kit/lathe.mjs", "kit/tube.mjs", "kit/live.mjs", "examples/sketchbook/common.mjs", "examples/sketchbook/sketchbook.mjs", "examples/sketchbook/live.js"];

// one classic script: each module wrapped in a function, imports resolved by path
function wrap(file) {
  let code = readFileSync(join(ROOT, file), "utf8");
  const key = (spec) => resolve(ROOT, dirname(file), spec.replace(/\?.*$/, "")).slice(ROOT.length + 1);
  const names = [];
  code = code.replace(/^import \* as (\w+) from "([^"]+)";$/gm, (_, n, s) => `const ${n} = __M["${key(s)}"];`);
  code = code.replace(/^import \{([^}]+)\} from "([^"]+)";$/gm, (_, list, s) => `const {${list.replace(/(\w+) as (\w+)/g, "$1: $2")}} = __M["${key(s)}"];`);
  code = code.replace(/^export \{([^}]+)\};$/gm, (_, list) => { names.push(...list.split(",").map((x) => x.trim())); return ""; });
  code = code.replace(/^export (async function|function|const|let|class) (\w+)/gm, (_, kind, n) => { names.push(n); return `${kind} ${n}`; });
  if (/^\s*(import|export)\b/m.test(code)) throw new Error("unbundled import/export left in " + file);
  return `__M["${file}"] = (() => {\n${code}\nreturn { ${names.join(", ")} };\n})();\n`;
}
const js = ("const __M = {};\n" + ORDER.map(wrap).join("\n")).replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");

const PAGE = `*{box-sizing:border-box}
html{color-scheme:dark}
html[data-theme="light"]{color-scheme:light}
body{margin:0;background:var(--anatomy-page);color:var(--anatomy-text);-webkit-font-smoothing:antialiased}
.ap-page{width:100%;max-width:680px;margin:0 auto;padding-inline:16px;padding-block:32px 48px}
.iso-stage{display:block;position:relative;touch-action:pan-y;user-select:none}
.iso-stage .iso-svg{display:block;width:100%;height:auto}`;

const fig = book.create(VIEW);
const stillBody = figureMarkup(fig, fig.rest).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
const stillSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW[0]} ${VIEW[1]}"><style>${ISO_CSS}</style><g class="iso">${stillBody}</g></svg>`;
writeFileSync(join(HERE, "sketchbook-still.svg"), stillSvg);

const label = "A spiral-bound sketchbook lying open on a cutting mat. It floats slightly while the pointer is over it. Sweep the pointer along the book to turn its leaves. Arrow keys, Home, End and Escape work when focused.";
const stage = `<div class="iso-stage" tabindex="0" role="slider" aria-label="${label}" aria-valuemin="0" aria-valuemax="${book.N}" aria-valuenow="1" aria-valuetext="1 of ${book.N} leaves turned" data-hla-figure="sketchbook"><noscript>${stillSvg.replace(/<style>.*?<\/style>/, "")}</noscript></div>`;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sketchbook</title>
<style>${ISO_CSS}
${LIVE_CSS}
${PAGE}</style>
</head>
<body class="iso">
<main class="ap-page">
<script>(function(){var r=document.documentElement,b=document.body,q=matchMedia("(prefers-color-scheme: dark)");function s(){var t=q.matches?"dark":"light";r.dataset.theme=t;b.dataset.theme=t}s();q.addEventListener("change",s)})()</script>
${cardHtml({ body: stage, slider: false })}
<script>
(function(){
${js}
})();
</script>
</main>
</body>
</html>
`;
writeFileSync(join(HERE, "sketchbook.html"), html);
console.log("wrote sketchbook.html", (html.length / 1024).toFixed(0) + " KB, sketchbook-still.svg");
