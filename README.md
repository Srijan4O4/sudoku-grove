# Sudoku Grove

An original classic Sudoku game by **Prototype Plays**, built with Phaser and the YouTube Playables SDK.

**Play:** https://prototype-plays-sudoku-grove.spry-hippo-9654.chatgpt.site

## Milestone 1 · v1.0.0

A complete playable 9×9 Sudoku game with:

- Seeded, uniquely solvable puzzles at Easy, Medium and Hard clue densities.
- A daily shared puzzle, pencil notes, undo, erase and hints.
- Touch, mouse and keyboard controls, responsive layouts and accessible cell labels.
- Light, Dark and Grove themes, settings, timer, scores and statistics.
- Standalone browser saves and YouTube SDK cloud saves, readiness and pause/resume handling.
- Automated engine, platform and browser tests; a validated upload ZIP build.

No external game assets, analytics, purchases, game accounts or audio are required. The game uses its own code and artwork.

## Run locally

Node.js 22+ and npm are required.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:8080`.

```sh
npm test           # puzzle engine and platform tests
npm run test:e2e   # browser tests using installed Microsoft Edge
npm run build     # production files in dist/
npm run release   # tests, build and validated YouTube upload ZIP
npm run preview   # serve the production build
```

On Windows, use `npm.cmd` if PowerShell restricts npm scripts. Browser tests target installed Microsoft Edge; change `channel` in `playwright.config.js` for another installed browser. Set `TEST_GAME_URL` to test an already running build.

## Project structure

- `src/sudoku.js` — generator, uniqueness solver, edits, hints, scoring and save validation.
- `src/main.js` — gameplay UI and Phaser rendering.
- `src/platform.js` — YouTube SDK boundary and standalone storage.
- `src/style.css`, `src/classic.css` — responsive layout and themes.
- `tests/` — engine, platform and end-to-end browser tests.
- `scripts/package.mjs` — ZIP creation, SDK-order checks and bundle validation.
- `public/THIRD-PARTY-NOTICES.txt` — Phaser and eventemitter3 MIT license notices.

The upload ZIP contains the contents of `dist/`, with `index.html` at its root. All game assets are relative and bundled locally. The SDK script is the required YouTube-hosted dependency. In Playables, progress is saved only through the SDK; standalone play uses browser storage. Undo history is session-only. Difficulty is based on clue density rather than formal human-technique grading.

## YouTube Playables

The public web demo is separate from a YouTube listing. Publishing on YouTube requires acceptance, channel onboarding, portal access, device testing and certification. See the [official publishing requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements) and [portal guide](https://developers.google.com/youtube/gaming/playables/developer_portal).

See [MILESTONES.md](MILESTONES.md) for the version history. Each milestone has a separate commit and version tag.

## Third-party licenses

Phaser and eventemitter3 are MIT licensed; their notices are retained in `public/THIRD-PARTY-NOTICES.txt` and the game bundle. This project does not include assets or source from other Sudoku apps. No license grant for the original project code is implied by publishing the repository.
