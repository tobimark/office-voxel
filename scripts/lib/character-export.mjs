import * as fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { publishDirectory } from './publish-directory.mjs';
import { readDistributionLicenses } from './distribution-licenses.mjs';

export const ASSET_KINDS = ['portrait', 'sheet', 'model'];
const fileName = kind => kind === 'model' ? 'model.glb' : `${kind}.png`;
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const crcTable = Array.from({length:256},(_,n)=>{
  for(let i=0;i<8;i++) n=(n&1) ? 0xedb88320^(n>>>1) : n>>>1;
  return n>>>0;
});
const crc32 = bytes => {
  let crc=0xffffffff;
  for(const byte of bytes) crc=crcTable[(crc^byte)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
};

export function validateAsset(kind, buffer) {
  if (!Buffer.isBuffer(buffer)) throw new Error(`Missing ${kind} buffer`);
  if (kind === 'model') {
    if (buffer.length < 28 || buffer.toString('ascii', 0, 4) !== 'glTF' || buffer.readUInt32LE(4) !== 2 || buffer.readUInt32LE(8) !== buffer.length) throw new Error('Invalid GLB header');
    const length = buffer.readUInt32LE(12);
    if (buffer.toString('ascii', 16, 20) !== 'JSON' || length + 28 > buffer.length) throw new Error('Invalid GLB JSON chunk');
    const json = JSON.parse(buffer.toString('utf8',20,20+length));
    if (json.asset?.version !== '2.0' || !json.meshes?.length || !json.images?.length) throw new Error('Incomplete GLB model');
    if (buffer.toString('ascii',24+length,28+length) !== 'BIN\0' || buffer.readUInt32LE(20+length) + 28 + length !== buffer.length) throw new Error('Invalid GLB binary chunk');
  } else {
    const png = Buffer.from([137,80,78,71,13,10,26,10]);
    const size = kind === 'portrait' ? [144,160] : [1024,1024];
    if (buffer.length < 33 || !buffer.subarray(0,8).equals(png) || buffer.toString('ascii',12,16) !== 'IHDR' || buffer.readUInt32BE(16) !== size[0] || buffer.readUInt32BE(20) !== size[1]) throw new Error(`Invalid ${kind} PNG`);
    const idat=[]; let offset=8, ended=false;
    while(offset+12<=buffer.length) {
      const length=buffer.readUInt32BE(offset), end=offset+12+length;
      if(end>buffer.length) throw new Error('Truncated PNG chunk');
      const type=buffer.toString('ascii',offset+4,offset+8);
      if(crc32(buffer.subarray(offset+4,end-4))!==buffer.readUInt32BE(end-4)) throw new Error('Invalid PNG checksum');
      if(type==='IDAT') idat.push(buffer.subarray(offset+8,end-4));
      offset=end;
      if(type==='IEND') { ended=length===0; break; }
    }
    const channels=buffer[25]===6?4:buffer[25]===2?3:0;
    if(!ended || offset!==buffer.length || !idat.length || buffer[24]!==8 || !channels || buffer[28]!==0) throw new Error('Incomplete or unsupported PNG');
    const expected=size[1]*(1+size[0]*channels);
    if(inflateSync(Buffer.concat(idat),{maxOutputLength:expected}).length!==expected) throw new Error('Invalid PNG image data');
  }
}

export async function validateManifest(root, manifest) {
  let files = 0, bytes = 0;
  const ids = new Set();
  for (const entry of manifest.characters) {
    if (!/^[a-z0-9]+-[a-z0-9-]+$/.test(entry.id) || ids.has(entry.id)) throw new Error('Invalid or duplicate asset ID');
    ids.add(entry.id);
    if (JSON.stringify(Object.keys(entry.files).sort()) !== JSON.stringify([...ASSET_KINDS].sort())) throw new Error('Incomplete asset set');
    for (const [kind, info] of Object.entries(entry.files)) {
      if (!ASSET_KINDS.includes(kind) || info.file !== fileName(kind)) throw new Error('Invalid asset path');
      const buffer = await fs.readFile(path.join(root,entry.id,info.file));
      validateAsset(kind,buffer);
      if (buffer.length !== info.bytes || sha256(buffer) !== info.sha256) throw new Error(`Asset checksum mismatch: ${entry.id}/${info.file}`);
      files++; bytes+=buffer.length;
    }
  }
  if (manifest.counts.characters !== ids.size || manifest.counts.files !== files || manifest.counts.bytes !== bytes) throw new Error('Manifest counts mismatch');
  if (manifest.license !== undefined) {
    if (manifest.license !== 'MIT' || manifest.licenseFile !== 'LICENSE' || manifest.assetLicenseFile !== 'ASSET_LICENSE.md' || manifest.thirdPartyNoticesFile !== 'THIRD_PARTY_NOTICES.md') throw new Error('Invalid asset license metadata');
    for (const name of ['LICENSE', 'ASSET_LICENSE.md', 'THIRD_PARTY_NOTICES.md', 'licenses/pixoffice/LICENSE', 'licenses/three/LICENSE']) {
      if (!(await fs.readFile(path.join(root,name))).length) throw new Error(`Empty license file: ${name}`);
    }
  }
}

// Produce selected assets into a sibling staging directory; publication never
// begins until every retained and generated file passes validation.
export async function exportCharacterAssets({ outRoot, roster, kinds = ASSET_KINDS, ids = roster.map(e=>e.id), produce, readme, licensesOnly = false, rename = fs.rename, onWarning = console.warn }) {
  if (!kinds.length || kinds.some(k=>!ASSET_KINDS.includes(k)) || new Set(kinds).size !== kinds.length) throw new Error('Invalid asset kinds');
  if (!ids.length || ids.some(id=>!roster.some(e=>e.id===id)) || new Set(ids).size !== ids.length) throw new Error('Invalid character IDs');
  outRoot=path.resolve(outRoot);
  const parent=path.dirname(outRoot), base=path.basename(outRoot), lock=`${outRoot}.lock`;
  await fs.mkdir(parent,{recursive:true});
  await fs.mkdir(lock); // An existing lock refuses concurrent writers.
  let stage, committed=false;
  try {
    const partial=licensesOnly || kinds.length !== ASSET_KINDS.length || ids.length !== roster.length;
    let previous;
    if(partial) {
      try { previous=JSON.parse(await fs.readFile(path.join(outRoot,'manifest.json'),'utf8')); }
      catch(error) { throw new Error('Partial export requires a valid previous export; run a full export first', {cause:error}); }
      await validateManifest(outRoot,previous);
      if (JSON.stringify(previous.characters.map(e=>e.id)) !== JSON.stringify(roster.map(e=>e.id))) throw new Error('Roster changed; run a full export');
      for(const entry of roster) {
        const old=previous.characters.find(e=>e.id===entry.id);
        if(JSON.stringify(old.look)!==JSON.stringify(entry.look) && !(!licensesOnly && ids.includes(entry.id) && kinds.length===ASSET_KINDS.length)) throw new Error(`Changed look ${entry.id}: export all kinds for this character`);
      }
    }
    stage=await fs.mkdtemp(path.join(parent,`.${base}-stage-`));
    if(partial) await fs.cp(outRoot,stage,{recursive:true});
    const characters=[];
    for(const entry of roster) {
      const { fingerprint, ...metadata }=entry;
      const old=previous?.characters.find(e=>e.id===entry.id);
      const files={...old?.files};
      if(!licensesOnly && ids.includes(entry.id)) {
        const buffers=await produce(entry,kinds);
        await fs.mkdir(path.join(stage,entry.id),{recursive:true});
        for(const kind of kinds) {
          const buffer=buffers[kind]; validateAsset(kind,buffer);
          await fs.writeFile(path.join(stage,entry.id,fileName(kind)),buffer);
          files[kind]={file:fileName(kind),bytes:buffer.length,sha256:sha256(buffer)};
        }
      }
      characters.push({...metadata, files});
    }
    const allFiles=characters.flatMap(e=>Object.values(e.files));
    const manifest={name:'pixoffice-voxel-characters',version:2,generator:'scripts/export-characters.mjs',
      source:'src/assets/characters/catalog.js + src/assets/characters/model.js + src/assets/characters/appearance.js',
      license:'MIT',licenseFile:'LICENSE',assetLicenseFile:'ASSET_LICENSE.md',thirdPartyNoticesFile:'THIRD_PARTY_NOTICES.md',
      exportedAt:new Date().toISOString(), kinds:ASSET_KINDS.filter(k=>characters.some(e=>e.files[k])),
      counts:{characters:characters.length,files:allFiles.length,bytes:allFiles.reduce((n,f)=>n+f.bytes,0)}, characters};
    await fs.writeFile(path.join(stage,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    await fs.writeFile(path.join(stage,'README.md'),readme(manifest));
    for (const [name, content] of await readDistributionLicenses()) {
      const destination=path.join(stage,name);
      await fs.mkdir(path.dirname(destination),{recursive:true});
      await fs.writeFile(destination,content);
    }
    await validateManifest(stage,manifest);
    await publishDirectory({stage,outRoot,rename,onWarning});
    committed=true;
    return manifest;
  } finally {
    try {
      if(stage) {
        try { await fs.rm(stage,{recursive:true,force:true,maxRetries:3,retryDelay:100}); }
        catch(error) {
          if(!committed) throw error;
          onWarning(`Export published; could not remove staging directory ${stage}: ${error.message}`);
        }
      }
    }
    finally { await fs.rmdir(lock); }
  }
}
