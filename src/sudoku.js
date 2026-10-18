export const LEVELS = { easy: 42, medium: 34, hard: 28 };
export function rng(seed) {
  let a = 2166136261;
  for (const c of String(seed)) a = Math.imul(a ^ c.charCodeAt(0), 16777619);
  return () => { a += 0x6D2B79F5; let t = Math.imul(a ^ a >>> 15, 1 | a); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function shuffle(a, random) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const peers = (a, b) => a !== b && (Math.floor(a / 9) === Math.floor(b / 9) || a % 9 === b % 9 || (Math.floor(a / 27) === Math.floor(b / 27) && Math.floor(a % 9 / 3) === Math.floor(b % 9 / 3)));
export function candidates(board, i) {
  if (board[i]) return [];
  return Array.from({ length: 9 }, (_, j) => j + 1).filter(n => !board.some((v, j) => v === n && peers(i, j)));
}
export function validBoard(board, complete = false) {
  return Array.isArray(board) && board.length === 81 && board.every((v, i) => Number.isInteger(v) && v >= (complete ? 1 : 0) && v <= 9 && (!v || !board.some((n, j) => n === v && peers(i, j))));
}
export function solve(board, limit = 2) {
  if (!validBoard(board)) return { count: 0, solution: null };
  const grid = [...board]; let count = 0, solution = null;
  function search() {
    if (count >= limit) return;
    let index = -1, options = null;
    for (let i = 0; i < 81; i++) if (!grid[i]) {
      const choices = candidates(grid, i);
      if (!choices.length) return;
      if (!options || choices.length < options.length) { index = i; options = choices; if (choices.length === 1) break; }
    }
    if (index === -1) { count++; solution ??= [...grid]; return; }
    for (const n of options) { grid[index] = n; search(); grid[index] = 0; if (count >= limit) break; }
  }
  search(); return { count, solution };
}
export function generate(difficulty = 'easy', seed = Date.now()) {
  if (!(difficulty in LEVELS)) throw new Error('Unknown difficulty');
  const random = rng(seed), group = () => shuffle([0, 1, 2], random);
  const rows = group().flatMap(g => group().map(i => g * 3 + i));
  const cols = group().flatMap(g => group().map(i => g * 3 + i));
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
  const solution = rows.flatMap(r => cols.map(c => digits[(r * 3 + Math.floor(r / 3) + c) % 9]));
  const puzzle = [...solution]; let clues = 81;
  for (const i of shuffle(Array.from({ length: 81 }, (_, j) => j), random)) {
    if (clues <= LEVELS[difficulty]) break;
    const old = puzzle[i]; puzzle[i] = 0;
    if (solve(puzzle).count !== 1) puzzle[i] = old; else clues--;
  }
  return { puzzle, solution, difficulty, seed: String(seed) };
}
export function newGame(difficulty, seed, daily = null) {
  const generated = generate(difficulty, seed);
  return { ...generated, board: [...generated.puzzle], notes: Array.from({ length: 81 }, () => []), elapsed: 0, mistakes: 0, hints: 0, daily, won: false, history: [] };
}
export function score(game) { return Math.max(100, ({easy: 5000, medium: 8000, hard: 12000}[game.difficulty]) - game.elapsed * 2 - game.mistakes * 100 - game.hints * 400); }
export function snapshot(game) { return { board: [...game.board], notes: game.notes.map(n => [...n]) }; }
export function enter(game, index, value, noteMode = false) {
  if (game.won || game.puzzle[index] || (game.board[index] !== 0 && game.board[index] === game.solution[index]) || !Number.isInteger(value) || value < 0 || value > 9) return false;
  if (!noteMode && game.board[index] === value) return false;
  game.history.push(snapshot(game)); if (game.history.length > 100) game.history.shift();
  if (noteMode && value) {
    if (game.board[index]) { game.history.pop(); return false; }
    const notes = game.notes[index]; game.notes[index] = notes.includes(value) ? notes.filter(n => n !== value) : [...notes, value].sort();
  } else {
    game.board[index] = value; game.notes[index] = [];
    if (value && value !== game.solution[index]) game.mistakes++;
    if (value && value === game.solution[index]) for (let j = 0; j < 81; j++) if (peers(index, j)) game.notes[j] = game.notes[j].filter(n => n !== value);
  }
  return true;
}
export function undo(game) {
  if (game.won || !game.history.length) return false;
  const previous = game.history.pop(); game.board = previous.board; game.notes = previous.notes; return true;
}
export function hint(game, index) {
  if (game.won) return null;
  if (game.puzzle[index] || game.board[index] === game.solution[index]) index = game.board.findIndex((v, i) => v !== game.solution[i]);
  if (index < 0) return null;
  const choices = candidates(game.board.map((v, i) => v === game.solution[i] ? v : 0), index);
  const reason = choices.length === 1 ? 'Only one number fits this row, column and box.' : 'This number is confirmed by the unique solution. Try tracing its row, column and box.';
  enter(game, index, game.solution[index]); game.hints++;
  return { index, value: game.solution[index], reason };
}
export function validateSave(value) {
  if (!value || value.version !== 1 || !value.game) return null;
  const g = value.game;
  if (!(g.difficulty in LEVELS) || !validBoard(g.puzzle) || !validBoard(g.solution, true)) return null;
  if (g.puzzle.some((v, i) => v && v !== g.solution[i]) || solve(g.puzzle).count !== 1) return null;
  if (!Array.isArray(g.board) || g.board.length !== 81 || g.board.some((v,i) => !Number.isInteger(v) || v < 0 || v > 9 || (g.puzzle[i] && g.puzzle[i] !== v))) return null;
  if (!Array.isArray(g.notes) || g.notes.length !== 81 || g.notes.some(n => !Array.isArray(n) || n.length > 9 || n.some(v => !Number.isInteger(v) || v < 1 || v > 9))) return null;
  for (const key of ['elapsed', 'mistakes', 'hints']) if (!Number.isSafeInteger(g[key]) || g[key] < 0) return null;
  if (g.daily !== null && (typeof g.daily !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(g.daily))) return null;
  const stats = value.stats || {};
  if (['wins', 'best'].some(k => !Number.isSafeInteger(stats[k]) || stats[k] < 0)) return null;
  const days = Array.isArray(stats.days) ? stats.days.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-365) : [];
  const byLevel = {};
  for (const level of Object.keys(LEVELS)) { const record = stats.byLevel?.[level]; if (record && Number.isSafeInteger(record.wins) && record.wins > 0 && Number.isSafeInteger(record.bestTime) && record.bestTime >= 0) byLevel[level] = {wins:record.wins,bestTime:record.bestTime}; }
  const p = value.preferences || {};
  const preferences = {theme:['light','dark','grove'].includes(p.theme)?p.theme:'light',autoCheck:p.autoCheck!==false,highlight:p.highlight!==false};
  return { version: 1, game: { ...g, won: g.board.every((v,i) => v === g.solution[i]), history: [] }, stats: { wins: stats.wins, best: stats.best, days, byLevel }, preferences };
}
