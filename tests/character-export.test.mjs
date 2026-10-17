import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { exportCharacterAssets } from '../scripts/lib/character-export.mjs';
const assets=new URL('../public/assets/characters/studio-00/',import.meta.url);
const roster=[{id:'studio-00',name:'test',look:{shirt:'orange'},usedBy:['studio-00']}];
const readme=()=> 'test export';
async function fixture(t) {
 const parent=fileURLToPath(new URL('../.artifacts/',import.meta.url));
 await fs.mkdir(parent,{recursive:true});
 const root=await fs.mkdtemp(path.join(parent,'voxel-export-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const outRoot=path.join(root,'characters');
 const produce=async()=>Object.fromEntries(await Promise.all(['portrait','sheet','model'].map(async k=>[k,await fs.readFile(new URL(k==='model'?'model.glb':`${k}.png`,assets))])));
 return {outRoot,roster,produce,readme};
}
test('failed generation and invalid buffers leave the previous complete export untouched',async t=>{
 const options=await fixture(t); await exportCharacterAssets(options);
 const old=await fs.readFile(path.join(options.outRoot,'manifest.json'),'utf8');
 await assert.rejects(exportCharacterAssets({...options,produce:async()=>{throw Error('capture failed');}}),/capture failed/);
 await assert.rejects(exportCharacterAssets({...options,produce:async()=>({portrait:Buffer.from('bad')})}),/Invalid portrait/);
 assert.equal(await fs.readFile(path.join(options.outRoot,'manifest.json'),'utf8'),old);
 assert.deepEqual((await fs.readdir(path.dirname(options.outRoot))).sort(),['characters']);
});
test('partial kinds preserve all unselected files and manifest records',async t=>{
 const options=await fixture(t), before=await exportCharacterAssets(options);
 const old=await fs.readFile(path.join(options.outRoot,'studio-00','model.glb'));
 const after=await exportCharacterAssets({...options,kinds:['portrait']});
 assert.deepEqual(after.characters[0].files.model,before.characters[0].files.model);
 assert.deepEqual(await fs.readFile(path.join(options.outRoot,'studio-00','model.glb')),old);
 assert.equal(after.counts.files,3);
 await assert.rejects(exportCharacterAssets({...options,kinds:['portrait'],roster:[{...roster[0],look:{shirt:'blue'}}]}),/Changed look/);
});
test('failed publication rolls back the old directory',async t=>{
 const options=await fixture(t); await exportCharacterAssets(options);
 const before=await fs.readFile(path.join(options.outRoot,'manifest.json'),'utf8');let calls=0;
 await assert.rejects(exportCharacterAssets({...options,rename:async(a,b)=>{if(++calls===2)throw Error('rename failed'); await fs.rename(a,b);}}),/rename failed/);
 assert.equal(calls,3); assert.equal(await fs.readFile(path.join(options.outRoot,'manifest.json'),'utf8'),before);
 assert.deepEqual(await fs.readdir(path.dirname(options.outRoot)),['characters']);
});
test('partial export requires a previous set and rejects damaged retained assets',async t=>{
 const options=await fixture(t);
 await assert.rejects(exportCharacterAssets({...options,kinds:['sheet']}),/full export first/);
 await exportCharacterAssets(options);
 await fs.writeFile(path.join(options.outRoot,'studio-00','model.glb'),'corrupt');
 await assert.rejects(exportCharacterAssets({...options,kinds:['portrait']}),/Invalid GLB/);
});
test('an existing writer lock refuses concurrent publication',async t=>{
 const options=await fixture(t); await fs.mkdir(`${options.outRoot}.lock`);
 await assert.rejects(exportCharacterAssets(options),{code:'EEXIST'});
 assert.deepEqual(await fs.readdir(path.dirname(options.outRoot)),['characters.lock']);
});

test('partial IDs regenerate only selected characters and retain all other artifacts',async t=>{
 const options=await fixture(t);
 options.roster=[...roster,{...roster[0],id:'team-00'}];
 const before=await exportCharacterAssets(options);const calls=[];
 const after=await exportCharacterAssets({...options,ids:['team-00'],produce:async(entry,kinds)=>{calls.push(entry.id);return options.produce(entry,kinds);}});
 assert.deepEqual(calls,['team-00']);
 assert.deepEqual(after.characters[0],before.characters[0]);assert.equal(after.counts.files,6);
});
test('rollback failure preserves the previous export in a recoverable backup',async t=>{
 const options=await fixture(t);await exportCharacterAssets(options);let calls=0;
 await assert.rejects(exportCharacterAssets({...options,rename:async(a,b)=>{if(++calls>1)throw Error('filesystem unavailable');await fs.rename(a,b);}}),/previous export remains/);
 const remaining=await fs.readdir(path.dirname(options.outRoot));
 assert.equal(remaining.length,1);assert.match(remaining[0],/-previous$/);
 const previous=JSON.parse(await fs.readFile(path.join(path.dirname(options.outRoot),remaining[0],'manifest.json'),'utf8'));
 assert.equal(previous.counts.files,3);
});
test('truncated PNG data with a valid header never replaces the published set',async t=>{
 const options=await fixture(t);await exportCharacterAssets(options);
 const buffers=await options.produce();const old=await fs.readFile(path.join(options.outRoot,'manifest.json'),'utf8');
 await assert.rejects(exportCharacterAssets({...options,produce:async()=>({...buffers,portrait:buffers.portrait.subarray(0,33)})}),/Incomplete/);
 assert.equal(await fs.readFile(path.join(options.outRoot,'manifest.json'),'utf8'),old);
});
