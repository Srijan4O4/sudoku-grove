import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { newGame, enter } from '../src/sudoku.js';
await mkdir('submission/screenshots',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const game=newGame('medium','screenshot-game');game.elapsed=184;
const blanks=game.puzzle.map((v,i)=>v?null:i).filter(v=>v!==null);
for(const i of blanks.slice(0,5))enter(game,i,game.solution[i]);
game.notes[blanks[6]]=[2,4,8];game.notes[blanks[10]]=[1,5];
for(const [label,width,height,theme] of [['desktop',1440,1050,'light'],['mobile',390,844,'light'],['dark',1440,1050,'dark']]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  await context.addInitScript(data=>localStorage.setItem('sudoku-grove-v1',JSON.stringify(data)),{version:1,game,stats:{wins:0,best:0,days:[]},preferences:{theme,autoCheck:true,highlight:true}});
  const page=await context.newPage();await page.goto(process.env.GAME_URL||'http://localhost:8082');await page.locator('#app').waitFor({state:'visible'});await page.locator('canvas').waitFor({state:'visible'});await page.locator(`[data-index="${blanks[5]}"]`).click();
  await page.screenshot({path:`submission/screenshots/${label}.png`,fullPage:true});await context.close();
}
await browser.close();
console.log('Saved actual gameplay screenshots (a seeded demonstration session).');
