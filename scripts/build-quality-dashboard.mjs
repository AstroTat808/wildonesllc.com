import fs from 'node:fs';
import path from 'node:path';

const cwd=process.cwd();
const args=Object.fromEntries(process.argv.slice(2).reduce((acc,item,i,arr)=>{
  if(item.startsWith('--')) acc.push([item.slice(2),arr[i+1]??'']);
  return acc;
},[]));

const inputRoot=path.resolve(args.input||process.env.QUALITY_INPUT_DIR||'quality-input');
const outputRoot=path.resolve(args.output||process.env.QUALITY_OUTPUT_DIR||'quality-dashboard');

function findFiles(root,predicate){
  if(!fs.existsSync(root)) return [];
  return fs.readdirSync(root,{recursive:true})
    .map((name)=>path.join(root,String(name)))
    .filter((file)=>fs.existsSync(file)&&fs.statSync(file).isFile()&&predicate(file));
}
function findOne(root,name){
  return findFiles(root,(file)=>path.basename(file)===name)[0]||null;
}
function readJson(file,fallback=null){
  if(!file) return fallback;
  try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}
}
function median(values){
  const vals=values.filter((v)=>Number.isFinite(v)).sort((a,b)=>a-b);
  if(!vals.length) return null;
  const mid=Math.floor(vals.length/2);
  return vals.length%2?vals[mid]:(vals[mid-1]+vals[mid])/2;
}
function pct(score){ return Number.isFinite(score)?Math.round(score*100):null; }
function status(value){ return value==='success'?'PASS':value==='failure'?'FAIL':value==='cancelled'?'CANCELLED':value==='skipped'?'SKIPPED':'UNKNOWN'; }

const seed=readJson(path.resolve('dist/assets/data/site-quality.json'),{});
const visual=readJson(findOne(path.join(inputRoot,'visual'),'report.json'),null);
const regression=readJson(findOne(path.join(inputRoot,'diff'),'report.json'),null);
const staticReport=readJson(findOne(path.join(inputRoot,'static'),'static.json'),null);
const browserJson=findFiles(path.join(inputRoot,'browser'),(file)=>path.basename(file)==='results.json')
  .map((file)=>readJson(file,null)).find(Boolean)||null;

const lhFiles=findFiles(path.join(inputRoot,'lighthouse'),(file)=>file.endsWith('.report.json'));
const lighthouseRuns=[];
for(const file of lhFiles){
  const j=readJson(file,null);
  if(!j?.categories) continue;
  lighthouseRuns.push({
    url:j.finalUrl||j.requestedUrl||'',
    performance:j.categories.performance?.score,
    accessibility:j.categories.accessibility?.score,
    bestPractices:j.categories['best-practices']?.score,
    seo:j.categories.seo?.score
  });
}
const byUrl=new Map();
for(const row of lighthouseRuns){
  const key=(row.url||'').replace(/^https?:\/\/[^/]+/,'')||'/';
  if(!byUrl.has(key)) byUrl.set(key,[]);
  byUrl.get(key).push(row);
}
const pages=[...byUrl.entries()].map(([url,rows])=>({
  url,
  performance:pct(median(rows.map(r=>r.performance))),
  accessibility:pct(median(rows.map(r=>r.accessibility))),
  bestPractices:pct(median(rows.map(r=>r.bestPractices))),
  seo:pct(median(rows.map(r=>r.seo)))
})).sort((a,b)=>a.url.localeCompare(b.url));
const lighthouse= lighthouseRuns.length ? {
  performance:pct(median(lighthouseRuns.map(r=>r.performance))),
  accessibility:pct(median(lighthouseRuns.map(r=>r.accessibility))),
  bestPractices:pct(median(lighthouseRuns.map(r=>r.bestPractices))),
  seo:pct(median(lighthouseRuns.map(r=>r.seo))),
  pages
} : seed.lighthouse||{};

let browser={...(seed.browser||{})};
if(browserJson){
  let passed=0,failed=0,skipped=0;
  const walk=(node)=>{
    if(!node||typeof node!=='object') return;
    if(Array.isArray(node)){ for(const item of node) walk(item); return; }
    if(Array.isArray(node.results)){
      const final=node.results.at(-1);
      if(final?.status==='passed') passed++;
      else if(final?.status==='skipped') skipped++;
      else if(final?.status) failed++;
    }
    for(const [k,v] of Object.entries(node)) if(k!=='results') walk(v);
  };
  walk(browserJson.suites||browserJson);
  browser={passed,failed,skipped,status:failed?'FAIL':'PASS'};
}

const env={
  static:status(process.env.STATIC_RESULT),
  browser:status(process.env.BROWSER_RESULT),
  visual:status(process.env.VISUAL_RESULT),
  lighthouse:status(process.env.LIGHTHOUSE_RESULT)
};
const releasePass=Object.values(env).every((v)=>v==='PASS');
const runId=process.env.GITHUB_RUN_ID||seed.source?.runId||null;
const runNumber=process.env.GITHUB_RUN_NUMBER||seed.source?.runNumber||null;
const repository=process.env.GITHUB_REPOSITORY||'AstroTat808/wildonesllc.com';
const server=process.env.GITHUB_SERVER_URL||'https://github.com';
const source={
  branch:process.env.GITHUB_REF_NAME||seed.source?.branch||'main',
  commit:process.env.GITHUB_SHA||seed.source?.commit||null,
  runId,
  runNumber,
  runUrl:runId?server+'/'+repository+'/actions/runs/'+runId:seed.source?.runUrl||null
};

const data={
  schemaVersion:1,
  generatedAt:new Date().toISOString(),
  source,
  release:{
    status:releasePass?'GO':'NO-GO',
    static:env.static==='UNKNOWN'?(seed.release?.static||'UNKNOWN'):env.static,
    browser:env.browser==='UNKNOWN'?(seed.release?.browser||'UNKNOWN'):env.browser,
    visual:env.visual==='UNKNOWN'?(seed.release?.visual||'UNKNOWN'):env.visual,
    lighthouse:env.lighthouse==='UNKNOWN'?(seed.release?.lighthouse||'UNKNOWN'):env.lighthouse
  },
  static:staticReport?{
    htmlPages:staticReport.htmlPages??null,
    failures:(staticReport.errors||[]).length,
    warnings:(staticReport.warnings||[]).length,
    brokenLinks:(staticReport.errors||[]).filter((x)=>String(x).includes('broken local reference')).length,
    status:(staticReport.errors||[]).length?'FAIL':'PASS'
  }:(seed.static||{}),
  browser,
  visual:visual?{
    routes:visual.routes?.length||0,
    viewports:visual.viewports||[],
    screenshots:(visual.routes?.length||0)*(visual.viewports?.length||0),
    hardFailures:visual.hardFailures?.length||0,
    warnings:visual.warnings?.length||0,
    status:(visual.hardFailures?.length||0)?'FAIL':'PASS'
  }:(seed.visual||{}),
  visualRegression:regression?{
    status:regression.status,
    comparedScreenshots:regression.comparedScreenshots,
    changedScreenshots:regression.changedScreenshots,
    blockingScreenshots:regression.blockingScreenshots,
    approvedOverride:regression.approvedOverride,
    maxDiffRatio:regression.maxDiffRatio
  }:{
    ...(seed.visualRegression||{}),
    status:process.env.GITHUB_EVENT_NAME==='push'?'BASELINE_PUBLISHED':(seed.visualRegression?.status||'BASELINE_READY')
  },
  lighthouse
};

fs.rmSync(outputRoot,{recursive:true,force:true});
fs.mkdirSync(path.join(outputRoot,'assets/data'),{recursive:true});
fs.mkdirSync(path.join(outputRoot,'assets/css'),{recursive:true});
fs.mkdirSync(path.join(outputRoot,'assets/js'),{recursive:true});
fs.mkdirSync(path.join(outputRoot,'assets/brand'),{recursive:true});

fs.copyFileSync('dist/quality-dashboard.html',path.join(outputRoot,'index.html'));
fs.copyFileSync('dist/assets/css/quality-dashboard.css',path.join(outputRoot,'assets/css/quality-dashboard.css'));
fs.copyFileSync('dist/assets/js/quality-dashboard.js',path.join(outputRoot,'assets/js/quality-dashboard.js'));
for(const brandFile of [
  'wild-ones-horizontal-transparent.svg',
  'wild-ones-stacked-approved.svg',
  'wild-ones-emblem-approved.svg',
  'wild-ones-social-card.svg',
  'approved-assets.json'
]){
  fs.copyFileSync(path.join('dist','assets','brand',brandFile),path.join(outputRoot,'assets','brand',brandFile));
}
fs.copyFileSync('dist/site.webmanifest',path.join(outputRoot,'site.webmanifest'));
fs.writeFileSync(path.join(outputRoot,'assets/data/site-quality.json'),JSON.stringify(data,null,2)+'\n');

const summary=[
  '# Site Quality Dashboard',
  '',
  'Release readiness: **'+data.release.status+'**',
  'Static integrity: **'+data.release.static+'**',
  'Browser QA: **'+data.release.browser+'**',
  'Visual QA: **'+data.release.visual+'**',
  'Lighthouse: **'+data.release.lighthouse+'**',
  'Visual regression: **'+(data.visualRegression?.status||'UNKNOWN')+'**',
  '',
  'Lighthouse median: Performance **'+(data.lighthouse?.performance??'—')+'**, Accessibility **'+(data.lighthouse?.accessibility??'—')+'**, Best Practices **'+(data.lighthouse?.bestPractices??'—')+'**, SEO **'+(data.lighthouse?.seo??'—')+'**.'
].join('\n');
fs.writeFileSync(path.join(outputRoot,'SUMMARY.md'),summary+'\n');
console.log(summary);
