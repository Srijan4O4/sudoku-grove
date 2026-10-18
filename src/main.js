import Phaser from 'phaser';
import { newGame, enter, undo, hint, peers, score, validateSave, snapshot } from './sudoku.js';
import { Platform } from './platform.js';
import './style.css';
import './classic.css';

const $ = id => document.getElementById(id);
const platform = new Platform();
let game, stats = { wins: 0, best: 0, days: [] }, selected = 0, notesMode = false, userPaused = false, hostPaused = false, ticker, phaser, scene, modalKind = '', returnFocus;
let preferences = { theme: 'light', autoCheck: true, highlight: true };
const today = () => new Date().toISOString().slice(0, 10);
const time = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
const icons = {
  leaf: '<svg viewBox="0 0 32 32" fill="none"><path d="M27 5C11 3 3 11 8 22c10 5 19-2 19-17Z" fill="currentColor"/><path d="M5 28 22 11M12 21l-1-8M17 16h7" stroke="var(--ink)" stroke-width="1.6" stroke-linecap="round"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12"/></svg>',
  erase: '<svg viewBox="0 0 24 24"><path d="m15 3 6 6-11 11H5l-3-3L15 3ZM8 10l7 7M10 20h12"/></svg>',
  pencil: '<svg viewBox="0 0 24 24"><path d="m16 3 5 5L8 21H3v-5L16 3ZM13 6l5 5"/></svg>',
  bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M9 22h6M8 14a7 7 0 1 1 8 0l-1 4H9l-1-4Z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 1 1 5 3c-2 1-2 2-2 3M12 17v.1"/></svg>'
};
function save() { platform.save({ version: 1, game: { ...game, history: [] }, stats, preferences }); }
function isPaused() { return userPaused || hostPaused; }
function canPlay() { return !isPaused() && !game.won && !$('dialog').open; }
function shell() {
  $('app').innerHTML = `
    <header class="topbar"><div class="brand"><span class="brand-mark">${icons.leaf}</span><span>Sudoku <b>Grove</b></span></div><div class="header-actions"><button id="settings" class="subtle icon-button" aria-label="Game settings">⚙</button><button id="help" class="subtle icon-button" aria-label="How to play">${icons.help}</button></div></header>
    <main>
      <aside class="intro"><div class="eyebrow"><span></span> A LITTLE SPACE TO THINK</div><h1>Find your<br><em>moment of focus.</em></h1><p class="intro-copy">One square at a time.<br>A clearer mind, a little closer.</p><div class="botanical" aria-hidden="true"><div class="stem"></div><i></i><i></i><i></i><i></i><i></i><i></i><span>GROW AT YOUR OWN PACE</span></div><div class="personal"><span class="tiny-label">YOUR GROVE</span><div><strong id="wins">0</strong><span>puzzles solved</span><strong id="best">0</strong><span>best score</span></div></div></aside>
      <section class="game-panel" aria-label="Sudoku puzzle">
        <div class="game-top"><div><span class="tiny-label" id="mode-label">CLASSIC NUMBER PUZZLE</span><h2 id="puzzle-heading">A fresh challenge.</h2></div><button id="new-game" class="new-button">New game <span>+</span></button></div>
        <div class="game-meta"><div class="difficulty"><span class="meta-caption">Difficulty</span><button id="level" aria-label="Choose difficulty">Easy</button></div><div class="meta-score"><span class="meta-caption">Mistakes</span><span id="meta-mistakes">0</span></div><div class="meta-score"><span class="meta-caption">Score</span><span id="live-score">0</span></div><div class="timer"><div><span class="meta-caption">Time</span><span id="timer">00:00</span></div><button id="pause" class="subtle" aria-label="Pause puzzle">${icons.pause}</button></div></div>
        <div class="board-wrap"><div id="phaser-board" aria-hidden="true"></div><div id="board" role="group" aria-label="Sudoku board. Arrow keys navigate. Digits enter numbers. N toggles notes. Delete erases."></div><div id="pause-cover" hidden><span>Take a breath.</span><button id="resume" class="primary">Resume puzzle</button></div></div>
        <div class="tools"><button id="undo">${icons.undo}<span>Undo</span></button><button id="erase">${icons.erase}<span>Erase</span></button><button id="notes" aria-pressed="false">${icons.pencil}<span>Notes <small id="notes-label">OFF</small></span></button><button id="hint">${icons.bulb}<span>Hint</span></button></div>
        <div id="numbers" class="numbers" aria-label="Number pad"></div>
        <div class="board-footer"><span id="feedback" role="status" aria-live="polite">Select a cell, then choose a number.</span><span id="progress">0 of 81</span><span id="mistakes" hidden>0 mistakes</span></div>
      </section>
      <aside class="right-rail"><div class="daily-card"><span class="sun" aria-hidden="true">☀</span><span class="tiny-label">A FRESH START, EVERY DAY</span><h3>The daily ritual.</h3><p>A shared puzzle.<br>Your own way to solve it.</p><button id="daily">Play today's puzzle <span>→</span></button><small id="daily-status">One new puzzle every day · UTC</small></div><div class="tip-card"><span class="tiny-label">A SMALL POINTER</span><p>Start with a row, column or box that’s almost full.</p><span class="mini-grid" aria-hidden="true">1 <b>2</b> 3<br>4 5 6<br>7 8 9</span><p class="muted">Every number has<br>a place to belong.</p></div><div class="save-indicator"><span></span><small id="save-status">Preparing save…</small></div></aside>
    </main><footer class="page-footer"><span>Less rush. More reason.</span><span>Made for a mindful minute.</span></footer>
    <dialog id="dialog" aria-labelledby="dialog-title"><div id="dialog-content"></div></dialog>`;
  $('board').innerHTML = Array.from({ length: 81 }, (_, i) => `<button class="cell" data-index="${i}" tabindex="${i === 0 ? 0 : -1}"></button>`).join('');
  document.querySelector('.right-rail').insertBefore(document.querySelector('.personal'), document.querySelector('.tip-card'));
  $('numbers').innerHTML = Array.from({ length: 9 }, (_, i) => `<button data-number="${i + 1}" aria-label="Enter ${i + 1}"><span>${i + 1}</span><small>9</small></button>`).join('');
  $('board').addEventListener('click', event => { const cell = event.target.closest('.cell'); if (cell && canPlay()) select(Number(cell.dataset.index)); });
  $('numbers').addEventListener('click', event => { const button = event.target.closest('button'); if (button) input(Number(button.dataset.number)); });
  $('undo').onclick = () => { if (canPlay() && undo(game)) { feedback('One step back. A fresh perspective.'); changed(); } };
  $('erase').onclick = () => input(0);
  $('notes').onclick = () => { if (!canPlay()) return; notesMode = !notesMode; render(); feedback(notesMode ? 'Notes on · pencil in possibilities.' : 'Notes off · place your number.'); };
  $('hint').onclick = () => {
    if (!canPlay()) return;
    const result = hint(game, selected); if (!result) return;
    selected = result.index; feedback(`Hint: ${result.value} belongs here. ${result.reason}`); changed();
  };
  $('pause').onclick = () => { userPaused = true; save(); renderPause(); };
  $('resume').onclick = () => { if (hostPaused) return; userPaused = false; renderPause(); $('board').children[selected].focus(); };
  $('help').onclick = showHelp; $('new-game').onclick = () => showNew();
  $('settings').onclick = showSettings; $('level').onclick = () => showNew();
  $('daily').onclick = () => { if (game.daily === today()) { if (game.won) showWin(); else feedback('You are already playing today’s puzzle.'); return; } showNew(true); };
  $('dialog').addEventListener('close', () => { modalKind = ''; returnFocus?.focus(); });
  document.addEventListener('keydown', onKey);
  platform.onStatus = text => { $('save-status').textContent = text; };
}
function feedback(text) { $('feedback').textContent = text; }
function select(i, focus = true) { selected = i; render(); if (focus) $('board').children[i].focus({ preventScroll: true }); }
function input(value) {
  if (!canPlay()) return;
  if (game.puzzle[selected]) { feedback('This number is a clue. Choose an empty square.'); return; }
  if (game.board[selected] && game.board[selected] === game.solution[selected]) { feedback('This number is correct and locked. Choose another cell.'); return; }
  if (enter(game, selected, value, notesMode && value !== 0)) {
    feedback(value && !notesMode && preferences.autoCheck && value !== game.solution[selected] ? 'Not quite · try another number.' : notesMode && value ? 'Note added. Press Notes again to enter numbers.' : 'Progress saved as you play.'); changed();
  }
}
function changed() {
  if (!game.won && game.board.every((v, i) => v === game.solution[i])) {
    game.won = true; stats.wins++; stats.best = Math.max(stats.best, score(game));
    stats.byLevel ??= {}; const levelStats = stats.byLevel[game.difficulty] ??= { wins: 0, bestTime: game.elapsed }; levelStats.wins++; levelStats.bestTime = Math.min(levelStats.bestTime, game.elapsed);
    if (game.daily && !stats.days.includes(game.daily)) stats.days = [...stats.days, game.daily].sort().slice(-365);
    platform.sendScore(stats.best); showWin(); scene?.celebrate();
  }
  render(); save();
}
function render() {
  const chosen = game.board[selected];
  [...$('board').children].forEach((cell, i) => {
    const value = game.board[i], wrong = value && value !== game.solution[i];
    const locked = !!value && value === game.solution[i];
    const classes = ['cell', game.puzzle[i] ? 'clue' : 'entry'];
    if (locked && !game.puzzle[i]) classes.push('confirmed');
    cell.dataset.locked = String(locked);
    if (i === selected) classes.push('selected');
    else if (preferences.highlight && chosen && value === chosen) classes.push('same');
    else if (peers(i, selected)) classes.push('peer');
    if (wrong && preferences.autoCheck) classes.push('wrong');
    if (value && game.board.some((v,j)=>v===value && peers(i,j))) classes.push('duplicate');
    cell.className = classes.join(' '); cell.tabIndex = i === selected ? 0 : -1;
    cell.setAttribute('aria-label', `Row ${Math.floor(i / 9) + 1}, column ${i % 9 + 1}, ${value || 'empty'}${game.puzzle[i] ? ', clue' : locked ? ', correct and locked' : ''}${wrong && preferences.autoCheck ? ', incorrect' : ''}${game.notes[i].length ? ', notes ' + game.notes[i].join(', ') : ''}`);
    cell.setAttribute('aria-current', String(i === selected));
    cell.innerHTML = value ? `<span>${value}</span>` : game.notes[i].length ? `<span class="pencil-grid">${Array.from({length:9},(_,n)=>`<i>${game.notes[i].includes(n+1)? n+1 : ''}</i>`).join('')}</span>` : '';
  });
  const filled = game.board.filter(Boolean).length;
  $('progress').textContent = `${filled} of 81`;
  $('level').textContent = game.difficulty[0].toUpperCase() + game.difficulty.slice(1);
  $('timer').textContent = time(game.elapsed);
  $('meta-mistakes').textContent = preferences.autoCheck ? game.mistakes : 'Off';
  $('live-score').textContent = game.won ? score(game).toLocaleString('en') : '—';
  $('mistakes').textContent = `${game.mistakes} mistake${game.mistakes === 1 ? '' : 's'}`;
  $('notes').setAttribute('aria-pressed', String(notesMode)); $('notes-label').textContent = notesMode ? 'ON' : 'OFF';
  $('undo').disabled = !game.history.length || game.won; $('erase').disabled = !!game.puzzle[selected] || (!!game.board[selected] && game.board[selected] === game.solution[selected]) || game.won;
  $('hint').disabled = game.won; $('notes').disabled = game.won; $('pause').disabled = game.won;
  $('wins').textContent = stats.wins; $('best').textContent = stats.best.toLocaleString('en');
  $('mode-label').textContent = game.daily ? `DAILY CHALLENGE · ${game.daily}` : 'CLASSIC NUMBER PUZZLE';
  $('puzzle-heading').textContent = game.won ? 'Puzzle complete. Nicely done!' : 'A fresh challenge.';
  $('daily-status').textContent = stats.days.includes(today()) ? 'Today’s ritual complete. Beautifully done.' : 'One new puzzle every day · UTC';
  [...$('numbers').children].forEach((button, i) => {
    const count = game.board.filter(v => v === i + 1).length;
    button.querySelector('small').textContent = Math.max(0, 9 - count);
    button.disabled = game.won;
    button.classList.toggle('complete', count >= 9);
  });
  scene?.drawBoard(); renderPause();
}
function renderPause() {
  $('pause-cover').hidden = !isPaused();
  $('resume').disabled = hostPaused;
  $('resume').textContent = hostPaused ? 'Paused by YouTube' : 'Resume puzzle';
  $('app').classList.toggle('host-paused', hostPaused);
}
function onKey(event) {
  if (event.key === 'Escape') { if (userPaused && !hostPaused) { userPaused = false; renderPause(); } return; }
  if (!canPlay() || event.ctrlKey || event.metaKey || event.altKey || !event.target.closest('#board, #numbers, .tools, body') || event.target.closest('select, input')) return;
  const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
  if (event.key in moves) { event.preventDefault(); select((selected + moves[event.key] + 81) % 81); }
  else if (/^[1-9]$/.test(event.key)) { event.preventDefault(); input(Number(event.key)); }
  else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') { event.preventDefault(); input(0); }
  else if (event.key.toLowerCase() === 'n') $('notes').click();
  else if (event.key.toLowerCase() === 'u') $('undo').click();
  else if (event.key.toLowerCase() === 'h') $('hint').click();
}
function openModal(kind, html) {
  if (hostPaused) return;
  returnFocus = document.activeElement; modalKind = kind; $('dialog-content').innerHTML = html;
  if (!$('dialog').open) $('dialog').showModal();
  $('close-dialog')?.addEventListener('click', () => $('dialog').close());
}
function showNew(daily = false) {
  if (hostPaused) return;
  openModal('new', `<span class="dialog-leaf">${icons.leaf}</span><span class="tiny-label">${daily ? 'THE DAILY RITUAL' : 'MAKE A LITTLE ROOM'}</span><h2 id="dialog-title">${daily ? 'A fresh puzzle for today.' : 'Find your kind of challenge.'}</h2><p>${game.won ? 'Another moment of focus awaits.' : 'Starting a new puzzle replaces your current progress.'}</p>${daily ? '<p>Everyone gets the same medium puzzle today. The day resets at midnight UTC.</p>' : '<div class="level-options"><button data-level="easy" class="chosen"><b>Easy</b><span>A gentle warm-up</span></button><button data-level="medium"><b>Medium</b><span>A little more focus</span></button><button data-level="hard"><b>Hard</b><span>Room to think deeper</span></button></div>'}<button id="start-game" class="primary">${daily ? 'Begin today’s ritual' : 'Begin puzzle'} →</button><button id="close-dialog" class="text-button">Keep this puzzle</button>`);
  let difficulty = 'easy';
  document.querySelectorAll('[data-level]').forEach(button => button.onclick = () => { difficulty = button.dataset.level; document.querySelectorAll('[data-level]').forEach(b => b.classList.toggle('chosen', b === button)); });
  $('start-game').onclick = () => {
    const date = daily ? today() : null;
    if (date && stats.days.includes(date)) { feedback('You have already completed today’s ritual. Replay for practice.'); }
    game = newGame(daily ? 'medium' : difficulty, date ? `grove-daily-v1-${date}` : crypto.getRandomValues(new Uint32Array(1))[0], date);
    selected = game.puzzle.findIndex(v => !v); notesMode = false; userPaused = false;
    $('dialog').close(); feedback('A fresh start. Take your time.'); render(); save();
  };
}
function showHelp() {
  openModal('help', `<span class="tiny-label">LET’S FIND YOUR FLOW</span><h2 id="dialog-title">Nine numbers. A little logic.</h2><p>Fill each row, column and 3 × 3 box with the numbers 1–9, using each number exactly once. The darker numbers are fixed clues.</p><div class="help-list"><p><b>Make your mark.</b> Tap a square, then a number. Red numbers and “Not quite” feedback show an incorrect entry.</p><p><b>Keep possibilities.</b> Turn on Notes to pencil in candidates. Undo takes back the last change; Erase clears a square.</p><p><b>Find a way forward.</b> Hint reveals a correct number. There is no mistake limit and no time limit.</p><p><b>On a keyboard.</b> Arrow keys move · 1–9 enter · N notes · U undo · H hint · Delete erases · Esc closes dialogs.</p><p><b>Your score.</b> Easy starts at 5,000, Medium at 8,000, Hard at 12,000. Subtract 2 per second, 100 per mistake and 400 per hint; minimum 100. Undo doesn’t remove penalties.</p><p><b>Difficulty.</b> Levels vary clue density. Every generated puzzle has exactly one solution; advanced solving techniques aren’t formally graded.</p><p><b>Your progress.</b> ${platform.hosted ? 'Progress uses YouTube cloud saves when available. Guest persistence depends on YouTube.' : 'Progress is saved in this browser when storage is available.'} Only the active puzzle is retained.</p></div><button id="retry-save" class="secondary">Retry save connection</button><p id="retry-status" role="status"></p><button id="close-dialog" class="primary">Got it. Let’s play.</button>`);
  $('retry-save').onclick = async () => {
    $('retry-save').disabled = true;
    if (!platform.loaded) {
      const loaded = validateSave(await platform.load());
      // Never overwrite a recovered cloud game with moves made during a failed load.
      if (loaded) { game = loaded.game; stats = loaded.stats; preferences = loaded.preferences; applyTheme(); selected = game.board.findIndex((v,i) => v !== game.solution[i]); if (selected < 0) selected = 0; render(); }
    }
    if (platform.loaded) { save(); await platform.flush(); }
    if ($('retry-status')) $('retry-status').textContent = platform.status;
    if ($('retry-save')) $('retry-save').disabled = false;
  };
}
function applyTheme() { document.documentElement.dataset.theme = preferences.theme; scene?.drawBoard(); }
function showSettings() {
  const rows = ['easy','medium','hard'].map(level => { const record=stats.byLevel?.[level]; return `<tr><td>${level[0].toUpperCase()+level.slice(1)}</td><td>${record?.wins || 0}</td><td>${record ? time(record.bestTime) : '—'}</td></tr>`; }).join('');
  openModal('settings', `<span class="tiny-label">MAKE IT YOURS</span><h2 id="dialog-title">Game settings</h2><p>Choose a comfortable look and the helpers you prefer.</p><div class="theme-options">${['light','dark','grove'].map(theme=>`<button data-theme-choice="${theme}" aria-pressed="${preferences.theme===theme}">${theme[0].toUpperCase()+theme.slice(1)}</button>`).join('')}</div><label class="setting-row">Auto-check mistakes<input id="auto-check" type="checkbox" ${preferences.autoCheck?'checked':''}></label><label class="setting-row">Highlight matching numbers<input id="highlight" type="checkbox" ${preferences.highlight?'checked':''}></label><p class="settings-note">Mistake penalties still count with auto-check off. Score is awarded when you finish.</p><h3>Your statistics</h3><table class="stats-table"><thead><tr><th>Level</th><th>Solved</th><th>Best time</th></tr></thead><tbody>${rows}</tbody></table><button id="restart" class="secondary">Restart this puzzle</button><button id="close-dialog" class="primary">Done</button>`);
  document.querySelectorAll('[data-theme-choice]').forEach(button => button.onclick = () => { preferences.theme=button.dataset.themeChoice;applyTheme();render();save();document.querySelectorAll('[data-theme-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b===button))); });
  $('auto-check').onchange = event => { preferences.autoCheck=event.target.checked;render();save(); };
  $('highlight').onchange = event => { preferences.highlight=event.target.checked;render();save(); };
  $('restart').onclick=()=>{
    openModal('restart','<h2 id="dialog-title">Restart this puzzle?</h2><p>Your entries, notes, timer and penalties will be cleared.</p><button id="confirm-restart" class="primary">Restart puzzle</button><button id="close-dialog" class="text-button">Keep playing</button>');
    $('confirm-restart').onclick=()=>{game={...game,board:[...game.puzzle],notes:Array.from({length:81},()=>[]),history:[],won:false,elapsed:0,mistakes:0,hints:0};selected=game.puzzle.indexOf(0);notesMode=false;userPaused=false;$('dialog').close();render();save();};
  };
}
function showWin() {
  openModal('win', `<span class="dialog-leaf">${icons.leaf}</span><span class="tiny-label">A MOMENT WELL SPENT</span><h2 id="dialog-title">Look what you grew.</h2><p>Every square found its place. Enjoy that little feeling of everything clicking.</p><div class="win-stats"><div><strong>${time(game.elapsed)}</strong><span>your time</span></div><div><strong>${score(game).toLocaleString('en')}</strong><span>your score</span></div><div><strong>${game.hints}</strong><span>hints used</span></div></div><button id="another" class="primary">Grow a new puzzle →</button><button id="close-dialog" class="text-button">Admire the board</button>`);
  $('another').onclick = () => showNew();
}
class BoardScene extends Phaser.Scene {
  create() {
    scene = this; this.graphics = this.add.graphics();
    this.scale.on('resize', () => this.drawBoard()); this.drawBoard();
  }
  drawBoard() {
    if (!this.graphics || !game || hostPaused) return;
    const g = this.graphics, size = this.scale.width, unit = size / 9;
    const colors = preferences.theme === 'dark' ? {paper:0x202a39, selected:0x345d87,same:0x33475e,peer:0x2a3546,error:0x59343d,line:0x8494a9,thin:0x4b5a70} : preferences.theme === 'grove' ? {paper:0xfffdf7,selected:0xc4dfc7,same:0xdfead6,peer:0xf0f2e7,error:0xfbe4da,line:0x526e5e,thin:0xcdd6c6} : {paper:0xffffff,selected:0xbbddfb,same:0xd5e6f7,peer:0xedf1f6,error:0xffe2e5,line:0x607185,thin:0xc6cfda};
    g.clear(); g.fillStyle(colors.paper); g.fillRect(0, 0, size, size);
    for (let i = 0; i < 81; i++) {
      let color = i === selected ? colors.selected : preferences.highlight && game.board[selected] && game.board[i] === game.board[selected] ? colors.same : peers(i, selected) ? colors.peer : null;
      if (preferences.autoCheck && game.board[i] && game.board[i] !== game.solution[i]) color = colors.error;
      if (color) { g.fillStyle(color); g.fillRect((i%9)*unit, Math.floor(i/9)*unit, unit, unit); }
    }
    for (let i = 0; i <= 9; i++) { g.lineStyle(i%3 === 0 ? 2 : 0.7, i%3 === 0 ? colors.line : colors.thin); g.lineBetween(i*unit,0,i*unit,size); g.lineBetween(0,i*unit,size,i*unit); }
  }
  celebrate() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const width = this.scale.width;
    for (let i = 0; i < 36; i++) {
      const leaf = this.add.ellipse(Math.random()*width, -20, 5, 12, Phaser.Utils.Array.GetRandom([0x7da881,0xdab875,0x315f4b]));
      this.tweens.add({targets:leaf,y:width+20,x:leaf.x+Math.random()*80-40,angle:Math.random()*400,duration:1600+Math.random()*1000,delay:Math.random()*400,onComplete:()=>leaf.destroy()});
    }
  }
}
async function boot() {
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  platform.firstFrame();
  const saved = validateSave(await platform.load());
  game = saved?.game || newGame('easy', crypto.getRandomValues(new Uint32Array(1))[0]); stats = saved?.stats || stats; preferences = saved?.preferences || preferences; applyTheme();
  selected = game.puzzle.findIndex(v => !v); if (selected < 0) selected = 0;
  shell(); $('save-status').textContent = platform.status;
  $('loading').hidden = true; $('app').hidden = false;
  phaser = new Phaser.Game({ type: Phaser.CANVAS, parent: 'phaser-board', width: 540, height: 540, transparent: true, banner: false, autoFocus: false, audio: { noAudio: true }, fps: { target: 30 }, scale: { mode: Phaser.Scale.RESIZE }, scene: BoardScene });
  // Phaser's default visibility handler is disabled: Playables owns pause/resume.
  platform.bindPause(() => {
    hostPaused = true; clearInterval(ticker); save(); renderPause(); phaser.loop.sleep();
    if ($('dialog').open) $('dialog').close();
    document.activeElement?.blur();
  }, () => { hostPaused = false; renderPause(); phaser.loop.wake(); startTicker(); if (game.won) showWin(); });
  render(); platform.ready(); if (stats.best) platform.sendScore(stats.best);
  startTicker(); if (game.won) showWin();
}
function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(() => { if (!isPaused() && !game.won && !$('dialog').open) { game.elapsed++; $('timer').textContent = time(game.elapsed); if (game.elapsed % 15 === 0) save(); } }, 1000);
}
boot().catch(error => { console.error(error); $('loading').textContent = 'The puzzle could not start. Please reload to try again.'; });
