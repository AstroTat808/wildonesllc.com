import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const routes=[
  '/', '/about.html', '/site-map.html', '/production.html', '/events.html',
  '/case-studies.html', '/past-events.html', '/bass-babes-recruitment-2022.html',
  '/groove-cruise-2022.html', '/wild-ones-takes-flight-2022.html',
  '/nocturne-2026.html', '/gallery.html', '/faq.html',
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

        const approvedLogoNames=['wild-ones-horizontal-transparent.svg','wild-ones-stacked-approved.svg','wild-ones-emblem-approved.svg'];
        const selectedLogoName=(logo)=>{
          const src=logo.currentSrc||logo.getAttribute('src')||'';
          return approvedLogoNames.find((name)=>src.includes(name))||'';
        };
        const logos=[...document.querySelectorAll('.brand-lockup img,.footer-brand img,.brand-panel img,.error-brand-lockup,.packet-cover img,.packet-lock img,.qd-brand img')].filter(visible);
        for(const logo of logos){
          const selected=selectedLogoName(logo);
          const src=logo.currentSrc||logo.getAttribute('src')||'';
          if(!selected) failures.push('unapproved visible logo source: '+src);
          const s=getComputedStyle(logo);
          const r=logo.getBoundingClientRect();
          if(s.backgroundColor!=='rgba(0, 0, 0, 0)'&&s.backgroundColor!=='transparent') failures.push('logo has rendered background '+s.backgroundColor);
          const borders=[s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth].map(parseFloat);
          if(borders.some((v)=>v>.1)) failures.push('logo has visible CSS border');
          if(s.objectFit!=='contain') failures.push('logo object-fit is not contain: '+s.objectFit);
          if(!logo.naturalWidth||!logo.naturalHeight) failures.push('logo has no intrinsic dimensions: '+src);
          if(parseFloat(s.width)<=0||parseFloat(s.height)<=0) failures.push('logo has invalid rendered dimensions: '+src);

          if(logo.closest('.brand-lockup')){
            const expected=width<=340?'wild-ones-emblem-approved.svg':'wild-ones-horizontal-transparent.svg';
            if(selected!==expected) failures.push('navbar selected wrong responsive logo: '+selected+' expected '+expected);
          }
          if(logo.closest('.footer-brand')){
            const expected=width<=700?'wild-ones-stacked-approved.svg':'wild-ones-horizontal-transparent.svg';
            if(selected!==expected) failures.push('footer selected wrong responsive logo: '+selected+' expected '+expected);
          }
          if(logo.closest('.brand-panel')&&selected!=='wild-ones-stacked-approved.svg') failures.push('brand panel must use stacked logo');
          if(logo.closest('.packet-cover')&&selected!=='wild-ones-stacked-approved.svg') failures.push('packet cover must use stacked logo');
          if(logo.classList.contains('error-brand-lockup')&&selected!=='wild-ones-emblem-approved.svg') failures.push('404 must use emblem');
          if(logo.closest('.qd-brand')){
            const expected=width<=360?'wild-ones-emblem-approved.svg':'wild-ones-horizontal-transparent.svg';
            if(selected!==expected) failures.push('quality dashboard selected wrong responsive logo: '+selected+' expected '+expected);
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

        let headerLogoMetrics=null;
        const headerLogo=document.querySelector('.brand-lockup img');
        if(headerLogo&&visible(headerLogo)){
          const r=headerLogo.getBoundingClientRect();
          const header=document.querySelector('.site-header')?.getBoundingClientRect();
          const navbar=document.querySelector('.navbar')?.getBoundingClientRect();
          const minWidth=width>=1200?240:width>=1000?215:width>700?205:width>430?175:width>340?165:52;
          if(r.width<minWidth) failures.push('navbar logo undersized: '+Math.round(r.width)+'px < '+minWidth+'px');
          if(r.left<-1||r.right>width+1) failures.push('navbar logo exceeds viewport');
          if(header&&(r.top<header.top-1||r.bottom>header.bottom+1)) failures.push('navbar logo clipped by header');
          let centerDelta=null;
          if(navbar){
            centerDelta=Math.abs((r.top+r.height/2)-(navbar.top+navbar.height/2));
            if(centerDelta>2) failures.push('navbar logo vertically misaligned by '+centerDelta.toFixed(1)+'px');
          }
          headerLogoMetrics={width:Number(r.width.toFixed(1)),height:Number(r.height.toFixed(1)),centerDelta:centerDelta===null?null:Number(centerDelta.toFixed(1)),src:headerLogo.currentSrc||headerLogo.getAttribute('src')||''};
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

        return {failures,warns,overflow,logos:logos.length,interactive:interactive.length,headerLogo:headerLogoMetrics};
      },{mobile:vp.mobile,width:vp.width});

      for(const issue of audit.failures) hard.push(vp.name+' '+route+' | '+issue);
      for(const issue of audit.warns) warnings.push(vp.name+' '+route+' | '+issue);
      records.push({viewport:vp.name,route,status:response?.status()||0,...audit});
      if(route==='/'&&audit.headerLogo) console.log('BRAND_QA '+vp.name+' '+JSON.stringify(audit.headerLogo));

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


const brandSweepViewports=[
  {name:'brand-1920',width:1920,height:1080},
  {name:'brand-1440',width:1440,height:1000},
  {name:'brand-1280',width:1280,height:900},
  {name:'brand-1024',width:1024,height:900},
  {name:'brand-768',width:768,height:900},
  {name:'brand-430',width:430,height:932},
  {name:'brand-390',width:390,height:844},
  {name:'brand-320',width:320,height:800}
];

const brandSweepRoutes=['/','/about.html','/technical-packet.html','/quality-dashboard.html','/404.html'];

test('brand-system responsive sweep · 320 through 1920',async({page})=>{
  const failures=[];
  const records=[];
  const shotDir=path.join(outDir,'brand-sweep');
  fs.mkdirSync(shotDir,{recursive:true});

  for(const vp of brandSweepViewports){
    await page.setViewportSize({width:vp.width,height:vp.height});

    for(const route of brandSweepRoutes){
      const response=await page.goto(route,{waitUntil:'domcontentloaded'});
      await page.addStyleTag({content:'*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important}'});
      await page.evaluate(async()=>{
        if(document.fonts?.ready) await document.fonts.ready;
        await Promise.all([...document.images].map(async(img)=>{if(img.decode){try{await img.decode();}catch{}}}));
        window.scrollTo(0,0);
      });

      const audit=await page.evaluate(({width,route})=>{
        const issues=[];
        const visible=(el)=>{
          if(!el) return false;
          const s=getComputedStyle(el);
          const r=el.getBoundingClientRect();
          return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.width>0&&r.height>0;
        };
        const selected=(img)=>img?(img.currentSrc||img.getAttribute('src')||''):'';
        const expectSrc=(selector,name,label)=>{
          const img=document.querySelector(selector);
          if(!visible(img)) return null;
          const src=selected(img);
          if(!src.includes(name)) issues.push(label+' selected '+src+' instead of '+name);
          return img;
        };
        const horizontal='wild-ones-horizontal-transparent.svg';
        const stacked='wild-ones-stacked-approved.svg';
        const emblem='wild-ones-emblem-approved.svg';

        const navExpected=width<=340?emblem:horizontal;
        const footerExpected=width<=700?stacked:horizontal;
        const qdExpected=width<=360?emblem:horizontal;

        const nav=expectSrc('.brand-lockup img',navExpected,'navbar');
        const footer=expectSrc('.footer-brand img',footerExpected,'footer');
        const panel=expectSrc('.brand-panel img',stacked,'brand panel');
        const packet=expectSrc('.packet-cover img',stacked,'packet cover');
        const qd=expectSrc('.qd-brand img',qdExpected,'quality dashboard');
        const error=expectSrc('.error-brand-lockup',emblem,'404');

        for(const img of [nav,footer,panel,packet,qd,error].filter(Boolean)){
          const r=img.getBoundingClientRect();
          const style=getComputedStyle(img);
          if(r.left<-1||r.right>width+1) issues.push('logo exceeds viewport on '+route);
          if(!img.naturalWidth||!img.naturalHeight) issues.push('logo failed to decode on '+route);
          if(style.objectFit!=='contain') issues.push('logo object-fit is '+style.objectFit+' on '+route);
          let ancestor=img.parentElement;
          while(ancestor&&ancestor!==document.body){
            const a=getComputedStyle(ancestor);
            if(['hidden','clip'].includes(a.overflow)||['hidden','clip'].includes(a.overflowX)||['hidden','clip'].includes(a.overflowY)){
              const ar=ancestor.getBoundingClientRect();
              if(r.left<ar.left-1||r.right>ar.right+1||r.top<ar.top-1||r.bottom>ar.bottom+1){
                issues.push('logo clipped by '+(ancestor.className||ancestor.tagName)+' on '+route);
                break;
              }
            }
            ancestor=ancestor.parentElement;
          }
        }

        if(nav){
          const w=nav.getBoundingClientRect().width;
          let min=52,max=60;
          if(width>=1440){min=240;max=255;}
          else if(width>=1200){min=220;max=245;}
          else if(width>1000){min=215;max=230;}
          else if(width>700){min=205;max=215;}
          else if(width>430){min=175;max=185;}
          else if(width>340){min=165;max=175;}
          if(w<min-1||w>max+1) issues.push('navbar logo width '+w.toFixed(1)+'px outside '+min+'-'+max+'px at '+width);
          const bar=document.querySelector('.navbar')?.getBoundingClientRect();
          if(bar){
            const r=nav.getBoundingClientRect();
            const delta=Math.abs((r.top+r.height/2)-(bar.top+bar.height/2));
            if(delta>2) issues.push('navbar logo vertical offset '+delta.toFixed(1)+'px at '+width);
          }
        }

        if(footer){
          const w=footer.getBoundingClientRect().width;
          let min=220,max=365;
          if(width<=340){min=155;max=165;}
          else if(width<=430){min=170;max=180;}
          else if(width<=700){min=185;max=195;}
          if(w<min-1||w>max+1) issues.push('footer logo width '+w.toFixed(1)+'px outside '+min+'-'+max+'px at '+width);
        }
        if(panel&&panel.getBoundingClientRect().width>262) issues.push('brand-panel stacked logo oversized');
        if(packet&&packet.getBoundingClientRect().width>252) issues.push('packet-cover stacked logo oversized');
        if(error&&error.getBoundingClientRect().width>162) issues.push('404 emblem oversized');

        const overflow=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-document.documentElement.clientWidth;
        if(overflow>1) issues.push('horizontal overflow '+overflow+'px on '+route);

        return {
          issues,
          nav:nav?{src:selected(nav),width:Number(nav.getBoundingClientRect().width.toFixed(1)),height:Number(nav.getBoundingClientRect().height.toFixed(1))}:null,
          footer:footer?{src:selected(footer),width:Number(footer.getBoundingClientRect().width.toFixed(1)),height:Number(footer.getBoundingClientRect().height.toFixed(1))}:null
        };
      },{width:vp.width,route});

      for(const issue of audit.issues) failures.push(vp.name+' '+route+' | '+issue);
      records.push({viewport:vp.name,route,status:response?.status()||0,...audit});

      if(route==='/'){
        await page.screenshot({path:path.join(shotDir,vp.name+'.png'),fullPage:true,animations:'disabled'});
      }
    }
  }

  fs.writeFileSync(path.join(outDir,'brand-system.json'),JSON.stringify({
    generatedAt:new Date().toISOString(),
    viewports:brandSweepViewports,
    routes:brandSweepRoutes,
    failures,
    records
  },null,2));

  expect(failures,'Brand-system failures:\n'+failures.join('\n')).toEqual([]);
});
