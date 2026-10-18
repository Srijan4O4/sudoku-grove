import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, solve, validBoard, newGame, enter, undo, hint, score, validateSave } from '../src/sudoku.js';

for (const difficulty of ['easy', 'medium', 'hard']) test(`${difficulty}: 25 seeds produce valid, uniquely solvable puzzles`, () => {
  for (let seed = 0; seed < 25; seed++) {
    const { puzzle, solution } = generate(difficulty, `test-${seed}`);
    assert.ok(validBoard(solution, true)); assert.ok(validBoard(puzzle));
    const solved = solve(puzzle); assert.equal(solved.count, 1); assert.deepEqual(solved.solution, solution);
    assert.ok(puzzle.filter(Boolean).length >= {easy:42,medium:34,hard:28}[difficulty]);
  }
});
test('same seed and level produce the same daily puzzle; different seeds vary', () => {
  assert.deepEqual(generate('medium', 'daily-2026-10-18'), generate('medium', 'daily-2026-10-18'));
  assert.notDeepEqual(generate('medium', 'day-1').puzzle, generate('medium', 'day-2').puzzle);
});
test('clues are immutable; note edits and values undo together; penalties survive undo', () => {
  const g = newGame('easy','edits'); const i = g.puzzle.indexOf(0), clue = g.puzzle.findIndex(Boolean);
  assert.equal(enter(g, clue, 0), false);
  enter(g, i, 2, true); assert.deepEqual(g.notes[i], [2]);
  enter(g, i, 3, true); undo(g); assert.deepEqual(g.notes[i], [2]);
  const wrong = g.solution[i] % 9 + 1; enter(g,i,wrong); assert.equal(g.mistakes,1);
  undo(g); assert.equal(g.board[i],0); assert.deepEqual(g.notes[i],[2]); assert.equal(g.mistakes,1);
  enter(g,i,g.solution[i]); assert.equal(g.board[i],g.solution[i]); assert.deepEqual(g.notes[i],[]);
});
test('hints complete a puzzle and won puzzles reject further input', () => {
  const g = newGame('hard','hint-win'); let count = 0;
  while (!g.board.every((v,i)=>v===g.solution[i])) { assert.ok(hint(g,0)); count++; assert.ok(count<82); }
  assert.equal(g.hints,count); assert.equal(g.mistakes,0); assert.ok(score(g)>=100);
  g.won=true; assert.equal(enter(g,g.puzzle.indexOf(0),0),false); assert.equal(hint(g,0),null); assert.equal(undo(g),false);
});
test('save validation restores a valid game and rejects corrupt boards and counters', () => {
  const saved = {version:1,game:newGame('medium','save'),stats:{wins:2,best:1234,days:['2026-10-18']}};
  assert.ok(validateSave(saved));
  for (const corrupt of [null,{}, {...saved,version:99}]) assert.equal(validateSave(corrupt),null);
  const bad = structuredClone(saved); bad.game.elapsed = -1; assert.equal(validateSave(bad),null);
  const badClue = structuredClone(saved); const i = badClue.game.puzzle.findIndex(Boolean); badClue.game.board[i]=0; assert.equal(validateSave(badClue),null);
  const badSolution = structuredClone(saved); badSolution.game.solution.fill(1); assert.equal(validateSave(badSolution),null);
});
test('score follows a consistent best-score metric', () => {
  const g = newGame('medium','score'); g.elapsed=100;g.mistakes=2;g.hints=1;
  assert.equal(score(g),7200); g.elapsed=999999; assert.equal(score(g),100);
});
