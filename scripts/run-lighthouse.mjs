import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const configArgIndex=process.argv.indexOf('--config');
const configPath=path.resolve(configArgIndex>=0?process.argv[configArgIndex+1]:'lighthouserc.json');
const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
const ci=config.ci||{};
const collect=ci.collect||{};
const urls=Array.isArray(collect.url)?collect.url:[collect.url].filter(Boolean);
const numberOfRuns=Math.max(1,Number(collect.numberOfRuns||1));
const outputDir=path.resolve(ci.upload?.outputDir||'lighthouse-results');
const port=Number(process.env.LIGHTHOUSE_PREVIEW_PORT||4178);
const baseUrl=`http://127.0.0.1:${port}`;

if(!urls.length) throw new Error('No Lighthouse URLs configured.');

const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
const median=(values)=>{
  const sorted=[...values].sort((a,b)=>a-b);
  const middle=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
};
const slug=(value)=>value.replace(/^\/+|\/+$/g,'').replace(/[^a-z0-9]+/gi,'_')||'home';

const server=spawn(process.execPath,['scripts/preview-server.mjs','--port',String(port)],{
  stdio:['ignore','pipe','pipe'],
  env:{...process.env}
});
let serverOutput='';
server.stdout.on('data',(chunk)=>{serverOutput+=chunk.toString();});
server.stderr.on('data',(chunk)=>{serverOutput+=chunk.toString();});

async function waitForServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{
      const response=await fetch(baseUrl+'/',{cache:'no-store'});
      if(response.ok) return;
    }catch{}
    await sleep(200);
  }
  throw new Error('Preview server did not become ready.\n'+serverOutput);
}

const chrome=await chromeLauncher.launch({
  chromeFlags:['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage']
});

let exitCode=0;
try{
  await waitForServer();
  fs.rmSync(outputDir,{recursive:true,force:true});
  fs.mkdirSync(outputDir,{recursive:true});

  const reportsByPath=new Map();
  for(const configuredUrl of urls){
    const configured=new URL(configuredUrl);
    const pathname=configured.pathname+configured.search;
    const target=baseUrl+pathname;
    const reports=[];
    for(let run=1;run<=numberOfRuns;run+=1){
      process.stdout.write(`Lighthouse ${run}/${numberOfRuns}: ${pathname}\n`);
      const result=await lighthouse(target,{
        port:chrome.port,
        output:'json',
        logLevel:'error',
        onlyCategories:['performance','accessibility','best-practices','seo']
      });
      if(!result?.lhr) throw new Error(`Lighthouse returned no report for ${pathname}`);
      reports.push(result.lhr);
      const file=path.join(outputDir,`${slug(configured.pathname)}-run-${run}.report.json`);
      fs.writeFileSync(file,JSON.stringify(result.lhr));
    }
    reportsByPath.set(configured.pathname,reports);
  }

  const assertions=ci.assert?.assertions||{};
  const categories={
    'categories:performance':'performance',
    'categories:accessibility':'accessibility',
    'categories:best-practices':'best-practices',
    'categories:seo':'seo'
  };
  const summary=[];
  for(const [pathname,reports] of reportsByPath){
    const scores={};
    for(const category of Object.values(categories)){
      scores[category]=median(reports.map((report)=>Number(report.categories?.[category]?.score||0)));
    }
    summary.push({pathname,scores});
  }

  console.log('\nLighthouse medians');
  console.log('| Page | Performance | Accessibility | Best Practices | SEO |');
  console.log('| --- | ---: | ---: | ---: | ---: |');
  for(const row of summary){
    console.log(`| ${row.pathname} | ${Math.round(row.scores.performance*100)} | ${Math.round(row.scores.accessibility*100)} | ${Math.round(row.scores['best-practices']*100)} | ${Math.round(row.scores.seo*100)} |`);
  }

  for(const [assertionKey,category] of Object.entries(categories)){
    const rule=assertions[assertionKey];
    if(!rule) continue;
    const spec=Array.isArray(rule)?rule[1]:rule;
    if(!spec||typeof spec.minScore!=='number') continue;
    for(const row of summary){
      const score=row.scores[category];
      if(score+1e-9<spec.minScore){
        console.error(`FAIL ${row.pathname} ${category}: ${score.toFixed(3)} < ${spec.minScore.toFixed(3)}`);
        exitCode=1;
      }
    }
  }
} finally {
  await chrome.kill().catch(()=>{});
  server.kill('SIGTERM');
}

process.exitCode=exitCode;
