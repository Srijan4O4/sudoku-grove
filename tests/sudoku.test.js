import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, solve, validBoard, newGame, enter, undo, hint, score, validateSave, candidates, peers } from '../src/sudoku.js';

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
  const note=candidates(g.board,i)[0];
  enter(g, i, note, true); assert.deepEqual(g.notes[i], [note]);
  enter(g, i, note, true); undo(g); assert.deepEqual(g.notes[i], [note]);
  const wrong = g.solution[i] % 9 + 1; enter(g,i,wrong); assert.equal(g.mistakes,1);
  undo(g); assert.equal(g.board[i],0); assert.deepEqual(g.notes[i],[note]); assert.equal(g.mistakes,1);
  enter(g,i,g.solution[i]); assert.equal(g.board[i],g.solution[i]); assert.deepEqual(g.notes[i],[]);
});
test('notes exclude existing digits from the row, column and box without consuming undo or mistakes',()=>{
  for(const source of [36,4,30]) {
    const g=newGame('medium','notes-blocked');g.puzzle.fill(0);g.board.fill(0);
    g.board[source]=g.solution[source];const value=g.board[source];
    const before=structuredClone(g);assert.equal(enter(g,40,value,true),false);assert.deepEqual(g,before);
    const allowed=candidates(g.board,40)[0];assert.equal(enter(g,40,allowed,true),true);assert.deepEqual(g.notes[40],[allowed]);
    assert.equal(enter(g,40,allowed,true),true);assert.deepEqual(g.notes[40],[]);
  }
});
test('all placements prune row, column and box notes, retain unrelated notes, and undo restores them',()=>{
  for(const source of [36,4,30]) for(const correct of [true,false]) {
    const g=newGame('medium','notes-prune');g.puzzle.fill(0);g.board.fill(0);
    const value=correct?g.solution[source]:g.solution[source]%9+1;
    const other=value%9+1, unrelated=g.board.findIndex((_,i)=>i!==source&&!peers(i,source)&&i!==40);
    g.notes[40]=[value,other].sort();g.notes[unrelated]=[value];
    assert.equal(enter(g,source,value),true);assert.deepEqual(g.notes[40],[other]);assert.deepEqual(g.notes[unrelated],[value]);
    undo(g);assert.deepEqual(g.notes[40],[value,other].sort());assert.deepEqual(g.notes[unrelated],[value]);
  }
});
test('hints clean notes and old saves repair impossible notes without losing progress',()=>{
  const g=newGame('medium','saved-notes');const i=g.puzzle.indexOf(0);enter(g,i,g.solution[i]);
  g.elapsed=42;g.notes=Array.from({length:81},()=>[1,2,3,4,5,6,7,8,9]);
  const saved={version:1,game:g,stats:{wins:0,best:0,days:[]}};const restored=validateSave(saved).game;
  assert.deepEqual(restored.board,g.board);assert.equal(restored.elapsed,42);
  restored.notes.forEach((notes,j)=>assert.deepEqual(notes,candidates(restored.board,j)));
  assert.equal(g.notes[i].length,9,'migration must not mutate input');
  hint(restored,i);restored.notes.forEach((notes,j)=>assert.ok(notes.every(n=>candidates(restored.board,j).includes(n))));
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
test('correct placements and hints lock against replacement, erase and notes without penalties', () => {
  const g=newGame('easy','locked');const i=g.puzzle.indexOf(0);
  enter(g,i,g.solution[i]);const before=structuredClone(g);
  for(const [value,noteMode] of [[g.solution[i]%9+1,false],[0,false],[3,true]]){
    assert.equal(enter(g,i,value,noteMode),false);assert.deepEqual(g,before);
  }
  const saved={version:1,game:g,stats:{wins:0,best:0,days:[]}};
  const restored=validateSave(saved).game;assert.equal(enter(restored,i,0),false);assert.equal(restored.mistakes,0);
  const h=hint(g,i);assert.ok(h);assert.equal(enter(g,h.index,h.value%9+1),false);
  assert.equal(g.mistakes,0);
});
