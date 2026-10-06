import path from 'node:path';
import sharp from 'sharp';

const source=path.resolve('dist/assets/brand/wild-ones-social-source.svg');
const target=path.resolve('dist/assets/brand/wild-ones-social-1200x630.jpg');

await sharp(source,{density:144})
  .resize(1200,630,{fit:'fill'})
  .jpeg({quality:92,mozjpeg:true,chromaSubsampling:'4:4:4'})
  .toFile(target);

console.log('Built '+path.relative('.',target));
