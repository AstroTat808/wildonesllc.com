import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const roots=['netlify/functions','netlify/edge-functions'];
const files=[];
for(const root of roots){
  if(!fs.existsSync(root)) continue;
  for(const name of fs.readdirSync(root,{recursive:true})){
    const file=path.join(root,String(name));
    if(fs.statSync(file).isFile() && /\.(mts|ts)$/.test(file)) files.push(file);
  }
}
for(const file of files){
  try{
    await import(pathToFileURL(path.resolve(file)).href+'?qa='+Date.now());
    console.log('PASS | '+file);
  }catch(error){
    console.error('FAIL | '+file);
    console.error(error);
    process.exitCode=1;
  }
}
if(process.exitCode) process.exit(process.exitCode);
console.log('Imported '+files.length+' Netlify function/edge modules.');
