import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const imageDir=path.resolve('dist/assets/nocturne-2026/images');
const widths=[480,640,768];
const quality=90;

if(!fs.existsSync(imageDir)){
  console.log('NOCTURNE image directory not present; skipping responsive derivative generation.');
  process.exit(0);
}

const sources=fs.readdirSync(imageDir)
  .filter((name)=>/-1800\.webp$/i.test(name))
  .sort();

if(!sources.length){
  console.log('No NOCTURNE 1800px source images found; nothing to generate.');
  process.exit(0);
}

let written=0;
for(const sourceName of sources){
  const sourcePath=path.join(imageDir,sourceName);
  const base=sourceName.replace(/-1800\.webp$/i,'');
  for(const width of widths){
    const outputPath=path.join(imageDir,`${base}-${width}.webp`);
    await sharp(sourcePath)
      .resize({width,withoutEnlargement:true})
      .webp({quality,effort:4,smartSubsample:true})
      .toFile(outputPath);
    written+=1;
  }
}

console.log(`Generated ${written} responsive NOCTURNE WebP derivatives at quality ${quality}.`);
