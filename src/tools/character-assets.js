// Character asset exporter (dev tool). It builds every character with the very same
// code the pages use — ../character.js plus ../appearance.js — and hands the caller a
// portrait PNG, a labelled turnaround sheet PNG and a glTF binary model for each one.
// Node drives it through tools/character-assets.html; nothing here runs at runtime.
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { createCharacter } from '../character.js';
import { drawPortrait } from '../appearance.js';
import { characterRoster } from '../shared/character-roster.js';
import { acquireArtResources } from '../art.js';
import { disposeSceneResources } from '../shared/scene-resources.js';

const VIEW = { width: 341, height: 384, frame: { width: 1024, height: 768 } };
const SHEET = { width: 1024, height: 1024, caption: 256 };
const PORTRAIT_SCALE = 4;
const EXPRESSIONS = [['happy', '开心'], ['focus', '专注'], ['surprise', '惊讶'], ['sleepy', '困倦']];
// A fixed time keeps every render — and therefore every exported pixel — deterministic.
const SAMPLE_TIME = 1;

const roster = characterRoster();

export const characterAssets = {
  // JSON-serializable metadata: the Node side cross-checks it and writes it to
  // manifest.json, so `look` has to stay in.
  roster: roster.map(({ fingerprint, ...entry }) => entry),
  summary: roster.length,
  async get(index, kinds = ['portrait', 'sheet', 'model']) {
    const entry = roster[index];
    if (!entry) throw new Error(`no character at ${index}`);
    return capture(entry, kinds);
  },
};

function buildCharacter(entry, scene) {
  scene.background = new THREE.Color('#e5ece9');
  scene.add(new THREE.HemisphereLight('#fff4dd', '#90a2a6', 2.5));
  const key = new THREE.DirectionalLight('#fff1dc', 2.4); key.position.set(-3, 6, 6); scene.add(key);
  const rim = new THREE.DirectionalLight('#dfeaf2', 1.3); rim.position.set(4, 5, -6); scene.add(rim);
  const actor = createCharacter(scene, { ...entry.look, x: 0, z: 0, phase: 0 });
  actor.ring.visible = false;              // the selection ring is UI, not character
  actor.expression = 'happy';
  actor.update(SAMPLE_TIME, 1, .85);
  return { scene, actor };
}

const bodyCamera = new THREE.OrthographicCamera(-1.045, 1.045, 1.35, -1.0, .1, 40);
bodyCamera.position.set(0, 1.05, 6); bodyCamera.lookAt(0, .95, 0);
const faceCamera = new THREE.OrthographicCamera(-.52, .52, .62, -.5, .1, 40);
faceCamera.position.set(0, 1.55, 6); faceCamera.lookAt(0, 1.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(VIEW.frame.width, VIEW.frame.height);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.setScissorTest(true);
renderer.setClearColor('#e5ece9');

const faceCanvasOf = actor => {
  const mesh = actor.head.children.find(child => child.isMesh && child.material?.transparent && child.material.map?.image?.getContext);
  if (!mesh) throw new Error('face texture not found on the character head');
  return mesh.material.map.image;
};

function captureFace(actor, expression) {
  actor.expression = expression;
  actor.update(SAMPLE_TIME, 1, .85);
  const source = faceCanvasOf(actor);
  const copy = document.createElement('canvas');
  copy.width = source.width; copy.height = source.height;
  copy.getContext('2d').drawImage(source, 0, 0);
  return copy;
}

function renderViews(actor, scene) {
  const views = [
    { label: '正面', x: 0, y: VIEW.height, yaw: 0, camera: bodyCamera },
    { label: '侧面', x: VIEW.width, y: VIEW.height, yaw: Math.PI / 2, camera: bodyCamera },
    { label: '背面', x: VIEW.width * 2, y: VIEW.height, yaw: Math.PI, camera: bodyCamera },
    { label: '头部特写', x: 0, y: 0, yaw: 0, camera: faceCamera },
  ];
  renderer.setScissorTest(false);
  renderer.setClearColor('#e5ece9'); renderer.clear();
  renderer.setScissorTest(true);
  for (const view of views) {
    actor.root.rotation.y = view.yaw;
    renderer.setViewport(view.x, view.y, VIEW.width, VIEW.height);
    renderer.setScissor(view.x, view.y, VIEW.width, VIEW.height);
    renderer.render(scene, view.camera);
  }
  actor.root.rotation.y = 0;
  return views;
}

function portraitDataUrl(look) {
  const tiny = document.createElement('canvas');
  drawPortrait(tiny, look);
  const out = document.createElement('canvas');
  out.width = tiny.width * PORTRAIT_SCALE; out.height = tiny.height * PORTRAIT_SCALE;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tiny, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

function caption(ctx, entry) {
  const look = entry.look;
  const parts = [look.hairStyle, look.outfit || '基础服装', look.accessory, look.glasses ? `${look.glasses} 眼镜` : null]
    .filter(Boolean).join(' · ');
  ctx.fillStyle = '#293635';
  ctx.font = 'bold 30px "Microsoft YaHei",sans-serif';
  ctx.fillText(`${entry.name} · ${entry.role}`, 40, 800);
  ctx.font = '20px "Microsoft YaHei",sans-serif';
  ctx.fillStyle = '#52666a';
  if (entry.signature) ctx.fillText(entry.signature, 40, 836);
  ctx.font = '17px Consolas,monospace';
  ctx.fillStyle = '#73817f';
  ctx.fillText(`ID ${entry.id}   ${parts}   身高 ${look.height ?? 1} / 体型 ${look.build ?? 1}`, 40, 870);
  ctx.fillText(`配色 衣 ${look.shirt}  饰 ${look.trim}  裤 ${look.pants}  发 ${look.hair}`, 40, 896);
  ctx.fillText(`用于 ${entry.usedBy.join(', ')}`, 40, 922);
  ctx.font = '15px "Microsoft YaHei",sans-serif';
  ctx.fillStyle = '#9aa5a2';
  ctx.fillText('PIX OFFICE · 方块办公室实验室 / 人物资产', 40, 978);
}

function composeSheet(entry, actor, scene) {
  const sheet = document.createElement('canvas');
  sheet.width = SHEET.width; sheet.height = SHEET.height;
  const ctx = sheet.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#f8f9f5'; ctx.fillRect(0, 0, SHEET.width, SHEET.height);
  renderViews(actor, scene);
  ctx.drawImage(renderer.domElement, 0, 0, VIEW.frame.width, VIEW.frame.height);
  const cells = [
    { label: '正面', x: 0, y: 0 },
    { label: '侧面', x: VIEW.width, y: 0 },
    { label: '背面', x: VIEW.width * 2, y: 0 },
    { label: '头部特写', x: 0, y: VIEW.height },
  ];
  ctx.font = '18px "Microsoft YaHei",sans-serif';
  for (const cell of cells) {
    ctx.strokeStyle = '#dfe4dd'; ctx.lineWidth = 2;
    ctx.strokeRect(cell.x + 1, cell.y + 1, VIEW.width - 2, VIEW.height - 2);
    ctx.fillStyle = '#73817f';
    ctx.fillText(cell.label, cell.x + 16, cell.y + 28);
  }
  // Expression strip: the same face texture the 3D character wears, drawn large in
  // the empty half of the close-up row so it never overlaps the caption text.
  const faces = EXPRESSIONS.map(([expression, label]) => ({ label, canvas: captureFace(actor, expression) }));
  actor.expression = 'happy'; actor.update(SAMPLE_TIME, 1, .85);
  ctx.fillStyle = '#52666a'; ctx.font = '16px "Microsoft YaHei",sans-serif';
  ctx.fillText('表情纹理（同一张脸部贴图）', 400, 420);
  faces.forEach((face, i) => {
    const x = 400 + i * 152, y = 440;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(face.canvas, x, y, 128, 128);
    ctx.strokeStyle = '#dfe4dd'; ctx.strokeRect(x + .5, y + .5, 127, 127);
    ctx.fillStyle = '#73817f'; ctx.font = '14px "Microsoft YaHei",sans-serif';
    ctx.fillText(face.label, x + 2, y + 146);
  });
  caption(ctx, entry);
  return sheet.toDataURL('image/png');
}

async function capture(entry, kinds) {
  if (kinds.length === 1 && kinds[0] === 'portrait') return { id: entry.id, portrait: portraitDataUrl(entry.look) };
  const release = acquireArtResources();
  const scene = new THREE.Scene();
  try {
    const { actor } = buildCharacter(entry, scene);
    await new Promise(resolve => renderer.compileAsync?.(scene, bodyCamera).then(resolve, resolve));
    const model = kinds.includes('model') ? await new GLTFExporter().parseAsync(actor.root, { binary: true, onlyVisible: true }) : new ArrayBuffer(0);
    const bytes = new Uint8Array(model);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return {
      id: entry.id,
      portrait: kinds.includes('portrait') ? portraitDataUrl(entry.look) : undefined,
      sheet: kinds.includes('sheet') ? composeSheet(entry, actor, scene) : undefined,
      model: btoa(binary),
      modelBytes: bytes.length,
    };
  } finally {
    try { disposeSceneResources(scene); } finally { release(); }
  }
}
