# Milestones

| Milestone | Version tag | Outcome |
| --- | --- | --- |
| 1. Complete playable game | `v1.0.0` | Classic Sudoku, unique puzzles, daily play, tools, themes, saves, statistics and Playables SDK integration. |
| 2. Correct-number locking | `v1.0.1` | Correct entries and hints resist accidental overwriting, erase and note edits, including after reload. |

## 1. Complete playable game

The initial game supports three difficulty settings, keyboard/touch/mouse input, manual notes, undo, erase, hints, completion and personal statistics. It includes a responsive original interface, SDK cloud persistence and lifecycle handling, and a production bundle packager. Automated tests cover engine correctness and integration behavior.

## 2. Correct-number locking

Correct player entries and hinted numbers become locked. Attempts to replace or erase them do not create a move or increase mistakes. The UI identifies confirmed cells and disables Erase. Explicit Undo remains available for stepping back through session moves. Save restoration preserves locks. Engine and browser regression tests cover the behavior; the release packager reads the version from package.json.
