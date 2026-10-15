// interaction-check.mjs: checks a built hairline-anatomy page against the
// interaction rules it can measure, in headless Chrome, through drive.mjs.
//
//   node scripts/interaction-check.mjs page.html [--out dir] [--ambient] [--points "x,y x,y ..."]
//
//   --out dir     where to write the pictures (default: ./shots)
//   --ambient     the figure is meant to keep moving on its own (rule 07 allows a loop)
//   --points      pointer positions to hold still at, as fractions of the stage
//                 (default: "0.2,0.5 0.5,0.5 0.8,0.5 0.5,0.3 0.5,0.7")
//
// It checks, and exits 1 if any line says FAIL:
//   card     the card has no corner words, title, hint, read-out or caption (a slider is optional)
//   console  no errors or exceptions
//   hit      holding the pointer still anywhere, the figure settles: no frames after 1.5 s (rule 01)
//   sleep    after the pointer leaves, the loop stops (rule 07), unless --ambient
//   reach    the drawing stays inside the viewBox (rule 03): at intensity 0 and 1 with a slider,
//            at rest and at the first held point without one
//   calm     under reduced motion a move settles at once (rule 08)
//   words    the svg holds at most one engraved label (anatomy's allowance)
// It also writes rest, each held point, and intensity 0 and 1 to --out: read them.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const page = args.find((a, i) => !a.startsWith("--") && !["--out", "--points"].includes(args[i - 1]));
if (!page) { console.log("usage: node scripts/interaction-check.mjs page.html [--out dir] [--ambient] [--points \"x,y ...\"]"); process.exit(2); }
const out = resolve(opt("--out", "shots"));
const ambient = args.includes("--ambient");
const points = opt("--points", "0.2,0.5 0.5,0.5 0.8,0.5 0.5,0.3 0.5,0.7").split(/\s+/).map((p) => p.split(",").map(Number));
mkdirSync(out, { recursive: true });

const tmp = mkdtempSync(join(tmpdir(), "hla-check-"));
const preload = join(tmp, "count.js");
writeFileSync(preload, "window.__raf=0;const __r=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=(f)=>{window.__raf++;return __r(f)};");
const frames = (ms) => `(()=>{const a=window.__raf;return new Promise(r=>setTimeout(()=>r('frames '+(window.__raf-a)),${ms}))})()`;
const box = `(()=>{const s=document.querySelector('.iso-stage svg');const v=s.viewBox.baseVal;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const el of s.querySelectorAll('path,circle,line,polygon,ellipse,rect')){if(el.closest('defs,mask,clipPath'))continue;let b;try{b=el.getBBox()}catch(e){continue}if(!b.width&&!b.height)continue;const m=el.getCTM(),sm=s.getCTM().inverse().multiply(m);for(const [px,py] of [[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]]){const p=new DOMPoint(px,py).matrixTransform(sm);x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y)}}return 'box '+[x0,y0,x1,y1].map(n=>n.toFixed(1)).join(',')+' view '+[v.x,v.y,v.width,v.height].join(',')})()`;
const setI = (i) => `(()=>{const s=document.querySelector('[data-intensity]');if(!s)return 'no slider';s.value='${i}';s.dispatchEvent(new Event('input'));return 'intensity ${i}'})()`;
const card = `(()=>{const f=document.querySelector('.iso-figure');const bad=[...document.querySelectorAll('.iso-plate-corners,.iso-plate-corner,[data-readout],.iso-legend,.iso-caption,.iso-keys')].length;const slider=!!document.querySelector('[data-intensity]');return 'card words '+bad+' slider '+slider})()`;
const words = `'svg text '+document.querySelectorAll('.iso-stage svg text').length`;

const actions = [["scroll", ".iso-stage"], ["wait", 800], ["eval", card], ["eval", words], ["shot", join(out, "rest.png"), ".iso-figure"]];
points.forEach(([x, y], n) => {
  actions.push(["move", ".iso-stage", x, y], ["wait", 1500], ["eval", frames(800)], ["shot", join(out, `held-${n + 1}.png`), ".iso-figure"]);
});
actions.push(["move", "body", 0.01, 0.01], ["wait", 2000], ["eval", frames(800)]);
for (const i of [0, 1]) {
  actions.push(["eval", setI(i)], ["move", ".iso-stage", points[0][0], points[0][1]], ["wait", 1500], ["eval", box], ["shot", join(out, `intensity-${i}.png`), ".iso-figure"]);
}
actions.push(["eval", setI(0.5)], ["move", "body", 0.01, 0.01], ["wait", 1500], ["eval", box]);

const drive = (extra) => {
  const file = join(tmp, "actions.json");
  return (list) => {
    writeFileSync(file, JSON.stringify(list));
    const r = spawnSync(process.execPath, [join(HERE, "drive.mjs"), resolve(page), "--actions", file, "--preload", preload, "--width", "1000", "--height", "900", ...extra], { encoding: "utf8", timeout: 240000 });
    return (r.stdout || "") + (r.stderr || "");
  };
};
const text = drive([])(actions);
const calmText = drive(["--reduced"])([["scroll", ".iso-stage"], ["wait", 600], ["move", ".iso-stage", points[2][0], points[2][1]], ["wait", 120], ["eval", frames(600)]]);

const evals = [...text.matchAll(/^eval: "?(.*?)"?$/gm)].map((m) => m[1]);
const lines = [];
const ok = (pass, name, detail) => lines.push(`${pass ? "pass" : "FAIL"}  ${name.padEnd(8)} ${detail}`);
if (!evals.length) { console.log(text); console.log("FAIL  drive.mjs gave no results: is Chrome installed? set CHROME_PATH"); process.exit(1); }

const cardLine = evals.find((e) => e.startsWith("card")) || "";
const cw = Number((cardLine.match(/card words (\d+)/) || [])[1] ?? 1);
const hasSlider = /slider true/.test(cardLine);
ok(cw === 0, "card", cardLine.replace("slider true", "slider: yes").replace("slider false", "slider: none"));
const wordLine = evals.find((e) => e.startsWith("svg text")) || "";
ok(Number(wordLine.split(" ").pop()) <= 1, "words", wordLine);
const frameLines = evals.filter((e) => e.startsWith("frames"));
points.forEach(([x, y], n) => {
  const f = Number((frameLines[n] || "frames ?").split(" ")[1]);
  ok(ambient || f === 0, "hit", `held still at ${x},${y}: ${f} frames in 0.8 s after 1.5 s`);
});
const leaveFrames = Number((frameLines[points.length] || "frames ?").split(" ")[1]);
ok(ambient || leaveFrames === 0, "sleep", `after the pointer left: ${leaveFrames} frames in 0.8 s`);
const boxes = evals.filter((e) => e.startsWith("box"));
(hasSlider ? boxes.slice(0, 2) : boxes.slice(1, 3)).forEach((e, n) => {
  const [x0, y0, x1, y1] = e.split(" ")[1].split(",").map(Number);
  const [vx, vy, vw, vh] = e.split(" ")[3].split(",").map(Number);
  const what = hasSlider ? `intensity ${n}` : n === 0 ? "held at the first point" : "at rest";
  ok(x0 >= vx - 0.5 && y0 >= vy - 0.5 && x1 <= vx + vw + 0.5 && y1 <= vy + vh + 0.5, "reach", `${what}: ${e}`);
});
const calmFrames = Number(((calmText.match(/eval: "?frames (\d+)/) || [])[1]) ?? NaN);
ok(ambient || calmFrames <= 2, "calm", `reduced motion, 0.6 s after a move: ${calmFrames} frames`);
const consoleLine = (text.match(/^console:.*$/m) || ["console: ?"])[0];
ok(/clean/.test(consoleLine), "console", consoleLine.replace(/^console:\s*/, ""));
console.log(lines.join("\n"));
console.log(`pictures in ${out}: rest, held-1..${points.length}${hasSlider ? ", intensity-0, intensity-1" : ""}. Read them.`);
process.exit(lines.some((l) => l.startsWith("FAIL")) ? 1 : 0);
