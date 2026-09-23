import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('dist');
const htmlFiles=fs.readdirSync(root,{recursive:true})
  .filter((name)=>String(name).endsWith('.html'))
  .map((name)=>path.join(root,String(name)));
const errors=[];
const warnings=[];

function existsLocal(href,base){
  const clean=href.split('#')[0].split('?')[0];
  if(!clean || /^(https?:|mailto:|tel:|data:|javascript:)/i.test(clean)) return true;
  const rel=clean.startsWith('/')?clean.slice(1):path.join(path.relative(root,path.dirname(base)),clean);
  const candidate=path.resolve(root,rel);
  if(fs.existsSync(candidate)) return true;
  if(!path.extname(candidate) && fs.existsSync(candidate+'.html')) return true;
  if(fs.existsSync(path.join(candidate,'index.html'))) return true;
  return false;
}

for(const file of htmlFiles){
  const text=fs.readFileSync(file,'utf8');
  const rel=path.relative(root,file).replaceAll('\\','/');
  if(!/<title>[^<]+<\/title>/i.test(text)) errors.push(rel+': missing title');
  if(!/<meta\s+name="description"\s+content="[^"]+"/i.test(text)) errors.push(rel+': missing meta description');
  if(rel!=='404.html' && !/<link\s+rel="canonical"\s+href="https:\/\/wildonesllc\.com\//i.test(text)) warnings.push(rel+': canonical missing or unexpected');
  for(const match of text.matchAll(/(?:href|src)="([^"]+)"/g)){
    if(!existsLocal(match[1],file)) errors.push(rel+': broken local reference '+match[1]);
  }
  if(text.includes(['WILD','350'].join(''))) errors.push(rel+': prototype producer code found');
  if(/[ÂÃÊ]|â(?:€”|†’|€™|€œ|€)/u.test(text)) errors.push(rel+': mojibake / encoding artifact found');
}

for(const rel of ['index.html','about.html','site-map.html','production.html','events.html','gallery.html','nocturne-2026.html','faq.html','tours.html','book.html','producer-access.html','technical-packet.html','thank-you.html']){
  if(!fs.existsSync(path.join(root,rel))) errors.push('missing required page '+rel);
}

const config=fs.readFileSync('netlify.toml','utf8');
for(const requiredSetting of ['Content-Security-Policy','/technical-packet.html','producer-access']){
  if(!config.includes(requiredSetting)) warnings.push('netlify.toml does not mention '+requiredSetting);
}

const sourceFiles=['dist','netlify','scripts','.github'].flatMap((base)=>{
  if(!fs.existsSync(base)) return [];
  return fs.readdirSync(base,{recursive:true})
    .map((name)=>path.join(base,String(name)))
    .filter((file)=>fs.existsSync(file)&&fs.statSync(file).isFile()&&/\.(html|js|mjs|ts|mts|toml|yml|yaml|md|xml|txt)$/.test(file));
});
for(const file of sourceFiles){
  const text=fs.readFileSync(file,'utf8');
  if(text.includes(['WILD','350'].join(''))) errors.push(file+': obsolete shared producer access code found');
}

const book=fs.readFileSync(path.join(root,'book.html'),'utf8');
if(!book.includes('name="wild-ones-production-inquiry"')||!book.includes('data-secure-form')) errors.push('book.html: secure production inquiry wiring missing');
const tours=fs.readFileSync(path.join(root,'tours.html'),'utf8');
if(!tours.includes('name="wild-ones-site-tour-request"')||!tours.includes('data-secure-form')) errors.push('tours.html: secure site-tour wiring missing');
const producerAccess=fs.readFileSync(path.join(root,'producer-access.html'),'utf8');
if(!producerAccess.includes('name="wild-ones-producer-packet-request"')||!producerAccess.includes('data-secure-form')) errors.push('producer-access.html: secure producer-access request wiring missing');
const packet=fs.readFileSync(path.join(root,'technical-packet.html'),'utf8');
if(!/name="robots"\s+content="noindex, nofollow, noarchive"/i.test(packet)) errors.push('technical-packet.html: noindex protection missing');
if(packet.includes('data-packet-lock')) errors.push('technical-packet.html: obsolete client-side lock remains');

for(const required of [
  ['netlify/functions/wild-ones-inquiry.mts','TURNSTILE_SECRET_KEY'],
  ['netlify/functions/wild-ones-inquiry.mts','WILD_ONES_INGEST_SECRET'],
  ['netlify/functions/wild-ones-inquiry.mts','X-Wild-Ones-Signature'],
  ['netlify/functions/producer-token.mts','PRODUCER_ACCESS_SECRET'],
  ['netlify/edge-functions/producer-access.mts','HttpOnly; Secure; SameSite=Strict']
]){
  const text=fs.readFileSync(required[0],'utf8');
  if(!text.includes(required[1])) errors.push(required[0]+': launch security marker missing: '+required[1]);
}

const scanFiles=['netlify.toml','README.md'].concat(htmlFiles);
const secretPatterns=[
  [/TURNSTILE_SECRET\s*=\s*["'][^"']+/i,'Turnstile secret'],
  [/WILD_ONES_INGEST_SECRET\s*=\s*["'][^"']+/i,'CRM ingest secret'],
  [/PRODUCER_ACCESS_SECRET\s*=\s*["'][^"']+/i,'producer access secret']
];
for(const file of scanFiles){
  const text=fs.readFileSync(file,'utf8');
  for(const [re,label] of secretPatterns){
    if(re.test(text)) errors.push(path.relative('.',file)+': possible committed '+label);
  }
}

for(const warning of warnings) console.log('WARN | '+warning);
for(const error of errors) console.error('FAIL | '+error);
console.log('Checked '+htmlFiles.length+' HTML pages. '+errors.length+' failure(s), '+warnings.length+' warning(s).');
if(errors.length) process.exit(1);
