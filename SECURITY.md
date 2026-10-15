# Security

## Scope

hairline-anatomy is a set of instructions, a drawing kit and local Node scripts. It makes no network calls except to Chrome's DevTools port on `127.0.0.1`, installs nothing and downloads nothing.

The scripts that start Chrome (`capture.mjs`, `drive.mjs`, `lines.mjs`, `interaction-check.mjs`, `turn-check.mjs`):

- run it headless with a throwaway profile that is deleted on exit, and with its sandbox on;
- open a local file or a `localhost` server by default, and refuse any other host unless `--allow-remote` is passed (`scripts/safe-target.mjs`);
- pass `--allow-file-access-from-files` only when the page is a local file;
- let `drive.mjs` run JavaScript in the page it opens, so point it only at pages you built.

A security problem is anything here that could make a page, a prompt or a file run code, read files or reach the network in a way the user did not ask for: in the kit, the scripts, the example pages, or in instructions in `SKILL.md` and `references/` that could lead an agent to do something unsafe.

## Supported versions

The latest commit on `main`.

## Reporting

Please do not open a public issue. Use GitHub's private vulnerability reporting for this repository (Security tab, "Report a vulnerability"). Include what you found, how to reproduce it and what it could allow.

Problems that belong to the upstream projects (the kit's drawing and audit code from [anatomy](https://github.com/wheresryan22/anatomy), the interaction method from [Hairline](https://github.com/lucasmarkes/hairline)) are best reported to them as well.
