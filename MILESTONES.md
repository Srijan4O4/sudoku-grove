# Milestones

| Milestone | Version tag | Outcome |
| --- | --- | --- |
| 1. Complete playable game | `v1.0.0` | Classic Sudoku, unique puzzles, daily play, tools, themes, saves, statistics and Playables SDK integration. |
| 2. Correct-number locking | `v1.0.1` | Correct entries and hints resist accidental overwriting, erase and note edits, including after reload. |
| 3. Candidate-aware notes | `v1.0.2` | Notes respect the current row, column and box; placements remove conflicts and old saves are repaired. |

## 1. Complete playable game

The initial game supports three difficulty settings, keyboard/touch/mouse input, manual notes, undo, erase, hints, completion and personal statistics. It includes a responsive original interface, SDK cloud persistence and lifecycle handling, and a production bundle packager. Automated tests cover engine correctness and integration behavior.

## 2. Correct-number locking

Correct player entries and hinted numbers become locked. Attempts to replace or erase them do not create a move or increase mistakes. The UI identifies confirmed cells and disables Erase. Explicit Undo remains available for stepping back through session moves. Save restoration preserves locks. Engine and browser regression tests cover the behavior; the release packager reads the version from package.json.

## 3. Candidate-aware notes

Notes accept only numbers absent from the cell's current row, column and 3×3 box. Conflicting keypad choices are disabled in Notes mode; keyboard attempts explain the conflict without adding mistakes or undo entries. Correct and incorrect placements both clean affected notes. Undo restores the prior board and its valid notes. Existing saves are repaired on load without resetting puzzle progress or timer.

Validation: 16 engine/platform tests and 8 browser tests passed, plus the notes regression against the deployed public demo. Every generated puzzle in the 75-seed engine suite had exactly one solution. The public interest application has been submitted to YouTube; review, onboarding and certification are still required for a YouTube listing.
