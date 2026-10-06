import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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

for(const rel of ['index.html','about.html','site-map.html','production.html','events.html','case-studies.html','past-events.html','bass-babes-recruitment-2022.html','groove-cruise-2022.html','wild-ones-takes-flight-2022.html','gallery.html','nocturne-2026.html','faq.html','tours.html','book.html','producer-access.html','technical-packet.html','thank-you.html','quality-dashboard.html']){
  if(!fs.existsSync(path.join(root,rel))) errors.push('missing required page '+rel);
}

const pastEventManifestPath=path.join(root,'assets/past-events/gallery-manifest.json');
if(!fs.existsSync(pastEventManifestPath)) errors.push('past-event gallery manifest missing');
else {
  try {
    const manifest=JSON.parse(fs.readFileSync(pastEventManifestPath,'utf8'));
    for(const [eventKey,event] of Object.entries(manifest.events||{})){
      if(!Array.isArray(event.photos)) errors.push('past-event manifest '+eventKey+': photos must be an array');
      for(const photo of event.photos||[]){
        for(const field of ['thumb','full']){
          const asset=photo[field];
          if(!asset) errors.push('past-event manifest '+eventKey+': missing '+field);
          else if(!fs.existsSync(path.join(root,asset))) errors.push('past-event manifest '+eventKey+': missing asset '+asset);
        }
        if(!photo.alt) warnings.push('past-event manifest '+eventKey+': photo missing alt text');
      }
      if(!Array.isArray(event.artists)) errors.push('past-event manifest '+eventKey+': artists must be an array');
      for(const collection of ['flyers','memorabilia']){
        if(!Array.isArray(event[collection])) errors.push('past-event manifest '+eventKey+': '+collection+' must be an array');
        for(const item of event[collection]||[]){
          const asset=item.full||item.thumb||item.src;
          if(!asset) errors.push('past-event manifest '+eventKey+': '+collection+' item missing image asset');
          else if(!fs.existsSync(path.join(root,asset))) errors.push('past-event manifest '+eventKey+': missing asset '+asset);
          if(!item.alt) warnings.push('past-event manifest '+eventKey+': '+collection+' item missing alt text');
        }
      }
    }
  } catch(error) {
    errors.push('past-event gallery manifest invalid JSON: '+error.message);
  }
}

const approvedHorizontalName='wild-ones-horizontal-transparent.svg';
const approvedStackedName='wild-ones-stacked-approved.svg';
const approvedEmblemName='wild-ones-emblem-approved.svg';
const approvedSocialName='wild-ones-social-card.svg';
const approvedHorizontalBlobSha='7a295a5e079ef62a95e1e26b3ced14f1a6dcc84f';
const approvedStackedBlobSha='6362a3a4263e38fd64edf6fac849db45693b968e';
const approvedEmblemBlobSha='da7054ac7e2fde3f0929157da60b71f19940b931';
const approvedSocialBlobSha='6ccb55ade85c8f6b0c83d1167c621c0e902cc33d';
const approvedBrandNames=new Set([approvedHorizontalName,approvedStackedName,approvedEmblemName,approvedSocialName]);
function brandFileName(value){
  const decoded=String(value||'').replaceAll('&amp;','&');
  try{
    if(decoded.includes('/.netlify/images?')){
      const u=new URL(decoded);
      const source=u.searchParams.get('url')||'';
      return source.split('/').pop().split('?')[0];
    }
  }catch{}
  return decoded.split('/').pop().split('?')[0];
}
const gitBlobSha=(text)=>crypto.createHash('sha1').update('blob '+Buffer.byteLength(text)+'\0').update(text).digest('hex');
const transparentLogo=path.join(root,'assets/brand',approvedHorizontalName);
const stackedLogo=path.join(root,'assets/brand',approvedStackedName);
const emblemLogo=path.join(root,'assets/brand',approvedEmblemName);
const socialCard=path.join(root,'assets/brand',approvedSocialName);
if(!fs.existsSync(transparentLogo)) errors.push('approved horizontal logo asset missing');
else {
  const logo=fs.readFileSync(transparentLogo,'utf8');
  if(gitBlobSha(logo)!==approvedHorizontalBlobSha) errors.push('approved horizontal logo bytes changed');
  if(!/viewBox="0 0 480 160"/i.test(logo)) errors.push('approved horizontal logo viewBox changed');
  if(!/fill="none"/i.test(logo) || /<rect[^>]+fill="(?:#fff|white)"/i.test(logo)) errors.push('approved horizontal logo does not preserve its transparent canvas');
  if(!/<image[^>]+data:image\/webp;base64,/i.test(logo)) errors.push('approved horizontal logo artwork payload missing');
  if(/<text\b|linearGradient\s+id="gold"/i.test(logo)) errors.push('hand-built approximation detected in approved horizontal logo');
}
if(!fs.existsSync(stackedLogo)) errors.push('approved stacked logo asset missing');
else {
  const logo=fs.readFileSync(stackedLogo,'utf8');
  if(gitBlobSha(logo)!==approvedStackedBlobSha) errors.push('approved stacked logo bytes changed');
  if(!/viewBox="0 0 640 760"/i.test(logo)) errors.push('approved stacked logo viewBox changed');
  if(!/<image[^>]+data:image\/webp;base64,/i.test(logo)) errors.push('approved stacked logo artwork payload missing');
  if(/<text\b|linearGradient\s+id="gold"/i.test(logo)) errors.push('hand-built approximation detected in approved stacked logo');
}
if(!fs.existsSync(emblemLogo)) errors.push('approved emblem asset missing');
else {
  const logo=fs.readFileSync(emblemLogo,'utf8');
  if(gitBlobSha(logo)!==approvedEmblemBlobSha) errors.push('approved emblem bytes changed');
  if(!/viewBox="0 0 160 160"/i.test(logo)) errors.push('approved emblem viewBox changed');
  if(!/<image[^>]+data:image\/webp;base64,/i.test(logo)) errors.push('approved emblem artwork payload missing');
}
if(!fs.existsSync(socialCard)) errors.push('approved 1200x630 social card missing');
else {
  const card=fs.readFileSync(socialCard,'utf8');
  if(gitBlobSha(card)!==approvedSocialBlobSha) errors.push('approved social card bytes changed');
  if(!/width="1200"\s+height="630"/i.test(card) || !/viewBox="0 0 1200 630"/i.test(card)) errors.push('social card is not exactly 1200x630');
  if(!/<image[^>]+data:image\/webp;base64,/i.test(card)) errors.push('social card is not built from approved logo artwork');
}

function assertContainerLogo(text,rel,className,allowedNames){
  const re=new RegExp('<[^>]+class="[^"]*\\b'+className+'\\b[^"]*"[^>]*>[\\s\\S]{0,1600}?<img[^>]+src="([^"]+)"','gi');
  for(const match of text.matchAll(re)){
    if(!allowedNames.some((name)=>match[1].includes(name))) errors.push(rel+': '+className+' uses unapproved logo '+match[1]);
  }
}

for(const file of htmlFiles){
  const text=fs.readFileSync(file,'utf8');
  const rel=path.relative(root,file).replaceAll('\\','/');

  for(const match of text.matchAll(/(?:src|srcset|href)="([^"]*assets\/brand\/wild-ones-[^"]+)"/gi)){
    const fileName=brandFileName(match[1]);
    if(!approvedBrandNames.has(fileName)) errors.push(rel+': unapproved Wild Ones brand asset reference '+match[1]);
  }

  assertContainerLogo(text,rel,'brand-lockup',[approvedHorizontalName]);
  assertContainerLogo(text,rel,'footer-brand',[approvedHorizontalName]);
  assertContainerLogo(text,rel,'brand-panel',[approvedStackedName]);
  assertContainerLogo(text,rel,'packet-cover',[approvedStackedName]);
  assertContainerLogo(text,rel,'packet-lock',[approvedHorizontalName,approvedStackedName]);
  assertContainerLogo(text,rel,'qd-brand',[approvedHorizontalName]);

  for(const match of text.matchAll(/<img[^>]+class="[^"]*\berror-brand-lockup\b[^"]*"[^>]+src="([^"]+)"/gi)){
    if(!match[1].includes(approvedEmblemName)) errors.push(rel+': error-brand-lockup does not use approved emblem '+match[1]);
  }

  for(const match of text.matchAll(/<source[^>]+srcset="([^"]*assets\/brand\/wild-ones-[^"]+)"/gi)){
    const fileName=match[1].split('/').pop().split('?')[0];
    if(!approvedBrandNames.has(fileName)) errors.push(rel+': responsive source uses unapproved logo '+match[1]);
  }

  const iconChecks=[
    ['icon',approvedEmblemName],
    ['apple-touch-icon',approvedEmblemName],
    ['mask-icon',approvedEmblemName],
    ['manifest','site.webmanifest']
  ];
  for(const [relName,required] of iconChecks){
    const re=new RegExp('<link[^>]+rel="'+relName+'"[^>]+href="([^"]+)"','i');
    const match=text.match(re);
    if(!match) errors.push(rel+': missing '+relName+' brand hook');
    else if(!match[1].includes(required)) errors.push(rel+': '+relName+' uses unexpected asset '+match[1]);
  }
  if(!/<meta[^>]+name="theme-color"[^>]+content="#050505"/i.test(text)) errors.push(rel+': theme color missing or changed');

  const noindex=/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(text);
  const canonical=(text.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)||[])[1];
  if(canonical&&!noindex){
    for(const marker of ['og:type','og:site_name','og:title','og:description','og:url','og:image','og:image:type','og:image:width','og:image:height','og:image:alt']){
      if(!new RegExp('<meta[^>]+property="'+marker+'"','i').test(text)) errors.push(rel+': missing '+marker);
    }
    for(const marker of ['twitter:card','twitter:title','twitter:description','twitter:image','twitter:image:alt']){
      if(!new RegExp('<meta[^>]+name="'+marker+'"','i').test(text)) errors.push(rel+': missing '+marker);
    }
    if(!/<meta[^>]+property="og:image:width"[^>]+content="1200"/i.test(text)) errors.push(rel+': og:image width must be 1200');
    if(!/<meta[^>]+property="og:image:height"[^>]+content="630"/i.test(text)) errors.push(rel+': og:image height must be 630');
    if(!/<meta[^>]+property="og:image:type"[^>]+content="image\/jpeg"/i.test(text)) errors.push(rel+': og:image type must be image/jpeg');
    for(const match of text.matchAll(/<meta[^>]+(?:property="og:image"|name="twitter:image")[^>]+content="([^"]+)"/gi)){
      const normalized=match[1].replaceAll('&amp;','&');
      if(!normalized.startsWith('https://wildonesllc.com/.netlify/images?')) errors.push(rel+': social image must use the dedicated first-party Image CDN card '+match[1]);
      else {
        const u=new URL(normalized);
        const source=u.searchParams.get('url')||'';
        if(source!=='/assets/brand/'+approvedSocialName) errors.push(rel+': social image source is not the approved card '+source);
        if(u.searchParams.get('w')!=='1200'||u.searchParams.get('h')!=='630') errors.push(rel+': social image transform is not 1200x630');
        if(u.searchParams.get('fit')!=='fill'||u.searchParams.get('fm')!=='jpg') errors.push(rel+': social image transform must render exact JPEG dimensions');
        const local=source.replace(/^\//,'');
        if(!fs.existsSync(path.join(root,local))) errors.push(rel+': social card source does not resolve '+source);
      }
    }
    for(const match of text.matchAll(/<meta[^>]+(?:property="og:image"|name="twitter:image")[^>]+content="([^"]+)"/gi)){
      if(/nocturne-dancefloor-wide-01-1800\.webp/i.test(match[1])) errors.push(rel+': NOCTURNE event photo remains in social metadata');
    }

  }
}

const manifestPath=path.join(root,'site.webmanifest');
if(!fs.existsSync(manifestPath)) errors.push('site.webmanifest missing');
else {
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(manifest.name!=='Wild Ones LLC') errors.push('site.webmanifest: unexpected app name');
  const icons=Array.isArray(manifest.icons)?manifest.icons:[];
  if(!icons.length) errors.push('site.webmanifest: icons missing');
  for(const icon of icons){
    if(!String(icon.src||'').includes(approvedEmblemName)) errors.push('site.webmanifest: unapproved icon '+String(icon.src||''));
  }
}

const approvedAssetsPath=path.join(root,'assets/brand/approved-assets.json');
if(!fs.existsSync(approvedAssetsPath)) errors.push('approved brand asset registry missing');

const brandDir=path.join(root,'assets/brand');
const allowedBrandFiles=new Set([
  approvedHorizontalName,
  approvedStackedName,
  approvedEmblemName,
  approvedSocialName,
  'wild-ones-horizontal-approved.webp',
  'approved-assets.json'
]);
if(fs.existsSync(brandDir)){
  for(const entry of fs.readdirSync(brandDir)){
    if(/wild-ones|logo|emblem/i.test(entry)&&!allowedBrandFiles.has(entry)) errors.push('unapproved brand file remains in assets/brand: '+entry);
  }
}
for(const file of htmlFiles){
  const text=fs.readFileSync(file,'utf8');
  for(const match of text.matchAll(/\/assets\/brand\/(wild-ones-[A-Za-z0-9._-]+)/g)){
    if(!allowedBrandFiles.has(match[1])) errors.push(path.relative(root,file)+': unapproved brand reference outside markup '+match[1]);
  }
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

  for(const match of text.matchAll(/(?:src|srcset|href|content)=(?:["'])([^"']*assets\/brand\/wild-ones-[^"']+)(?:["'])/gi)){
    const fileName=brandFileName(match[1]);
    if(!allowedBrandFiles.has(fileName)) errors.push(path.relative('.',file)+': unapproved Wild Ones brand reference '+match[1]);
  }
  if(/favicon(?:-\d+x\d+)?\.(?:ico|png)|apple-touch-icon|browserconfig|site\.webmanifest/i.test(text)){
    for(const match of text.matchAll(/(?:src|srcset|href|content)=(?:["'])([^"']+)(?:["'])/gi)){
      const value=match[1];
      if(value.includes('/.netlify/images?')) continue;
      if(/favicon|apple-touch-icon|assets\/brand\/wild-ones-/i.test(value)){
        const local=value.replace(/^https:\/\/wildonesllc\.com\//,'').replace(/^\//,'');
        if(local && !local.startsWith('assets/brand/') && local!=='site.webmanifest'){
          warnings.push(path.relative('.',file)+': nonstandard browser-brand reference '+value);
        }
      }
    }
  }
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
const qualityDashboard=fs.readFileSync(path.join(root,'quality-dashboard.html'),'utf8');
if(!/name="robots"\s+content="noindex, nofollow, noarchive"/i.test(qualityDashboard)) errors.push('quality-dashboard.html: noindex protection missing');

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

fs.mkdirSync('quality-results',{recursive:true});
fs.writeFileSync('quality-results/static.json',JSON.stringify({
  generatedAt:new Date().toISOString(),
  htmlPages:htmlFiles.length,
  errors,
  warnings
},null,2)+'\n');

for(const warning of warnings) console.log('WARN | '+warning);
for(const error of errors) console.error('FAIL | '+error);
console.log('Checked '+htmlFiles.length+' HTML pages. '+errors.length+' failure(s), '+warnings.length+' warning(s).');
if(errors.length) process.exit(1);
