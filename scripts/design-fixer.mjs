import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('dist');
const fix=process.argv.includes('--fix');
const transparent='wild-ones-horizontal-transparent.svg';
const legacy='wild-ones-horizontal-approved.webp';
const errors=[];
const changes=[];

const htmlFiles=fs.readdirSync(root,{recursive:true})
  .filter((name)=>String(name).endsWith('.html'))
  .map((name)=>path.join(root,String(name)));

for(const file of htmlFiles){
  let text=fs.readFileSync(file,'utf8');
  const original=text;

  if(text.includes(legacy)){
    if(fix){
      text=text.replaceAll(legacy,transparent)
        .replaceAll('type="image/webp" href="/assets/brand/'+transparent+'"','type="image/svg+xml" href="/assets/brand/'+transparent+'"');
    }else{
      errors.push(path.relative(root,file)+': legacy opaque logo reference');
    }
  }

  if(/Prototype 2026-09|Producer Technical Packet · Working Draft/i.test(text)){
    if(fix){
      text=text.replaceAll('Producer Technical Packet · Working Draft','Producer Technical Packet · Production Reference')
        .replaceAll('Version: Prototype 2026-09','Updated: September 2026');
    }else{
      errors.push(path.relative(root,file)+': prototype-facing production copy');
    }
  }

  if(text!==original){
    fs.writeFileSync(file,text);
    changes.push(path.relative('.',file));
  }
}

const styles=path.join(root,'assets/css/styles.css');
const css=fs.readFileSync(styles,'utf8');
if(!css.includes('luxury-system.css')) errors.push('styles.css: luxury-system.css is not imported');

const logo=path.join(root,'assets/brand',transparent);
if(!fs.existsSync(logo)) errors.push('transparent logo file missing');
else{
  const svg=fs.readFileSync(logo,'utf8');
  if(!/fill="none"/i.test(svg)) errors.push('transparent logo SVG has no explicit transparent canvas');
  if(/<rect[^>]+fill="(?:white|#fff(?:fff)?)"/i.test(svg)) errors.push('transparent logo SVG contains an opaque white canvas');
}

if(changes.length) console.log('Design fixer updated:\n- '+changes.join('\n- '));
if(errors.length){
  for(const error of errors) console.error('DESIGN FAIL | '+error);
  process.exit(1);
}
console.log('Design system check passed. Transparent branding and production presentation are normalized.');
