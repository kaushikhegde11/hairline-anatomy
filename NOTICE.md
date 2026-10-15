# Notice

hairline-anatomy combines and modifies two MIT-licensed projects. Both licences allow this as long as their copyright notices stay with the software, which `LICENSE` does.

| Part | Origin | Licence |
| --- | --- | --- |
| `kit/` (except `kit/live.mjs`, `kit/theme.css`, `kit/glows.mjs`), `references/`, `scripts/` (except `interaction-check.mjs`, `safe-target.mjs`), the examples `dial-indicator`, `desk-computer`, `arcade-cabinet`, `raptor-engine`, `ripple-tank`, `test-rig`, `spot-plate`, `turning-dial` | [anatomy](https://github.com/wheresryan22/anatomy) by Ryan | MIT |
| The interaction method in `interaction.md` and its helpers in `kit/live.mjs` | [hairline](https://github.com/lucasmarkes/hairline) by Lucas Marques | MIT |
| `SKILL.md`, `kit/theme.css`, `kit/glows.mjs`, `scripts/interaction-check.mjs`, `scripts/safe-target.mjs`, `examples/dial-live`, `examples/landing-figures`, `examples/sketchbook`, and the edits to anatomy's files listed below | Kaushik Hegde | MIT |

Changes made to anatomy's files:

- The browser scripts (`capture.mjs`, `drive.mjs`, `turn-check.mjs`) now open only local files or localhost unless `--allow-remote` is passed, pass `--allow-file-access-from-files` only for local files, and start Chrome with extensions and sync off.
- `examples/desk-computer` draws a neutral logo mark instead of a brand mark.
- Notes in `references/` mark the places where this skill's rules replace the original ones (corner text, read-outs, idle tours), and `references/verify.md` and `references/motion.md` were edited to match.

Names and marks mentioned here belong to their owners. This project is not affiliated with or endorsed by them.
