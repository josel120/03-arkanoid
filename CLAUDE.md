# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Greenfield. Per `README.md`, the goal is a playable Arkanoid/Breakout game built with **HTML, CSS and vanilla JavaScript, zero dependencies**. Nothing is implemented yet — the repo currently contains only art/sound assets and the spec-driven workflow skills.

The README is written in Spanish; match the user's language when replying.

## Hard constraints

- **Zero dependencies.** No npm packages, no frameworks, no bundlers, no CDN links. This is the stated point of the project, not an incidental choice.
- `assets/spritesheet.js` is a **classic script with top-level globals** (`SPRITES`, `EXPLOSION_FRAMES`, `loadSpritesheet`, `drawSprite`, `drawFrame`) — no `export`/`import`. Load it with a plain `<script>` tag. Introducing ES modules means rewriting it or wrapping it.
- Asset paths inside `spritesheet.js` are **relative to the page** (`assets/spritesheet-breakout.png`), so the HTML entry point must live at the repo root and be served from there.

## Running

There is no build, lint, or test tooling, and no `package.json`. The game runs by opening the entry HTML file. Prefer a static server over `file://` so relative asset loading and any future `fetch`/canvas pixel reads behave:

```sh
python -m http.server 8000    # then open http://localhost:8000
```

## Rendering layer (`assets/spritesheet.js`)

The only pre-existing code. It wraps a Breakout spritesheet PNG and is the intended drawing path for paddle, ball, blocks and explosions.

- `loadSpritesheet(cb)` — async, queues callbacks until the image is ready. The image is blitted into an **offscreen canvas** which becomes the actual draw source. **Start the game loop from inside this callback**; every draw call is a silent no-op (`if (!ssLoaded) return;`) before load completes, so drawing early yields a blank screen with no error.
- `drawSprite(ctx, name, x, y, w, h)` — `name` is `'paddle'`, `'ball'`, or a block keyed by the `block_` prefix: `'block_red'`, `'block_cyan'`, `'block_green'`, `'block_magenta'`, `'block_yellow'`, `'block_hotpink'`, `'block_gray'`.
- `drawFrame(ctx, frame, x, y, w, h)` — draws one raw `{sx, sy, sw, sh}` rect, used for explosion animation frames.
- `EXPLOSION_FRAMES[color]` — 4 frames per block color, meant to play over `EXPLOSION_DURATION` (150 ms total). `gray` reuses the red frames.
- Native sprite sizes: blocks 32×16, paddle 162×14, ball 16×16 — useful as the aspect ratio for game-object dimensions.

Sounds available: `assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3`.

## Spec-driven workflow

This repo installs two skills (symlinked from `.agents/skills/` into `.claude/skills/`, pinned in `skills-lock.json` from `Klerith/fernando-skills`). They define the expected way to build features here:

- **`/spec <description>`** — clarifies requirements through question blocks, then writes `specs/NN-slug.md` following `.agents/skills/spec/template.md`. Writes no code. Seeds `specs/.spec-config.yml` on first run.
- **`/spec-impl <NN-slug>`** — refuses to run unless the spec's status line means *Approved* (the human flips `Draft` → `Approved`, never the agent), creates branch `spec-NN-slug`, then implements one plan step at a time, pausing for diff review and never committing on its own.

Consequences for any non-trivial feature work: check `specs/` first for an existing contract, implement what the spec says rather than what seems better (raise objections as observations), and route scope creep into a new spec.

Note: **this directory is not a git repository yet.** `/spec-impl` assumes git — `git init` before using it.
