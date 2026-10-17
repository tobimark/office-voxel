import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:640,height:480},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});
try {
 await page.route('**/__resources__',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Scene resource lifecycle</title>'}));
 await page.goto(new URL('__resources__',process.env.DEMO_URL||'http://127.0.0.1:5196/').href);
 const result=await page.evaluate(async()=>{
  const {createScene}=await import('/src/shared/scene.js');
  const {createOffice}=await import('/src/office.js');
  const {smallOffice:layout}=await import('/src/layouts.js');
  const view=()=>{const el=document.createElement('div');el.style.cssText='width:240px;height:160px';document.body.append(el);return el;};
  const aView=view(),bView=view();let sharedGeometry,sharedMaterial,sharedTexture,privateCount=0,geometryCount=0,materialCount=0,textureCount=0;
  const a=createScene({viewport:aView,layout,createOffice(scene,data){
   const built=createOffice(scene,data);
   const batch=built.office.children.find(o=>o.isInstancedMesh);
   sharedGeometry=batch.geometry;sharedMaterial=batch.material;sharedTexture=batch.material.map;
   sharedGeometry.addEventListener('dispose',()=>geometryCount++);
   sharedMaterial.addEventListener('dispose',()=>materialCount++);
   sharedTexture.addEventListener('dispose',()=>textureCount++);
   built.displays[0].mesh.geometry.addEventListener('dispose',()=>privateCount++);
   return built;
  }});
  let same=false;
  const b=createScene({viewport:bView,layout,createOffice(scene,data){const built=createOffice(scene,data);same=built.office.children.some(o=>o.isInstancedMesh&&o.geometry===sharedGeometry&&o.material===sharedMaterial);return built;}});
  const identities=a.getState().actors.every((actor,index)=>actor.instanceId===layout.actors[index].instanceId&&actor.characterId===layout.actors[index].characterId&&actor.appearanceId===layout.actors[index].appearanceId);
  a.dispose();a.dispose();
  const survivor=same&&privateCount===1&&geometryCount===0&&materialCount===0&&textureCount===0&&!b.disposed;
  let failed=false,failedPrivate=0;
  try{createScene({viewport:aView,layout,createOffice(scene,data){const built=createOffice(scene,data);built.displays[0].mesh.geometry.addEventListener('dispose',()=>failedPrivate++);throw Error('expected');}});}catch(e){failed=e.message==='expected';}
  const failureIsolated=failed&&failedPrivate===1&&geometryCount===0&&aView.children.length===0;
  b.camera('top');
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const bHealthy=b.getState().camera==='top'&&bView.querySelectorAll('canvas').length===1;
  b.dispose();b.dispose();
  const lastReleased=geometryCount===1&&materialCount===1&&textureCount===1;
  let fresh=false;
  const c=createScene({viewport:aView,layout,createOffice(scene,data){const built=createOffice(scene,data);fresh=built.office.children.every(o=>!o.isInstancedMesh||o.geometry!==sharedGeometry);return built;}});
  c.dispose();return {identities,survivor,failureIsolated,bHealthy,lastReleased,fresh,empty:!aView.children.length&&!bView.children.length};
 });
 for(const [key,value] of Object.entries(result))assert.equal(value,true,key);
 assert.deepEqual(errors,[]);
 console.log('Two live WebGL scenes: shared-resource survival, failed sibling initialization, last-owner cleanup and remount passed');
}finally{await browser.close();}
