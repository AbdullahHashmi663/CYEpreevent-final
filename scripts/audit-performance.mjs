import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import sharp from "sharp";
const origin=process.env.PERFORMANCE_ORIGIN||"https://cyepreeventbuic.com";
const results=[];
for(const path of ['/','/conferences','/team-about','/competitions','/contact','/venue']){
 const runs=[];let html='';
 for(let i=0;i<3;i++){
  const start=performance.now();const r=await fetch(origin+path);const ttfb=performance.now()-start;html=await r.text();
  assert.equal(r.status,200,path);
  runs.push({ttfbMs:Math.round(ttfb),totalMs:Math.round(performance.now()-start),cache:r.headers.get('x-vercel-cache')||r.headers.get('x-nextjs-cache'),cacheControl:r.headers.get('cache-control')});
 }
 const images=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
 assert(images.every(i=>i.includes('width=')&&i.includes('height=')),path+' reserves image dimensions');
 const scripts=[...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]))];
 let jsBytes=0,gzipJsBytes=0;await Promise.all(scripts.map(async src=>{const r=await fetch(new URL(src.replaceAll('&amp;','&'),origin));assert.equal(r.status,200);const b=Buffer.from(await r.arrayBuffer());jsBytes+=b.length;gzipJsBytes+=gzipSync(b).length;}));
 const row={path,runs,htmlBytes:Buffer.byteLength(html),gzipHtmlBytes:gzipSync(html).length,jsBytes,gzipJsBytes,images:images.length,responsiveImages:images.filter(i=>i.includes('srcSet=')||i.includes('srcset=')).length};
 results.push(row);console.log(JSON.stringify(row));
}
const samples=[];
for(const [src,width,originalBytes] of [['/images/career-pro-workshop.png',768,2610186],['/images/yota-logo.png',256,1351413],['/api/media/8ec174c9-c9e0-46ea-b7f6-70539e187635',640,895034]]){
 const r=await fetch(origin+'/_next/image?url='+encodeURIComponent(src)+'&w='+width+'&q=75',{headers:{Accept:'image/webp'}});assert.equal(r.status,200);const bytes=Buffer.from(await r.arrayBuffer());const m=await sharp(bytes).metadata();assert.equal(m.format,'webp');assert(bytes.length<originalBytes/2);samples.push({src,width,originalBytes,optimizedBytes:bytes.length});
}
for(const url of ['/_next/image?url=%2Fapi%2Fadmin%2Fdata&w=640&q=75','/_next/image?url=https%3A%2F%2Fexample.com%2Fprivate.png&w=640&q=75']){assert.equal((await fetch(origin+url)).status,400);}
const privateData=await fetch(origin+'/api/admin/data');assert.equal(privateData.status,401);assert(privateData.headers.get('cache-control').includes('no-store'));
const registration=await fetch(origin+'/register?kind=conference');assert.equal(registration.status,200);assert(registration.headers.get('cache-control').includes('no-store'));
mkdirSync('test-results',{recursive:true});const file=process.env.PERFORMANCE_REPORT||'test-results/performance-after.json';writeFileSync(file,JSON.stringify({origin,pages:results,imageSamples:samples},null,2));
console.log('Passed: responsive images, measured page/bundle sizes, WebP savings, private/external image proxy rejection, and uncached private data/forms. Report: '+file);
