import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { generate } from '../src/sudoku.js';
const {puzzle} = generate('medium','grove-art-1');
await mkdir('submission/artwork',{recursive:true});
for (const [label,width,height] of [['square',1024,1024],['landscape',1920,1080],['portrait',1080,1920]]) {
  const size=Math.min(width*.78,height*.76),x=(width-size)/2,y=(height-size)/2,unit=size/9;
  let content=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#e8f4ff"/><stop offset="1" stop-color="#9bc7f2"/></linearGradient><filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#2467a0" flood-opacity=".20"/></filter></defs><rect width="100%" height="100%" fill="url(#bg)"/><circle cx="${width*.12}" cy="${height*.12}" r="${size*.27}" fill="#ffffff" opacity=".18"/><circle cx="${width*.95}" cy="${height*.9}" r="${size*.5}" fill="#448bd1" opacity=".09"/><rect x="${x-20}" y="${y-20}" width="${size+40}" height="${size+40}" rx="22" fill="white" filter="url(#shadow)"/><g transform="translate(${x} ${y})"><rect width="${size}" height="${size}" fill="white"/>`;
  for(let i=0;i<81;i++){const r=Math.floor(i/9),c=i%9;if(r===4||c===4)content+=`<rect x="${c*unit}" y="${r*unit}" width="${unit}" height="${unit}" fill="#eaf1f8"/>`;if(i===40)content+=`<rect x="${c*unit}" y="${r*unit}" width="${unit}" height="${unit}" fill="#b9dbfa"/>`;if(puzzle[i])content+=`<text x="${(c+.5)*unit}" y="${(r+.71)*unit}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${unit*.59}" fill="${i%4===0?'#287dce':'#283f57'}">${puzzle[i]}</text>`;}
  for(let i=0;i<=9;i++)content+=`<path d="M${i*unit} 0V${size}M0 ${i*unit}H${size}" stroke="${i%3===0?'#62768a':'#c5d1dd'}" stroke-width="${i%3===0?3:1}"/>`;
  content+='</g></svg>';
  await writeFile(`submission/artwork/${label}.svg`,content);
  await sharp(Buffer.from(content)).png().toFile(`submission/artwork/${label}.png`);
}
console.log('Exported original, unbranded Sudoku thumbnails in 1:1, 16:9 and 9:16.');
