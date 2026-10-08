import fs from 'node:fs';
import path from 'node:path';

const dir=path.resolve('lighthouse-full-results');
const files=fs.existsSync(dir)?fs.readdirSync(dir).filter((name)=>name.endsWith('.report.json')):[];
const intentionalNoindex=new Set(['/404.html','/admin-crm.html','/quality-dashboard.html','/technical-packet.html','/thank-you.html']);
const rows=[];

for(const name of files){
  const report=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
  const url=new URL(report.finalUrl||report.requestedUrl);
  const score=(key)=>Math.round((report.categories?.[key]?.score??0)*100);
  const audits=report.audits||{};
  const opportunities=[];
  for(const [id,audit] of Object.entries(audits)){
    if(audit?.score==null||audit.score>=1) continue;
    if(['manual','notApplicable','informative'].includes(audit.scoreDisplayMode)) continue;
    const savingMs=Math.round(audit.details?.overallSavingsMs||0);
    const savingBytes=Math.round(audit.details?.overallSavingsBytes||0);
    if(savingMs>=100||savingBytes>=20000||['errors-in-console','unsized-images','lcp-lazy-loaded','image-delivery-insight','uses-responsive-images','render-blocking-resources'].includes(id)){
      opportunities.push({id,title:audit.title,display:audit.displayValue||'',savingMs,savingBytes});
    }
  }
  rows.push({
    path:url.pathname,
    performance:score('performance'),
    accessibility:score('accessibility'),
    bestPractices:score('best-practices'),
    seo:score('seo'),
    lcp:Math.round(audits['largest-contentful-paint']?.numericValue||0),
    cls:Number((audits['cumulative-layout-shift']?.numericValue||0).toFixed(3)),
    intentionalNoindex:intentionalNoindex.has(url.pathname),
    opportunities
  });
}
rows.sort((a,b)=>a.path.localeCompare(b.path));
fs.mkdirSync('lighthouse-full-summary',{recursive:true});
fs.writeFileSync('lighthouse-full-summary/report.json',JSON.stringify(rows,null,2)+'\n');

const lines=[
  '# Full-site Lighthouse audit',
  '',
  '| Page | Perf | A11y | Best | SEO | LCP | CLS |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...rows.map((r)=>`| ${r.path} | ${r.performance} | ${r.accessibility} | ${r.bestPractices} | ${r.seo}${r.intentionalNoindex?'*':''} | ${r.lcp} ms | ${r.cls} |`),
  '',
  '*SEO scores marked with * belong to intentionally non-indexed operational/confirmation pages.',
  '',
  '## Actionable opportunities',
  ''
];
for(const r of rows){
  if(!r.opportunities.length) continue;
  lines.push(`### ${r.path}`);
  for(const o of r.opportunities.slice(0,8)){
    const savings=[o.savingMs?`${o.savingMs} ms`:'',o.savingBytes?`${Math.round(o.savingBytes/1024)} KiB`:''].filter(Boolean).join(', ');
    lines.push(`- **${o.title}** (${o.id})${o.display?`: ${o.display}`:''}${savings?` — potential ${savings}`:''}`);
  }
  lines.push('');
}
fs.writeFileSync('lighthouse-full-summary/SUMMARY.md',lines.join('\n')+'\n');
console.log(lines.join('\n'));
