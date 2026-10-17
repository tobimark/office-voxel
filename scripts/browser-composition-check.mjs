import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport:{width:640,height:480},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});
try {
  await page.route('**/__composition__',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>World composition contracts</title>'}));
  await page.goto(new URL('__composition__',process.env.DEMO_URL||'http://127.0.0.1:5196/').href);
  const result=await page.evaluate(async()=>{
    const {layouts}=await import('/src/layouts/registry.js');
    const {assembleOffice}=await import('/src/world/assemble-office.js');
    const {createScene}=await import('/src/engine/scene.js');
    const {acquireArtResources,group}=await import('/src/assets/materials/art.js');
    const {disposeSceneResources}=await import('/src/engine/resources.js');
    const release=acquireArtResources();let aligned=0, reordered=false;
    try {
      for(const preset of Object.values(layouts)) {
        const layout=structuredClone(preset);
        layout.seats=layout.seats.map(seat=>({...seat,x:seat.x+.37,z:seat.z+.23,yaw:seat.yaw+Math.PI/2}));
        layout.furniture.reverse();
        const root=group({add(){}});
        try {
          const built=assembleOffice(root,layout);
          for(const instance of built.instances) {
            const screen=instance.screens[0];root.updateMatrixWorld(true);
            const actual=screen.getWorldPosition(screen.position.clone()), expected=instance.anchors.monitor;
            if(Math.hypot(actual.x-expected.x,actual.y-expected.y,actual.z-expected.z)>1e-8)throw Error(`Drifting screen mount: ${layout.id}/${instance.id}`);
            const entry=built.displays.find(e=>e.mesh===screen);
            if(entry.stationId!==`${layout.id}:station:${instance.stationIndex}`)throw Error('Reordered display binding');
            aligned++;
          }
          reordered=true;
        } finally {disposeSceneResources(root);}
      }
    }finally{release();}
    // A sixth office reuses existing assets with no environment-renderer copy.
    const custom=structuredClone(layouts.studio);
    custom.id='custom';custom.capacity=2;custom.environment={assetId:'empty'};
    custom.actors=custom.actors.slice(0,2).map((actor,i)=>({...actor,instanceId:`custom:actor:${i}`}));
    custom.seats=custom.seats.slice(0,2);custom.stations=custom.stations.slice(0,2);
    custom.stationFor=[1,0];custom.furniture=custom.furniture.slice(0,2);
    const viewport=document.createElement('div');viewport.style.cssText='width:320px;height:240px';document.body.append(viewport);
    const api=createScene({viewport,layout:custom,createOffice:assembleOffice});
    const mounted=api.getState().capacity===2&&viewport.querySelectorAll('canvas').length===1;
    api.select(1);api.action('wave');const interactive=api.getState().actors[1].action==='wave';
    api.dispose();api.dispose();
    return {aligned,reordered,mounted,interactive,disposed:!viewport.children.length};
  });
  assert.equal(result.aligned,54);
  for(const key of ['reordered','mounted','interactive','disposed'])assert.equal(result[key],true,key);
  assert.deepEqual(errors,[]);
  console.log('54 moved/rotated workstations preserve rendered mounts and reordered bindings; a sixth two-person composition mounts, interacts and disposes without a new builder');
}finally{await browser.close();}
