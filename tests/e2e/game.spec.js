import { test, expect } from '@playwright/test';
const SDK = '**/game_api/**';
test.afterEach(async({},testInfo)=>{ if(testInfo.error) console.log('TEST FAILURE DETAILS:',testInfo.error.message); });
test.beforeEach(async({page})=>{ page.on('pageerror',e=>console.log('PAGE ERROR:',e.message)); page.on('console',m=>{if(m.type()==='error')console.log('BROWSER ERROR:',m.text())}); await page.route(SDK,route=>route.fulfill({contentType:'application/javascript',body:'window.ytgame={IN_PLAYABLES_ENV:false}'})); });
async function open(page) { await page.goto('/');await expect(page.locator('#app')).toBeVisible();await expect(page.locator('canvas')).toBeVisible(); }
test('notes, undo, values, mistakes, erase, save and reload',async({page})=>{
  await open(page);
  const cell=page.locator('.cell.entry').first();await cell.click();
  await page.getByRole('button',{name:'Notes OFF'}).click();await page.getByRole('button',{name:'Enter 3',exact:true}).click();
  await expect(cell).toHaveAttribute('aria-label',/notes 3/);await page.locator('#undo').click();await expect(cell).not.toHaveAttribute('aria-label',/notes/);
  await page.locator('#notes').click();await page.getByRole('button',{name:'Enter 1',exact:true}).click();
  await expect(cell).toHaveText('1');await expect(page.locator('#save-status')).toContainText('Saved');
  const index=await cell.getAttribute('data-index');await page.reload();await expect(page.locator(`[data-index="${index}"]`)).toHaveText('1');
  await page.locator(`[data-index="${index}"]`).click();await page.locator('#erase').click();await expect(page.locator(`[data-index="${index}"]`)).toHaveText('');
});
test('new puzzle, daily ritual, keyboard navigation, pause, help, and hints',async({page})=>{
  await open(page);await page.locator('#new-game').click();await page.locator('[data-level=hard]').click();await page.locator('#start-game').click();await expect(page.locator('#level')).toHaveText('Hard');
  await page.locator('.cell.entry').first().click();await page.keyboard.press('ArrowRight');await expect(page.locator('.cell.selected')).toBeFocused();
  await page.locator('#pause').click();await expect(page.locator('#pause-cover')).toBeVisible();const old=await page.locator('#timer').textContent();await page.waitForTimeout(1100);await expect(page.locator('#timer')).toHaveText(old);await page.locator('#resume').click();
  await page.locator('#help').click();await expect(page.locator('#dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#dialog')).not.toBeVisible();
  await page.locator('#daily').click();await page.locator('#start-game').click();await expect(page.locator('#mode-label')).toContainText('DAILY CHALLENGE');await expect(page.locator('#level')).toHaveText('Medium');
  await page.locator('#hint').click();await expect(page.locator('#feedback')).toContainText('Hint:');
});
test('complete a puzzle through the UI and preserve completion on reload',async({page})=>{
  await open(page);const blanks=await page.locator('.cell.entry').count();
  for(let i=0;i<blanks;i++) await page.locator('#hint').click();
  await expect(page.locator('#dialog-title')).toHaveText('Look what you grew.');await expect(page.locator('#wins')).toHaveText('1');
  await page.reload();await expect(page.locator('#dialog-title')).toHaveText('Look what you grew.');await expect(page.locator('#wins')).toHaveText('1');
});
test('themes and helpers persist; restart clears progress after confirmation',async({page})=>{
  await open(page);await page.locator('#hint').click();await page.locator('#settings').click();
  await page.locator('[data-theme-choice=dark]').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.locator('#auto-check').uncheck();await page.locator('#close-dialog').click();await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(page.locator('#meta-mistakes')).toHaveText('Off');
  await page.locator('#settings').click();await page.locator('#restart').click();await page.locator('#confirm-restart').click();
  await expect(page.locator('#timer')).toHaveText('00:00');await expect(page.locator('#progress')).toHaveText('42 of 81');
});
test('responsive canvas and controls remain usable at phone, tablet, ultrawide, and short landscape sizes',async({page})=>{
  await open(page);
  for(const [width,height] of [[320,568],[390,844],[768,1024],[1920,540],[844,390],[320,1138]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(150);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const board=await page.locator('#board').boundingBox();expect(Math.abs(board.width-board.height)).toBeLessThan(2);
    await page.locator('.cell.entry').first().click();await page.locator('#hint').click();await expect(page.locator('#feedback')).toContainText('Hint:');
  }
});
test('host readiness, cloud save, pause/resume, mute and score integration',async({page})=>{
  await page.unroute(SDK);
  await page.route(SDK,route=>route.fulfill({contentType:'application/javascript',body:`
    window.calls=[];window.callbacks={};window.ytgame={IN_PLAYABLES_ENV:true,
    game:{firstFrameReady(){calls.push('first')},gameReady(){calls.push('ready')},async loadData(){calls.push('load');return ''},async saveData(data){calls.push(['save',data])}},
    system:{isAudioEnabled:()=>false,onAudioEnabledChange:fn=>callbacks.audio=fn,getLanguage:async()=>'en',onPause:fn=>callbacks.pause=fn,onResume:fn=>callbacks.resume=fn},engagement:{async sendScore(score){calls.push(['score',score])}}};` }));
  await open(page);expect(await page.evaluate(()=>calls.slice(0,3))).toEqual(['first','load','ready']);
  await page.locator('#hint').click();expect(await page.evaluate(()=>calls.some(c=>c[0]==='save'))).toBe(true);
  await page.evaluate(()=>callbacks.pause());await expect(page.locator('#pause-cover')).toBeVisible();
  const count=await page.evaluate(()=>calls.length);const timer=await page.locator('#timer').textContent();await page.waitForTimeout(1200);expect(await page.evaluate(()=>calls.length)).toBe(count);await expect(page.locator('#timer')).toHaveText(timer);
  await page.evaluate(()=>{callbacks.audio(true);callbacks.resume()});await expect(page.locator('#pause-cover')).not.toBeVisible();
  const blanks=await page.locator('.cell.entry').count()-1;for(let i=0;i<blanks;i++) await page.locator('#hint').click();
  expect(await page.evaluate(()=>calls.find(c=>c[0]==='score')[1].value)).toBeGreaterThanOrEqual(100);
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});
