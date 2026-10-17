import { createMug as mug, createPlant, createChair, createMonitor, createDeskSlab, createKeyboard, seatPoint as at } from '../shared/furniture.js';
// Loft office furniture. Every solid piece is placed inside one of the collision
// boxes declared in ./layout.js, so the room the player walks around and the room
// they can see always agree. Built only from the shared pixels in ../art.js.
import * as THREE from 'three';
import { box, group, panel, canvasMaterial, batchStaticBoxes, palette as c } from '../art.js';
import { loftOffice, loftSeats, loftZones, loftObstacles, deskItems, loftPlanterX } from './layout.js';
import { registerDisplay, registerComputers } from '../shared/display-surface.js';

const ZONE = Object.fromEntries(loftZones.map(item => [item.id, item]));

export function createLoftOffice(scene, layout = loftOffice) {
  const office = group(scene), obstacles = loftObstacles(), screens = [], displays = [];
  const table = layout.table;
  const halfWidth = layout.width / 2, halfDepth = layout.depth / 2;
  const back = -halfDepth + .05, left = -halfWidth + .05;

  // Floor, plinth and the long timber boards.
  box(office, 0, -.3, 0, layout.width, .55, layout.depth, c.cream);
  box(office, 0, -.58, 0, layout.width - .35, .12, layout.depth - .35, '#b7c8c8');
  const columns = Math.ceil(layout.width / 1.5), plankWidth = layout.width / columns;
  for (let row = 0; row < layout.depth * 2; row++) {
    for (let col = 0; col < columns; col++) {
      const x = -halfWidth + plankWidth / 2 + col * plankWidth;
      box(office, x, -.005, -halfDepth + .25 + row * .5, plankWidth - .015, .08, .485,
        ['#ccae86', '#d2b48e', '#d6bb98', '#c6a680'][(row * 7 + col * 3) % 4], 'wood');
    }
  }
  // Open dollhouse shell: the long back and left walls stay, both ends stay open.
  box(office, 0, 1.65, back, layout.width, 3.3, .18, c.cream);
  box(office, left, 1.65, 0, .18, 3.3, layout.depth, c.cream);
  box(office, 0, .24, back + .14, layout.width - .2, .38, .08, '#b3bca5');
  box(office, left + .14, .24, 0, .08, .38, layout.depth - .2, '#b3bca5');
  box(office, 0, 3.32, back, layout.width + .1, .12, .26, '#f6f6e9');
  box(office, left, 3.32, 0, .26, .12, layout.depth + .1, '#f6f6e9');

  const windowMat = canvasMaterial(64, 40, ctx => {
    ctx.fillStyle = '#b6d6d9'; ctx.fillRect(0, 0, 64, 40);
    ctx.fillStyle = '#e4eee4'; ctx.fillRect(5, 5, 19, 4); ctx.fillRect(36, 8, 23, 4);
    ctx.fillStyle = '#9ab7b3';
    for (let i = 0; i < 8; i++) ctx.fillRect(i * 9, 25 - (i % 3) * 4, 7, 20);
    ctx.fillStyle = '#c4d8cc'; ctx.fillRect(2, 34, 64, 6);
  }, true);
  const screenMat = canvasMaterial(64, 40, ctx => {
    ctx.fillStyle = '#293e40'; ctx.fillRect(0, 0, 64, 40);
    ctx.fillStyle = '#52666a'; ctx.fillRect(0, 0, 64, 5); ctx.fillRect(0, 7, 12, 33);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = ['#e2bd8b', '#9ec5b5', '#839fac'][i % 3];
      ctx.fillRect(16 + i % 2 * 5, 10 + i * 4, 13 + (i * 7) % 25, 2);
    }
  }, true);
  const signMat = canvasMaterial(256, 112, ctx => {
    ctx.fillStyle = '#79917a'; ctx.fillRect(0, 0, 256, 112);
    ctx.fillStyle = '#f8f9f5'; ctx.font = 'bold 33px monospace'; ctx.fillText('PIX OFFICE', 24, 47);
    ctx.font = '12px monospace'; ctx.fillText('NINE AT ONE LONG TABLE.', 26, 78);
  });
  const whiteboardMat = canvasMaterial(320, 96, ctx => {
    ctx.fillStyle = '#f4f7f1'; ctx.fillRect(0, 0, 320, 96);
    ctx.fillStyle = '#5c6e70'; ctx.font = 'bold 13px monospace'; ctx.fillText('LOFT STUDIO / SPRINT 07', 14, 20);
    ctx.strokeStyle = '#7d9aa0'; ctx.lineWidth = 2;
    for (const [x, y, w, h] of [[18, 34, 60, 34], [110, 34, 54, 34], [196, 34, 74, 34]]) ctx.strokeRect(x, y, w, h);
    ctx.beginPath(); ctx.moveTo(78, 51); ctx.lineTo(110, 51); ctx.moveTo(164, 51); ctx.lineTo(196, 51); ctx.stroke();
    ctx.fillStyle = '#d57645'; ctx.fillRect(26, 62, 44, 26);
    ctx.fillStyle = '#79917a'; ctx.fillRect(140, 62, 40, 26);
    ctx.fillStyle = '#708fa5'; ctx.fillRect(226, 62, 40, 26);
  });
  const menuMat = canvasMaterial(128, 96, ctx => {
    ctx.fillStyle = '#2f3c3b'; ctx.fillRect(0, 0, 128, 96);
    ctx.fillStyle = '#f0ead6'; ctx.font = 'bold 12px monospace'; ctx.fillText('BAR', 12, 20);
    ctx.fillStyle = '#c9a477'; for (let i = 0; i < 4; i++) ctx.fillRect(12, 32 + i * 14, 84 - i * 12, 5);
    ctx.fillStyle = '#8caa70'; ctx.fillRect(104, 14, 12, 74);
  });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#cfe3e6', transparent: true, opacity: .34, roughness: .3 });

  // Five windows and a centred sign on the long back wall.
  for (const x of [-9.9, -3.3, 3.3, 9.9]) {
    box(office, x, 2.05, back + .17, 2.75, 1.85, .12, c.white);
    panel(office, x, 2.05, back + .248, 2.5, 1.6, windowMat);
    box(office, x, 2.05, back + .30, .08, 1.7, .08, c.white);
    box(office, x, 2.05, back + .30, 2.55, .08, .08, c.white);
    box(office, x, 1.12, back + .35, 2.9, .12, .45, c.white);
  }
  box(office, 0, 2.35, back + .20, 2.8, 1.3, .16, c.wood);
  registerDisplay(displays, 'topic', panel(office, 0, 2.35, back + .292, 2.62, 1.13, signMat), { id: 'mission', label: '任务主题' });

  const plant = (x, z, scale = 1, y = 0) => createPlant(office, x, z, scale, y);

  // One shared table, one leg per seat pair, shared planters down the middle.
  // Everything on the table is measured from its surface so the top stays
  // height-matched to the typing pose in ./layout.js.
  const surface = table.surface, slab = table.thickness;
  createDeskSlab(office, { ...table, surface, thickness: slab });
  box(office, table.x, surface - slab - .09, table.z, table.w - .7, .07, .55, '#4a5a58');
  for (const x of [-9.2, -4.4, 0, 4.4, 9.2]) for (const z of [-.85, .85]) {
    box(office, x, (surface - slab) / 2, z, .12, surface - slab, .5, c.white);
  }
  for (const x of loftPlanterX) {
    box(office, x, surface + .07, 0, .5, .14, .34, '#e6d3b8');
    box(office, x, surface + .185, 0, .34, .1, .22, c.leafLight);
    box(office, x, surface + .245, 0, .18, .07, .14, c.leaf);
  }
  box(office, 1.1, surface + .035, 0, .46, .07, .3, '#c9d3cf');
  box(office, 1.1, surface + .085, 0, .4, .03, .24, c.white);
  for (const [x, side] of [[-6.6, -1], [1.1, 1], [7.7, -1]]) {
    box(office, x, .39, side * .72, .5, .76, .62, c.cream);
    box(office, x, .8, side * .72, .56, .06, .68, c.wood, 'wood');
    for (let i = 0; i < 2; i++) box(office, x, .3 + i * .34, side * 1.06, .3, .04, .04, c.woodDark);
  }

  const chair = seat => createChair(office, seat);
  const monitor = seat => {
    const p = at(seat, deskItems.monitor.forward);
    screens.push(createMonitor(office, { ...p, yaw: seat.yaw + Math.PI, surface, faceOffset: deskItems.monitor.faceOffset, material: screenMat }).screen);
  };
  const keyboard = seat => createKeyboard(office, seat, surface, deskItems.keyboard);
  loftSeats.forEach((seat, i) => {
    monitor(seat); keyboard(seat); chair(seat);
    const mouse = at(seat, deskItems.mouse.forward, deskItems.mouse.side);
    box(office, mouse.x, surface + .015, mouse.z, .12, .03, .18, c.ink);
    const book = at(seat, deskItems.notebook.forward, deskItems.notebook.side);
    box(office, book.x, surface + .02, book.z, .3, .04, .24, '#e6e6d9');
    box(office, book.x, surface + .045, book.z, .3, .01, .05, [c.orange, c.blue, c.green][i % 3]);
    const cup = at(seat, deskItems.mug.forward, deskItems.mug.side);
    mug(office, cup.x, surface, cup.z, [c.orange, c.blue, c.green][i % 3]);
  });

  // Left end: the long whiteboard wall, a pinboard and a clock between cabinets.
  const board = group(office, left + .16, 2, -.2); board.rotation.y = Math.PI / 2;
  box(board, 0, 0, 0, 6.4, 2.1, .1, c.wood);
  registerDisplay(displays, 'board', panel(board, 0, 0, .06, 6.2, 1.92, whiteboardMat), { id: 'tasks', label: '全部子任务' });
  box(board, 0, -1.1, .07, 6, .06, .12, c.wood);
  box(board, -1.7, -1.04, .1, .1, .05, .05, c.orange);
  box(board, -1.5, -1.04, .1, .1, .05, .05, c.blue);
  const pinboard = group(office, left + .16, 1.95, 5.4); pinboard.rotation.y = Math.PI / 2;
  box(pinboard, 0, 0, 0, 2.3, 1.3, .09, c.wood);
  box(pinboard, 0, 0, .055, 2.14, 1.14, .05, '#c5ae8b');
  for (let i = 0; i < 6; i++) {
    const note = box(pinboard, -.72 + i % 3 * .72, .24 - Math.floor(i / 3) * .5, .09, .38, .32, .02, [c.cream, '#e4b581', '#b7ccb6'][i % 3]);
    note.rotation.z = (i % 3 - 1) * .09;
  }
  const clock = group(office, left + .17, 2.6, -5.4); clock.rotation.y = Math.PI / 2;
  box(clock, 0, 0, 0, .65, .65, .12, c.woodDark); box(clock, 0, 0, .08, .54, .54, .05, c.white);
  box(clock, 0, .09, .12, .04, .21, .02, c.ink); box(clock, .09, 0, .12, .21, .04, .02, c.ink);
  for (const id of ['file-n', 'file-s']) {
    const f = ZONE[id];
    box(office, f.x, .62, f.z, f.w, 1.24, f.d, c.cream);
    box(office, f.x, 1.27, f.z, f.w + .08, .07, f.d + .08, c.wood, 'wood');
    for (let i = 0; i < 3; i++) {
      box(office, f.x + f.w / 2 + .005, .34 + i * .38, f.z, .03, .32, f.d - .2, '#dde0cb');
      box(office, f.x + f.w / 2 + .03, .34 + i * .38, f.z, .05, .05, .16, c.woodDark);
    }
  }
  plant(ZONE['file-n'].x + .2, ZONE['file-n'].z, .55, 1.3);

  // Right end: a bar, a back-bar unit and three stools.
  const bar = ZONE.bar, barBack = ZONE['bar-back'];
  box(office, bar.x, .53, bar.z, bar.w, 1.02, bar.d, c.cream);
  box(office, bar.x, 1.08, bar.z, bar.w + .18, .12, bar.d + .16, c.wood, 'wood');
  for (const z of [-3.1, -1.1, .9]) {
    box(office, bar.x - bar.w / 2 - .02, .52, z, .03, .86, 1.6, '#dde0cb');
    box(office, bar.x - bar.w / 2 - .06, .72, z, .06, .05, .18, c.woodDark);
  }
  box(office, bar.x, 1.155, -2.7, .5, .04, .66, '#c3cfcb');
  box(office, bar.x, 1.32, -2.4, .06, .32, .06, '#9fb0ad');
  box(office, bar.x + .04, 1.42, -2.35, .3, .05, .05, '#9fb0ad');
  box(office, bar.x - .05, 1.45, .35, .56, .62, .5, c.ink);
  box(office, bar.x - .36, 1.48, .35, .03, .3, .34, '#657671');
  box(office, bar.x + .06, 1.2, .35, .3, .06, .3, c.ink);
  mug(office, bar.x - .32, 1.14, 1.05, c.white);
  mug(office, bar.x - .32, 1.14, .72, c.orange);
  box(office, barBack.x, 1, barBack.z, barBack.w, 2, barBack.d, c.cream);
  box(office, barBack.x, 2.03, barBack.z, barBack.w + .08, .08, barBack.d + .08, c.wood, 'wood');
  for (let i = 0; i < 3; i++) box(office, barBack.x, .45 + i * .5, barBack.z, barBack.w + .06, .05, barBack.d - .18, '#dde0cb');
  for (let i = 0; i < 6; i++) box(office, barBack.x - .03, .62 + (i % 3) * .5, barBack.z - 1.85 + i * .62, .22, .3, .24, [c.blue, c.green, c.orange, c.woodDark][i % 4]);
  panel(office, barBack.x - barBack.w / 2 - .04, 1.62, barBack.z, 1.6, .8, menuMat).rotation.y = -Math.PI / 2;
  for (const id of ['stool-a', 'stool-b', 'stool-c']) {
    const s = ZONE[id], g = group(office, s.x, 0, s.z);
    box(g, 0, .63, 0, s.w, .07, s.w, c.wood, 'wood');
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, sx * .13, .3, sz * .13, .06, .6, .06, c.ink);
    box(g, 0, .2, 0, s.w - .12, .04, .04, c.ink);
  }
  plant(ZONE['plant-bar'].x, ZONE['plant-bar'].z, .85);

  // Back wall: a low cabinet run and a low shelf run under the windows.
  const lowLeft = ZONE['low-left'], lowRight = ZONE['low-right'];
  box(office, lowLeft.x, .5, lowLeft.z, lowLeft.w, .98, lowLeft.d, c.cream);
  box(office, lowLeft.x, 1.02, lowLeft.z, lowLeft.w + .08, .08, lowLeft.d + .08, c.wood, 'wood');
  for (let i = 0; i < 3; i++) {
    box(office, lowLeft.x - 1.5 + i * 1.5, .5, lowLeft.z + lowLeft.d / 2 + .01, 1.38, .8, .03, '#dde0cb');
    box(office, lowLeft.x - 1.5 + i * 1.5, .62, lowLeft.z + lowLeft.d / 2 + .04, .34, .05, .04, c.woodDark);
  }
  box(office, -11.5, 1.2, -7.3, .6, .3, .5, c.blue);
  box(office, -10.8, 1.14, -7.3, .4, .18, .4, c.orange);
  box(office, -8.5, 1.16, -7.3, .8, .22, .62, c.ink);
  box(office, -8.5, 1.3, -7.42, .7, .05, .5, c.white);
  box(office, lowRight.x, .5, lowRight.z, lowRight.w, 1, lowRight.d, c.wood);
  box(office, lowRight.x, 1.03, lowRight.z, lowRight.w + .06, .06, lowRight.d + .06, c.cream);
  for (let i = 0; i < 18; i++) {
    box(office, lowRight.x - lowRight.w / 2 + .5 + i * .52, 1.21, lowRight.z + .08, .34, .24 + (i % 3) * .05, .2,
      [c.blue, c.green, c.orange, '#a6b497', '#c27e83'][i % 5]);
  }
  box(office, 2.2, 1.24, -7.3, .5, .34, .44, '#8caa70');
  plant(ZONE['plant-bk1'].x, ZONE['plant-bk1'].z, .9);
  plant(ZONE['plant-bk2'].x, ZONE['plant-bk2'].z, .75);

  // Front edge: lounge nook, phone booth, lockers and a reading corner.
  function rug(x, z, columns, rows) {
    for (let a = 0; a < columns; a++) for (let b = 0; b < rows; b++) {
      box(office, x + a * .55, .049, z + b * .45, .545, .015, .445, (a + b) % 2 ? '#d9c4a0' : '#dfcbaa');
    }
  }
  rug(-9.9, 5.1, 7, 6);
  rug(6.3, 5.4, 5, 5);
  const sofa = ZONE.sofa;
  const sg = group(office, sofa.x, 0, sofa.z);
  box(sg, 0, .72, sofa.d / 2 - .12, sofa.w, 1.1, .25, c.green);
  box(sg, 0, .38, 0, sofa.w, .3, sofa.d - .35, c.green);
  for (const x of [-.75, 0, .75]) box(sg, x, .59, -.05, .7, .2, sofa.d - .5, '#a6b497');
  for (const x of [-1.3, 1.3]) box(sg, x, .69, 0, .22, .65, sofa.d - .3, c.green);
  for (const x of [-1, 1]) box(sg, x, .12, 0, .16, .2, sofa.d - .5, c.woodDark);
  box(sg, -.35, .91, .2, .45, .45, .45, '#e2bd8b');
  box(sg, .45, .2, sofa.d / 2 + .05, .5, .4, .5, '#f0e6c8'); // floor lamp base beside the sofa
  box(sg, .45, 1.4, sofa.d / 2 + .05, .07, 2.4, .07, c.ink);
  box(sg, .45, 2.7, sofa.d / 2 + .05, .5, .35, .5, '#f0e6c8');
  const coffee = ZONE.coffee;
  box(office, coffee.x, .42, coffee.z, coffee.w, .1, coffee.d, c.wood, 'wood');
  for (const x of [coffee.x - .45, coffee.x + .45]) for (const z of [coffee.z - .26, coffee.z + .26]) box(office, x, .2, z, .09, .4, .09, c.ink);
  box(office, coffee.x - .2, .5, coffee.z, .4, .06, .3, c.white);
  mug(office, coffee.x + .35, .47, coffee.z - .1, c.orange);
  const armchair = ZONE.armchair;
  const ag = group(office, armchair.x, 0, armchair.z); ag.rotation.y = -Math.PI / 2;
  box(ag, 0, .68, armchair.d / 2 - .1, armchair.w, 1, .22, '#708fa5');
  box(ag, 0, .38, 0, armchair.w, .3, armchair.d - .3, '#708fa5');
  box(ag, 0, .57, -.04, .6, .18, .6, '#abc2c9');
  for (const x of [-armchair.w / 2 + .1, armchair.w / 2 - .1]) box(ag, x, .64, 0, .18, .6, armchair.d - .24, '#708fa5');
  const reader = ZONE.reader;
  const rg = group(office, reader.x, 0, reader.z); rg.rotation.y = Math.PI;
  box(rg, 0, .68, reader.d / 2 - .1, reader.w, 1, .22, c.green);
  box(rg, 0, .38, 0, reader.w, .3, reader.d - .3, c.green);
  box(rg, 0, .57, -.04, .6, .18, .6, '#a6b497');
  for (const x of [-reader.w / 2 + .1, reader.w / 2 - .1]) box(rg, x, .64, 0, .18, .6, reader.d - .24, c.green);
  const side = ZONE.side;
  box(office, side.x, .46, side.z, side.w, .06, side.d, c.wood, 'wood');
  for (const x of [side.x - .18, side.x + .18]) box(office, x, .23, side.z, .06, .46, side.d - .16, c.ink);
  mug(office, side.x, .5, side.z - .1, c.blue);
  const lamp = ZONE.lamp;
  box(office, lamp.x, .05, lamp.z, .44, .1, .44, c.ink);
  box(office, lamp.x, 1.4, lamp.z, .07, 2.7, .07, c.ink);
  box(office, lamp.x, 2.68, lamp.z, .5, .35, .5, '#f0e6c8');
  plant(ZONE['plant-front'].x, ZONE['plant-front'].z, .8);
  plant(ZONE['plant-sw'].x, ZONE['plant-sw'].z, .7);
  plant(ZONE['plant-nw'].x, ZONE['plant-nw'].z, .8);

  // Phone booth with glass on three sides and a small desk inside.
  const booth = ZONE.booth;
  const bg = group(office, booth.x, 0, booth.z);
  box(bg, 0, -.02, 0, booth.w + .1, .12, booth.d + .1, '#8f9c94');
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(bg, sx * (booth.w / 2 - .08), 1.2, sz * (booth.d / 2 - .08), .14, 2.4, .14, c.ink);
  }
  box(bg, 0, 2.44, 0, booth.w + .06, .12, booth.d + .06, c.ink);
  panel(bg, 0, 1.2, booth.d / 2 - .07, booth.w - .3, 2.24, glassMat);
  panel(bg, booth.w / 2 - .07, 1.2, 0, booth.d - .3, 2.24, glassMat).rotation.y = -Math.PI / 2;
  panel(bg, -(booth.w / 2 - .07), 1.2, -.35, booth.d - 1, 2.24, glassMat).rotation.y = Math.PI / 2;
  box(bg, .48, .76, -.1, .55, .06, 1, c.wood, 'wood');
  for (const z of [-.5, .3]) box(bg, .48, .38, z, .08, .76, .08, c.ink);
  box(bg, .8, .9, -.5, .3, .22, .3, c.cream);
  box(bg, -.6, .3, .6, .34, .6, .34, '#79917a');

  // Woven runners down both long aisles.
  for (const centerZ of [-4.3, 4.3]) {
    for (let col = 0; col < 36; col++) for (let row = 0; row < 2; row++) {
      box(office, -9.9 + col * .55 + .275, .049, centerZ - .25 + row * .5, .545, .015, .49,
        (col + row) % 2 ? '#d9c4a0' : '#dfcbaa');
    }
  }
  for (const id of ['lockers']) {
    const lk = ZONE[id];
    box(office, lk.x, .9, lk.z, lk.w, 1.8, lk.d, c.cream);
    box(office, lk.x, 1.83, lk.z, lk.w + .1, .07, lk.d + .1, c.wood, 'wood');
    for (let col = 0; col < 4; col++) for (let row = 0; row < 2; row++) {
      const x = lk.x - lk.w / 2 + .45 + col * .84, y = .52 + row * .82;
      box(office, x, y, lk.z - lk.d / 2 - .015, .76, .74, .03, '#dde0cb');
      box(office, x + .26, y, lk.z - lk.d / 2 - .04, .06, .14, .04, c.woodDark);
    }
  }

  batchStaticBoxes(office);
  registerComputers(displays, screens, layout);
  return { office, obstacles, seats: layout.seats, stations: layout.seats, screens, displays };
}
