import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:640,height:480},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});
try {
 await page.route('**/__asset-check__',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Asset contract check</title>'}));
 await page.goto(new URL('__asset-check__',process.env.DEMO_URL||'http://127.0.0.1:5196/').href);
 const prefix='/src';
 const snapshots=await page.evaluate(async prefix=>{
  const art=await import(`${prefix}/assets/materials/art.js`), release=art.acquireArtResources?.();
  const { layouts } = await import(`${prefix}/layouts/registry.js`);
  const { assembleOffice } = await import(`${prefix}/world/assemble-office.js`);
  const results=[], materials=new Map();
  const rounded=n=>Math.round(n*1e6)/1e6;
  for(const [id,layout] of Object.entries(layouts)){
   const scene=art.group({add(){}});
   assembleOffice(scene,layout);scene.updateMatrixWorld(true);
   const records=[];
   const signature=material=>{
    if(materials.has(material))return materials.get(material);
    const canvas=material.map?.image;let pixels='';
    if(canvas?.getContext){let h=2166136261;for(const byte of canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data){h=Math.imul(h^byte,16777619);}pixels=`${canvas.width}x${canvas.height}:${h>>>0}`;}
    const value=[material.type,material.color?.getHexString(),material.roughness,material.opacity,material.transparent,material.side,pixels];materials.set(material,value);return value;
   };
   scene.traverse(mesh=>{
    if(!mesh.isMesh)return;
    mesh.geometry.computeBoundingBox();const bounds=mesh.geometry.boundingBox;
    const shape=[mesh.geometry.type,...bounds.min.toArray().map(rounded),...bounds.max.toArray().map(rounded)];
    const mat=signature(mesh.material);
    for(let i=0;i<(mesh.isInstancedMesh?mesh.count:1);i++){
     const matrix=mesh.matrixWorld.clone().identity();
     if(mesh.isInstancedMesh){mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);}else matrix.copy(mesh.matrixWorld);
     records.push(JSON.stringify([shape,matrix.elements.map(rounded),mat]));
    }
   });
   records.sort();results.push({id,count:records.length,records:records.join('\n')});
  }
  release?.();return results;
 },prefix);
 const fixture=snapshots.map(({records,...entry})=>({...entry,sha256:createHash('sha256').update(records).digest('hex')}));
 assert.deepEqual(fixture,JSON.parse(await readFile(new URL('../tests/fixtures/furniture-baseline.json',import.meta.url),'utf8')),'Furniture geometry, placement, colors and canvas pixels must preserve the migration baseline');
 console.log(fixture.map(e=>`${e.id}: ${e.count} mesh instances match baseline`).join('\n'));
 assert.deepEqual(errors,[]);
} finally {await browser.close();}
