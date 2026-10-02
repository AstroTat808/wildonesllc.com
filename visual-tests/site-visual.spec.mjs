import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const routes=[
  '/', '/about.html', '/site-map.html', '/production.html', '/events.html',
  '/case-studies.html', '/nocturne-2026.html', '/gallery.html', '/faq.html',
  '/tours.html', '/book.html', '/producer-access.html', '/technical-packet.html',
  '/thank-you.html', '/admin-crm.html', '/quality-dashboard.html', '/404.html'
];

const viewports=[
  {name:'desktop-1440',width:1440,height:1000,mobile:false},
  {name:'tablet-1024',width:1024,height:900,mobile:false},
  {name:'mobile-430',width:430,height:932,mobile:true},
  {name:'mobile-390',width:390,height:844,mobile:true},
  {name:'mobile-320',width:320,height:800,mobile:true}
];

const outDir=path.resolve('visual-qa');
fs.mkdirSync(outDir,{recursive:true});

function slug(route){
  return route==='/'?'home':route.replace(/^\//,'').replace(/\.html$/,'').replace(/[^a-z0-9-]+/gi,'-');
}

test('luxury visual QA across every public and operational page',async({page})=>{
  const hard=[];
  const warnings=[];
  const records=[];

  for(const vp of viewports){
    await page.setViewportSize({width:vp.width,height:vp.height});
    const shotDir=path.join(outDir,'screenshots',vp.name);
    fs.mkdirSync(shotDir,{recursive:true});

    for(const route of routes){
      const response=await page.goto(route,{waitUntil:'domcontentloaded'});
      await page.addStyleTag({content:'*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;caret-color:transparent!important}'});
      await page.evaluate(async()=>{
        document.querySelectorAll('video').forEach((video)=>{ video.pause(); try{ video.currentTime=0; }catch{} });
        document.querySelectorAll('img').forEach((img)=>{ img.loading='eager'; });
        if(document.fonts?.ready) await document.fonts.ready;
        await Promise.all([...document.images].map(async(img)=>{
          if(!img.complete){
            await new Promise((resolve)=>{
              img.addEventListener('load',resolve,{once:true});
              img.addEventListener('error',resolve,{once:true});
            });
          }
          if(img.decode){ try{ await img.decode(); }catch{} }
        }));
        window.scrollTo(0,0);
      });
      await page.waitForTimeout(120);

      const audit=await page.evaluate(({mobile,width})=>{
        const visible=(el)=>{
          const s=getComputedStyle(el);
          const r=el.getBoundingClientRect();
          return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.width>0&&r.height>0;
        };
        const failures=[];
        const warns=[];
        const doc=document.documentElement;
        const body=document.body;
        const overflow=Math.max(doc.scrollWidth,body.scrollWidth)-doc.clientWidth;
        if(overflow>1) failures.push('horizontal overflow '+overflow+'px');

        const broken=[...document.images]
          .filter((img)=>visible(img)&&img.complete&&img.naturalWidth===0)
          .map((img)=>img.getAttribute('src')||'(unknown)');
        if(broken.length) failures.push('broken images: '+broken.join(', '));

        const logos=[...document.querySelectorAll('.brand-lockup img,.footer-brand img,.brand-panel img,.error-brand-lockup,.packet-cover img,.packet-lock img,.qd-brand img')].filter(visible);
        for(const logo of logos){
          const src=logo.getAttribute('src')||'';
          if(!src.includes('wild-ones-horizontal-transparent.svg')) failures.push('unapproved visible logo source: '+src);
          const s=getComputedStyle(logo);
          const r=logo.getBoundingClientRect();
          if(s.backgroundColor!=='rgba(0, 0, 0, 0)'&&s.backgroundColor!=='transparent') failures.push('logo has rendered background '+s.backgroundColor);
          const borders=[s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth].map(parseFloat);
          if(borders.some((v)=>v>.1)) failures.push('logo has visible CSS border');
          if(s.objectFit!=='contain') failures.push('logo object-fit is not contain: '+s.objectFit);
          if(!logo.naturalWidth||!logo.naturalHeight) failures.push('logo has no intrinsic dimensions: '+src);
          else {
            const naturalRatio=logo.naturalWidth/logo.naturalHeight;
            const renderedRatio=r.width/r.height;
            const ratioError=Math.abs(renderedRatio/naturalRatio-1);
            if(ratioError>.015) failures.push('logo aspect ratio distorted by '+(ratioError*100).toFixed(2)+'%: '+src);
          }
          let ancestor=logo.parentElement;
          while(ancestor&&ancestor!==document.body){
            const aStyle=getComputedStyle(ancestor);
            if(['hidden','clip'].includes(aStyle.overflow)||['hidden','clip'].includes(aStyle.overflowX)||['hidden','clip'].includes(aStyle.overflowY)){
              const ar=ancestor.getBoundingClientRect();
              if(r.left<ar.left-1||r.right>ar.right+1||r.top<ar.top-1||r.bottom>ar.bottom+1){
                failures.push('logo clipped by ancestor: '+(ancestor.className||ancestor.tagName));
                break;
              }
            }
            ancestor=ancestor.parentElement;
          }
        }

        const headerLogo=document.querySelector('.brand-lockup img');
        if(headerLogo&&visible(headerLogo)){
          const r=headerLogo.getBoundingClientRect();
          const header=document.querySelector('.site-header')?.getBoundingClientRect();
          const navbar=document.querySelector('.navbar')?.getBoundingClientRect();
          const minWidth=width>=1200?240:width>=1000?215:width>700?205:width>430?175:width>340?165:145;
          if(r.width<minWidth) failures.push('navbar logo undersized: '+Math.round(r.width)+'px < '+minWidth+'px');
          if(r.left<-1||r.right>width+1) failures.push('navbar logo exceeds viewport');
          if(header&&(r.top<header.top-1||r.bottom>header.bottom+1)) failures.push('navbar logo clipped by header');
          if(navbar){
            const centerDelta=Math.abs((r.top+r.height/2)-(navbar.top+navbar.height/2));
            if(centerDelta>2) failures.push('navbar logo vertically misaligned by '+centerDelta.toFixed(1)+'px');
          }
        }

        const interactive=[...document.querySelectorAll('a,button,input,select,textarea,summary')].filter(visible);
        for(const el of interactive){
          const r=el.getBoundingClientRect();
          if(r.left<-1||r.right>width+1){
            failures.push('interactive element off viewport: '+(el.textContent||el.getAttribute('aria-label')||el.tagName).trim().slice(0,70));
          }
        }

        if(mobile){
          const targets=[...document.querySelectorAll('button,.btn,summary,input:not([type="checkbox"]):not([type="radio"]),select,textarea')].filter(visible);
          for(const el of targets){
            const r=el.getBoundingClientRect();
            if(r.height<42){
              failures.push('tap target under 42px: '+(el.textContent||el.getAttribute('aria-label')||el.tagName).trim().slice(0,60)+' ('+Math.round(r.height)+'px)');
            }
          }
          for(const el of document.querySelectorAll('input,select,textarea')){
            if(!visible(el)) continue;
            const size=parseFloat(getComputedStyle(el).fontSize);
            if(size<16) failures.push('mobile form font below 16px: '+size+'px');
          }
        }

        const clips=[...document.querySelectorAll('h1,h2,h3,.btn,summary,.nav-links a')]
          .filter(visible)
          .filter((el)=>el.scrollWidth>el.clientWidth+2);
        for(const el of clips) failures.push('text clipping: '+(el.textContent||'').trim().slice(0,70));

        const bodySize=parseFloat(getComputedStyle(document.body).fontSize);
        if(bodySize<14) failures.push('body font below 14px');

        const toggle=document.querySelector('[data-menu-toggle]');
        const nav=document.querySelector('[data-nav-links]');
        if(toggle&&nav){
          const toggleVisible=visible(toggle);
          const navVisible=visible(nav);
          if(width<=1000&&(!toggleVisible||navVisible)) failures.push('mobile navigation initial state incorrect');
          if(width>1000&&(toggleVisible||!navVisible)) failures.push('desktop navigation initial state incorrect');
        }

        for(const h of [...document.querySelectorAll('h1,h2')].filter(visible)){
          const r=h.getBoundingClientRect();
          if(r.width>width+1) failures.push('heading exceeds viewport: '+h.textContent.trim().slice(0,60));
          const lh=parseFloat(getComputedStyle(h).lineHeight);
          const fs=parseFloat(getComputedStyle(h).fontSize);
          if(Number.isFinite(lh)&&Number.isFinite(fs)&&lh/fs<.85) warns.push('tight heading line-height: '+h.textContent.trim().slice(0,50));
        }

        return {failures,warns,overflow,logos:logos.length,interactive:interactive.length};
      },{mobile:vp.mobile,width:vp.width});

      for(const issue of audit.failures) hard.push(vp.name+' '+route+' | '+issue);
      for(const issue of audit.warns) warnings.push(vp.name+' '+route+' | '+issue);
      records.push({viewport:vp.name,route,status:response?.status()||0,...audit});

      await page.screenshot({path:path.join(shotDir,slug(route)+'.png'),fullPage:true,animations:'disabled'});
    }
  }

  const report={generatedAt:new Date().toISOString(),viewports,routes,hardFailures:hard,warnings,records};
  fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(report,null,2));

  const md=[
    '# Wild Ones Visual QA Report','',
    'Viewports: '+viewports.map((v)=>v.name).join(', '),
    'Routes: '+routes.length,
    'Screenshots: '+(viewports.length*routes.length),
    'Hard failures: '+hard.length,
    'Warnings: '+warnings.length,'',
    '## Hard failures',
    ...(hard.length?hard.map((x)=>'- '+x):['- None']),'',
    '## Warnings',
    ...(warnings.length?warnings.map((x)=>'- '+x):['- None'])
  ].join('\n');
  fs.writeFileSync(path.join(outDir,'report.md'),md);

  expect(hard,'Visual QA hard failures:\n'+hard.join('\n')).toEqual([]);
});
