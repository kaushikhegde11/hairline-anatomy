// Writes a self-contained review page with all four landing figures, plus a
// still SVG of each rest pose for <noscript>. The page has no imports, so it
// opens from a file or from localhost in any browser.
//   node examples/landing-figures/demo.mjs            (from the skill folder)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { ISO_CSS } from "../../kit/iso-kit.mjs";
import { VIEW, figureMarkup } from "./figures/common.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const ORDER = ["kit/iso-kit.mjs", "kit/lathe.mjs", "kit/live.mjs", "kit/gl.mjs", "kit/glows.mjs",
  "examples/landing-figures/figures/common.mjs", "examples/landing-figures/figures/camera.mjs", "examples/landing-figures/figures/easel.mjs",
  "examples/landing-figures/figures/laptop.mjs", "examples/landing-figures/figures/book.mjs", "examples/landing-figures/host-live.js"];
const CARDS = [
  { key: "easel", title: "Design", line: "An easel; its side monitor swings out as you come near the hinge." },
  { key: "camera", title: "Photography", line: "The iris closes near the lens; the knurled zoom ring turns and the lens slides out." },
  { key: "laptop", title: "Projects", line: "The lid follows the pointer's height; the screen's blue light grows as it opens." },
  { key: "book", title: "About", line: "The nearer the pointer, the wider it opens; seven pages fan out evenly." },
];

// one classic script: each module wrapped in a function, imports resolved by path
function wrap(file) {
  let code = readFileSync(join(ROOT, file), "utf8");
  const here = dirname(file);
  const key = (spec) => relative(ROOT, resolve(ROOT, here, spec.replace(/\?.*$/, ""))).replace(/\\/g, "/");
  const names = [];
  code = code.replace(/^import \* as (\w+) from "([^"]+)";$/gm, (_, n, s) => `const ${n} = __M["${key(s)}"];`);
  code = code.replace(/^import \{([^}]+)\} from "([^"]+)";$/gm, (_, list, s) => `const {${list.replace(/(\w+) as (\w+)/g, "$1: $2")}} = __M["${key(s)}"];`);
  code = code.replace(/^export \{([^}]+)\};$/gm, (_, list) => { names.push(...list.split(",").map((x) => x.trim())); return ""; });
  code = code.replace(/^export (async function|function|const|let|class) (\w+)/gm, (_, kind, n) => { names.push(n); return `${kind} ${n}`; });
  code = code.replace(/import\("([^"]+)"\)/g, (_, s) => `Promise.resolve(__M["${key(s)}"])`);
  if (/^\s*(import|export)\b/m.test(code)) throw new Error("unbundled import/export left in " + file);
  return `__M["${file}"] = (() => {\n${code}\nreturn { ${names.join(", ")} };\n})();\n`;
}
const js = ("const __M = {};\n" + ORDER.map(wrap).join("\n")).replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");
const THEME = readFileSync(join(ROOT, "kit/theme.css"), "utf8");

// a neutral host: paper, accent and ink in light and dark
const TOKENS = `:root{--paper:#FAFAF8;--accent:#2B4CFF;--ink:#15171C;--muted:#5C6070;--rule:#E3E5EE;color-scheme:light}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--paper:#10152B;--accent:#6C8CFF;--ink:#F1F2F8;--muted:#8890B0;--rule:#262D4D;color-scheme:dark}}
:root[data-theme="dark"]{--paper:#10152B;--accent:#6C8CFF;--ink:#F1F2F8;--muted:#8890B0;--rule:#262D4D;color-scheme:dark}`;
const PAGE = `*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.lf-bar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding-block:12px;padding-inline:16px;border-bottom:1px solid var(--rule);font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;color:var(--muted)}
.lf-bar button{font:inherit;color:var(--accent);background:transparent;border:1px solid var(--accent);border-radius:999px;padding:6px 14px;cursor:pointer}
.lf-bar button:focus-visible,.lf-stage:focus-visible{outline:2px solid var(--accent);outline-offset:4px}
main{max-width:1400px;margin:0 auto;padding-block:40px 64px;padding-inline:16px}
.lf-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px}
@media (max-width:1100px){.lf-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:640px){.lf-grid{grid-template-columns:1fr}}
.lf-card{margin:0;min-width:0}
.lf-stage{display:grid;place-items:center;aspect-ratio:5/4;padding:clamp(12px,2vw,28px);border-block:1px solid var(--rule);background:var(--paper)}
.lf-canvas{position:relative;inline-size:100%;max-inline-size:400px;aspect-ratio:5/4;touch-action:pan-y;user-select:none}
.lf-card h2{margin:14px 0 4px;font:500 22px/1.2 ui-serif,Georgia,serif;letter-spacing:.06em;text-transform:uppercase}
.lf-card p{margin:0;color:var(--muted);font-size:14px}`;

const cards = CARDS.map((c) => `<figure class="lf-card"><div class="lf-stage" tabindex="0" data-hla-stage aria-label="${c.title}: ${c.line}"><div class="lf-canvas hla-fig iso" data-hla-figure="${c.key}" aria-hidden="true"></div></div><figcaption><h2>${c.title}</h2><p>${c.line}</p></figcaption></figure>`).join("\n");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Landing Figures Demo</title>
<style>${TOKENS}
${ISO_CSS}
${THEME}
${PAGE}</style>
</head>
<body>
<div class="lf-bar"><span>hairline-anatomy · landing figures · move the pointer near each object; keys work when a card is focused</span><button type="button" id="lf-theme">Switch to dark</button></div>
<main><div class="lf-grid">
${cards}
</div></main>
<script>
(function(){
  var b=document.getElementById("lf-theme"), r=document.documentElement;
  function dark(){return r.dataset.theme? r.dataset.theme==="dark" : matchMedia("(prefers-color-scheme: dark)").matches;}
  function label(){b.textContent=dark()?"Switch to light":"Switch to dark";}
  b.addEventListener("click",function(){r.dataset.theme=dark()?"light":"dark";label();});
  label();
})();
</script>
<script>
(function(){
${js}
})();
</script>
</body>
</html>
`;
writeFileSync(join(HERE, "landing-figures-demo.html"), html);

// stills for <noscript>: the host tokens written into each file
mkdirSync(join(HERE, "stills"), { recursive: true });
const STILL_TOKENS = `.hla-root{--paper:#FAFAF8;--accent:#2B4CFF;--ink:#15171C}`;
for (const c of CARDS) {
  const fig = (await import(`./figures/${c.key}.mjs`)).create(VIEW);
  const body = figureMarkup(fig).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  writeFileSync(join(HERE, "stills", c.key + ".svg"), `<svg xmlns="http://www.w3.org/2000/svg" class="hla-root" viewBox="0 0 ${VIEW[0]} ${VIEW[1]}"><style>${STILL_TOKENS}${ISO_CSS}${THEME}</style><g class="hla-fig iso">${body}</g></svg>`);
}
console.log("wrote landing-figures-demo.html", (html.length / 1024).toFixed(0) + " KB, and stills/*.svg");
