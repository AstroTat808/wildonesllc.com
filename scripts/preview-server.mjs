import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('dist');
const argIndex=process.argv.indexOf('--port');
const port=Number(argIndex>=0?process.argv[argIndex+1]:8080)||8080;
const mime={
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8',
  '.svg':'image/svg+xml',
  '.xml':'application/xml; charset=utf-8',
  '.txt':'text/plain; charset=utf-8',
  '.webp':'image/webp',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.json':'application/json; charset=utf-8'
};

function safeFile(urlPath){
  const decoded=decodeURIComponent(urlPath.split('?')[0]);
  const clean=decoded.replace(/^\/+/, '');
  if(clean.includes('..')) return null;
  const candidates=[];
  if(!clean) candidates.push('index.html');
  else{
    candidates.push(clean);
    if(!path.extname(clean)) candidates.push(clean+'.html',path.join(clean,'index.html'));
  }
  for(const candidate of candidates){
    const full=path.resolve(root,candidate);
    if(full.startsWith(root)&&fs.existsSync(full)&&fs.statSync(full).isFile()) return full;
  }
  return null;
}

const server=http.createServer((req,res)=>{
  const url=new URL(req.url||'/', 'http://localhost');
  if(url.pathname==='/api/public-config'){
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    res.end(JSON.stringify({turnstileSiteKey:''}));
    return;
  }
  if(url.pathname==='/api/inquiry'){
    res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    res.end(JSON.stringify({error:'Local static preview only. Secure form submission activates in Netlify Dev or the deployed Netlify environment.'}));
    return;
  }
  const file=safeFile(url.pathname);
  if(!file){
    const notFound=path.join(root,'404.html');
    res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});
    res.end(fs.existsSync(notFound)?fs.readFileSync(notFound):'Not found');
    return;
  }
  const type=mime[path.extname(file).toLowerCase()]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
});

server.listen(port,'127.0.0.1',()=>{
  console.log('Wild Ones preview: http://127.0.0.1:'+port);
  console.log('Static preview mode: Netlify-only form submission and private-access enforcement are disabled.');
});
