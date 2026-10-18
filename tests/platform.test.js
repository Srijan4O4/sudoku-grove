import test from 'node:test';
import assert from 'node:assert/strict';
import { Platform } from '../src/platform.js';
function mock() {
  const calls = [], callbacks = {};
  return { calls, callbacks, sdk: { IN_PLAYABLES_ENV:true,game:{ firstFrameReady(){calls.push('first')},gameReady(){calls.push('ready')}, async loadData(){calls.push('load');return '{"old":1}'}, async saveData(data){calls.push(['save',JSON.parse(data)])} },system:{ isAudioEnabled:()=>false,onAudioEnabledChange:fn=>callbacks.audio=fn,getLanguage:async()=>'en',onPause:fn=>callbacks.pause=fn,onResume:fn=>callbacks.resume=fn },engagement:{sendScore:async score=>calls.push(['score',score])} } };
}
test('host load precedes saving; host path never uses browser storage',async()=>{
  const m=mock();const p=new Platform(m.sdk,{getItem(){throw Error('local storage forbidden')},setItem(){throw Error('forbidden')}});
  p.firstFrame();assert.deepEqual(await p.load(),{old:1});p.ready();p.save({version:1});await p.flush();
  assert.deepEqual(m.calls,['first','load','ready',['save',{version:1}]]);assert.equal(p.audio,false);m.callbacks.audio(true);assert.equal(p.audio,true);
});
test('failed cloud load prevents destructive saves and can be retried',async()=>{
  const m=mock();m.sdk.game.loadData=async()=>{throw Error('offline')};const p=new Platform(m.sdk,null);
  await p.load();p.save({unsafe:true});assert.equal(p.loaded,false);assert.equal(m.calls.length,0);
  m.sdk.game.loadData=async()=>'{"restored":true}';assert.deepEqual(await p.load(),{restored:true});assert.equal(p.loaded,true);
});
test('pause allows a final save then suppresses subsequent network calls until resume',async()=>{
  const m=mock();const p=new Platform(m.sdk,null);await p.load();let paused=false;
  p.bindPause(()=>{p.save({final:true});paused=true},()=>paused=false);
  m.callbacks.pause();await Promise.resolve();assert.equal(paused,true);const length=m.calls.length;
  p.save({later:true});await p.sendScore(10);await p.flush();assert.equal(m.calls.length,length);
  m.callbacks.resume();await Promise.resolve();assert.equal(paused,false);assert.ok(m.calls.some(c=>Array.isArray(c)&&c[0]==='save'&&c[1].later));
});
test('standalone saves tolerate unavailable storage',async()=>{
  const p=new Platform(undefined,{getItem(){throw Error('denied')},setItem(){throw Error('denied')}});
  assert.equal(await p.load(),null);p.save({a:1});assert.equal(p.loaded,false);assert.match(p.status,/not saved/);
});
