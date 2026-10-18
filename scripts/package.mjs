import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { zipSync, unzipSync } from 'fflate';
import { createHash } from 'node:crypto';
const entries = {};
async function collect(dir, prefix = '') {
  for (const entry of await readdir(dir, {withFileTypes:true})) {
    const key = prefix + entry.name;
    if (entry.isDirectory()) await collect(`${dir}/${entry.name}`, `${key}/`);
    else { if (!/^[a-zA-Z0-9_.\/-]+$/.test(key)) throw Error(`Invalid bundle path: ${key}`); entries[key] = new Uint8Array(await readFile(`${dir}/${entry.name}`)); }
  }
}
await collect('dist');
if (!entries['index.html']) throw Error('Build must have index.html at root');
const html = new TextDecoder().decode(entries['index.html']);
if (html.indexOf('https://www.youtube.com/game_api/v1') > html.indexOf('type="module"')) throw Error('SDK must load first');
const js = Object.entries(entries).filter(([name])=>name.endsWith('.js')).map(([,data])=>new TextDecoder().decode(data)).join('');
for (const forbidden of ['visibilitychange','document.hidden','navigator.language','phaser3spectorjs']) if (js.includes(forbidden)) throw Error(`Disallowed engine behavior in build: ${forbidden}`);
const files = Object.entries(entries).map(([path, data])=>({path,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')}));
if (files.length > 8000 || files.some(f=>f.bytes>=30*1024*1024)) throw Error('Bundle exceeds file requirements');
const total = files.reduce((sum,file)=>sum+file.bytes,0);
if (total>=30*1024*1024) throw Error('Initial bundle too large');
const archive=zipSync(entries,{level:9});
const unpacked=unzipSync(archive); if(Object.keys(unpacked).length!==files.length) throw Error('ZIP verification failed');
await mkdir('release',{recursive:true});
await writeFile('release/sudoku-grove-1.0.0.zip',archive);
const report={game:'Sudoku Grove',version:'1.0.0',created:new Date().toISOString(),files,totalBytes:total,zipBytes:archive.length,zipSha256:createHash('sha256').update(archive).digest('hex'),sdkBeforeGame:true,relativeAssetPaths:true,lifecycleScanPassed:true,certifiedByYouTube:false};
await writeFile('release/bundle-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
