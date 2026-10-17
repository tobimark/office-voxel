import { createWallRun } from './building.js';
import { createMug as mug, createPlant } from '../furniture/primitives.js';
// Procedural environment asset. All geometry and placement data comes from the supplied layout.
import * as THREE from 'three';
import { registerDisplay } from '../../world/display-registry.js';
import { box, group, panel, canvasMaterial, palette as c } from '../materials/art.js';

export function buildEnvironment(scene, layout, { placeFurniture }) {
  const office = group(scene), obstacles = [], screens = [], displays = [];
  const ZONE = Object.fromEntries(layout.environment.zones.map(zone => [zone.id, zone]));
  const rooms = layout.rooms, meetingRoom = layout.meetingRoom;
  const { wallSpec } = layout.environment;
  const { halfWidth, halfDepth, back, left } = layout.shell;
  const PARTITION_Z = layout.partitionZ;

  // Floor, plinth and the timber boards.
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
  // Open dollhouse shell: the wide back and left walls stay, the other two stay open.
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
  const glassMat = new THREE.MeshStandardMaterial({ color: '#cfe3e6', transparent: true, opacity: .3, roughness: .3 });
  const boardPen = (ctx, width) => {
    ctx.fillStyle = '#f4f7f1'; ctx.fillRect(0, 0, width, 96);
    ctx.fillStyle = '#5c6e70'; ctx.font = 'bold 13px "Microsoft YaHei",monospace';
    ctx.fillText('SPRINT BOARD', 14, 20);
    ctx.strokeStyle = '#7d9aa0'; ctx.lineWidth = 2;
    for (const [x, y, w, h] of [[18, 34, 60, 34], [110, 34, 54, 34], [196, 34, 74, 34]]) ctx.strokeRect(x, y, w, h);
    ctx.beginPath(); ctx.moveTo(78, 51); ctx.lineTo(110, 51); ctx.moveTo(164, 51); ctx.lineTo(196, 51); ctx.stroke();
    ctx.fillStyle = '#d57645'; ctx.fillRect(26, 62, 44, 26);
    ctx.fillStyle = '#79917a'; ctx.fillRect(140, 62, 40, 26);
    ctx.fillStyle = '#708fa5'; ctx.fillRect(226, 62, 40, 26);
  };
  const boardMat = canvasMaterial(320, 96, ctx => boardPen(ctx, 320));
  const plateMat = room => canvasMaterial(128, 40, ctx => {
    ctx.fillStyle = '#f5f7f2'; ctx.fillRect(0, 0, 128, 40);
    ctx.fillStyle = '#79917a'; ctx.fillRect(0, 0, 9, 40);
    ctx.fillStyle = '#293635'; ctx.font = 'bold 13px "Microsoft YaHei",monospace'; ctx.fillText(room.number, 17, 17);
    ctx.fillStyle = '#52666a'; ctx.font = '12px "Microsoft YaHei",monospace'; ctx.fillText(room.name, 17, 33);
  });
  const menuMat = canvasMaterial(128, 96, ctx => {
    ctx.fillStyle = '#2f3c3b'; ctx.fillRect(0, 0, 128, 96);
    ctx.fillStyle = '#f0ead6'; ctx.font = 'bold 12px monospace'; ctx.fillText('BAR', 12, 20);
    ctx.fillStyle = '#c9a477'; for (let i = 0; i < 4; i++) ctx.fillRect(12, 32 + i * 14, 84 - i * 12, 5);
    ctx.fillStyle = '#8caa70'; ctx.fillRect(104, 14, 12, 74);
  });
  const signMat = canvasMaterial(256, 112, ctx => {
    ctx.fillStyle = '#79917a'; ctx.fillRect(0, 0, 256, 112);
    ctx.fillStyle = '#f8f9f5'; ctx.font = 'bold 33px monospace'; ctx.fillText('PIX OFFICE', 24, 47);
    ctx.font = '12px monospace'; ctx.fillText('ROOMS 01-04 / ONE CORRIDOR', 26, 78);
  });
  const tvMat = canvasMaterial(64, 40, ctx => {
    ctx.fillStyle = '#22313a'; ctx.fillRect(0, 0, 64, 40);
    ctx.fillStyle = '#3d5866'; ctx.fillRect(4, 4, 56, 26);
    ctx.fillStyle = '#8fb3bd'; ctx.fillRect(8, 9, 20, 3); ctx.fillRect(8, 15, 32, 3);
    ctx.fillStyle = '#c9a477'; ctx.fillRect(8, 21, 26, 3);
  }, true);

  const plant = (x, z, scale = 1, y = 0) => createPlant(office, x, z, scale, y);

  // Windows: two per work room along the back wall, plus a hanging whiteboard run.
  for (const room of rooms) {
    for (const x of [room.centerX - 2.3, room.centerX + 2.3]) {
      box(office, x, 2.05, back + .17, 2.2, 1.85, .12, c.white);
      panel(office, x, 2.05, back + .248, 1.95, 1.6, windowMat);
      box(office, x, 2.05, back + .30, .08, 1.7, .08, c.white);
      box(office, x, 2.05, back + .30, 2, .08, .08, c.white);
      box(office, x, 1.12, back + .35, 2.35, .12, .45, c.white);
    }
  }

  // Walls: solid base, glazed band, rails and posts, with real door openings.
  layout.environment.wallRuns.forEach(run => createWallRun(office, run, wallSpec, glassMat, layout.environment.wallStyle));

  // Room plates on the corridor side of every door.
  for (const room of rooms) {
    panel(office, room.door.x + room.door.width / 2 + .68, 1.62, PARTITION_Z + .12, .95, .3, plateMat(room));
  }
  panel(office, meetingRoom.door.x + meetingRoom.door.width / 2 + .72, 1.62, meetingRoom.zInner[0] - .12, .95, .3, plateMat(meetingRoom)).rotation.y = Math.PI;

  // Per room: low storage under the windows, a whiteboard, and a plant.
  function sideboard(id) {
    const z = ZONE[id];
    box(office, z.x, .48, z.z, z.w, .95, z.d, c.cream);
    box(office, z.x, .98, z.z, z.w + .08, .07, z.d + .08, c.wood, 'wood');
    for (let i = 0; i < 3; i++) {
      box(office, z.x - 1.6 + i * 1.6, .48, z.z + z.d / 2 + .01, 1.45, .78, .03, '#dde0cb');
      box(office, z.x - 1.6 + i * 1.6, .6, z.z + z.d / 2 + .04, .34, .05, .04, c.woodDark);
    }
    box(office, z.x - 1.9, 1.16, z.z, .6, .3, .5, c.blue);
    box(office, z.x - 1.2, 1.1, z.z, .4, .18, .4, c.orange);
    box(office, z.x + .5, 1.12, z.z, .8, .22, .62, c.ink);
    box(office, z.x + 1.8, 1.14, z.z, .7, .26, .45, '#8caa70');
    for (let i = 0; i < 5; i++) box(office, z.x + .15 + i * .18, 1.2, z.z + .34, .15, .3 + (i % 2) * .06, .2, [c.blue, c.green, c.orange][i % 3]);
  }
  const boards = [
    { x: left + .18, z: -4.4, width: 3, height: 1.2 },
    { x: -4.22, z: -2.4, width: 2.6, height: 1.15 },
    { x: 4.42, z: -2.4, width: 2.6, height: 1.15 },
  ];
  boards.forEach((board, index) => {
    const g = group(office, board.x, 1.95, board.z); g.rotation.y = Math.PI / 2;
    box(g, 0, 0, 0, board.width, board.height, .1, c.wood);
    registerDisplay(displays, 'board', panel(g, 0, 0, .06, board.width - .2, board.height - .18, boardMat), { id: `room-tasks-${index}`, roomId: rooms[index].id, label: `${rooms[index].name}子任务` });
    box(g, 0, -board.height / 2 - .06, .08, board.width - .3, .06, .12, c.wood);
    box(g, 0, .02, .1, .5, .05, .04, index % 2 ? c.orange : c.blue);
  });
  for (const room of rooms) {
    sideboard(`${room.id}-sideboard`);
    const spot = ZONE[`${room.id}-plant`];
    plant(spot.x, spot.z, .85);
  }

  screens.push(...placeFurniture(office, screenMat));

  // Meeting room: a long table, six chairs, a wall screen and a board.
  const meet = ZONE['meeting-table'];
  box(office, meet.x, .74, meet.z, meet.w, .1, meet.d, c.wood, 'wood');
  for (const x of [meet.x - 1.1, meet.x + 1.1]) box(office, x, .36, meet.z, .12, .72, meet.d - .2, c.ink);
  box(office, meet.x, .82, meet.z, .5, .06, .34, c.white);
  mug(office, meet.x + .7, .79, meet.z - .1, c.blue);
  for (const id of Object.keys(ZONE).filter(key => key.startsWith('meeting-chair'))) {
    const s = ZONE[id], head = s.z < meet.z ? -1 : 1;
    const g = group(office, s.x, 0, s.z); g.rotation.y = head > 0 ? Math.PI : 0;
    box(g, 0, .44, 0, .46, .1, .46, '#708fa5');
    box(g, 0, .74, .2, .46, .5, .1, '#708fa5');
    for (const [sx, sz] of [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]]) box(g, sx, .19, sz, .06, .38, .06, c.ink);
  }
  for (let a = 0; a < 7; a++) for (let b = 0; b < 5; b++) {
    box(office, meet.x - 2 + a * .55, .049, meet.z - 1.3 + b * .5, .545, .015, .495, (a + b) % 2 ? '#d9c4a0' : '#dfcbaa');
  }
  const tv = group(office, left + .16, 1.95, meet.z); tv.rotation.y = Math.PI / 2;
  box(tv, 0, 0, 0, 2.3, 1.35, .12, c.ink);
  panel(tv, 0, 0, .08, 2.08, 1.14, tvMat);
  box(office, meet.x + 2, 1.9, meetingRoom.zInner[0] + .12, 2.1, 1.15, .1, c.wood);
  registerDisplay(displays, 'board', panel(office, meet.x + 2, 1.9, meetingRoom.zInner[0] + .18, 1.92, .98, boardMat), { id: 'tasks', label: '全部子任务' });

  // Corridor: a long runner, a wall sign and a clock.
  for (let col = 0; col < 40; col++) for (let row = 0; row < 2; row++) {
    box(office, -11 + col * .55 + .275, .049, 1.45 + row * .5, .545, .015, .49, (col + row) % 2 ? '#d7c8ad' : '#ddcfb6');
  }
  const sign = group(office, left + .16, 2.05, 1.7); sign.rotation.y = Math.PI / 2;
  box(sign, 0, 0, 0, 2.7, 1.3, .14, c.wood);
  registerDisplay(displays, 'topic', panel(sign, 0, 0, .08, 2.5, 1.12, signMat), { id: 'mission', label: '任务主题' });
  const clock = group(office, left + .17, 2.5, 3.05); clock.rotation.y = Math.PI / 2;
  box(clock, 0, 0, 0, .62, .62, .12, c.woodDark); box(clock, 0, 0, .08, .51, .51, .05, c.white);
  box(clock, 0, .09, .12, .04, .2, .02, c.ink); box(clock, .09, 0, .12, .2, .04, .02, c.ink);

  // Break area: bar counter with stools, lockers, a lounge nook and plants.
  const bar = ZONE['pantry-bar'], barBack = ZONE['pantry-back'];
  box(office, bar.x, .53, bar.z, bar.w, 1.02, bar.d, c.cream);
  box(office, bar.x, 1.08, bar.z, bar.w + .16, .12, bar.d + .14, c.wood, 'wood');
  for (let i = 0; i < 4; i++) {
    box(office, bar.x - 2.4 + i * 1.6, .52, bar.z - bar.d / 2 - .02, 1.45, .84, .03, '#dde0cb');
    box(office, bar.x - 2.4 + i * 1.6 + .5, .72, bar.z - bar.d / 2 - .05, .06, .05, .18, c.woodDark);
  }
  box(office, bar.x - 1.4, 1.16, bar.z, .5, .04, .62, '#c3cfcb');
  box(office, bar.x - 1.4, 1.32, bar.z + .3, .06, .32, .06, '#9fb0ad');
  box(office, bar.x - 1.36, 1.42, bar.z + .35, .3, .05, .05, '#9fb0ad');
  box(office, bar.x + 1.5, 1.45, bar.z, .56, .62, .5, c.ink);
  box(office, bar.x + 1.1, 1.48, bar.z, .03, .3, .34, '#657671');
  mug(office, bar.x + .3, 1.14, bar.z - .2, c.white);
  mug(office, bar.x + .62, 1.14, bar.z - .05, c.orange);
  box(office, bar.x - .4, 1.18, bar.z - .15, .42, .12, .3, '#8caa70');
  box(office, barBack.x, 1, barBack.z, barBack.w, 2, barBack.d, c.cream);
  box(office, barBack.x, 2.03, barBack.z, barBack.w + .08, .08, barBack.d + .08, c.wood, 'wood');
  for (let i = 0; i < 3; i++) box(office, barBack.x, .45 + i * .5, barBack.z, barBack.w + .06, .05, barBack.d - .16, '#dde0cb');
  for (let i = 0; i < 8; i++) box(office, barBack.x - 2.8 + i * .8, .62 + (i % 3) * .5, barBack.z, .24, .3, .22, [c.blue, c.green, c.orange, c.woodDark][i % 4]);
  panel(office, barBack.x + .5, 1.62, barBack.z - barBack.d / 2 - .04, 1.8, .8, menuMat).rotation.y = Math.PI;
  for (const id of Object.keys(ZONE).filter(key => key.startsWith('stool'))) {
    const s = ZONE[id], g = group(office, s.x, 0, s.z);
    box(g, 0, .63, 0, s.w, .07, s.w, c.wood, 'wood');
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, sx * .13, .3, sz * .13, .06, .6, .06, c.ink);
    box(g, 0, .2, 0, s.w - .12, .04, .04, c.ink);
  }
  const lockers = ZONE.lockers;
  box(office, lockers.x, .9, lockers.z, lockers.w, 1.8, lockers.d, c.cream);
  box(office, lockers.x, 1.83, lockers.z, lockers.w + .1, .07, lockers.d + .1, c.wood, 'wood');
  for (let col = 0; col < 4; col++) for (let row = 0; row < 2; row++) {
    const x = lockers.x - lockers.w / 2 + .36 + col * .64, y = .52 + row * .82;
    box(office, x, y, lockers.z - lockers.d / 2 - .015, .56, .74, .03, '#dde0cb');
    box(office, x + .18, y, lockers.z - lockers.d / 2 - .04, .05, .13, .04, c.woodDark);
  }
  const sofa = ZONE.sofa;
  const sg = group(office, sofa.x, 0, sofa.z);
  box(sg, 0, .72, sofa.d / 2 - .12, sofa.w, 1.1, .25, c.green);
  box(sg, 0, .38, 0, sofa.w, .3, sofa.d - .35, c.green);
  for (const x of [-.75, 0, .75]) box(sg, x, .59, -.05, .7, .2, sofa.d - .5, '#a6b497');
  for (const x of [-1.3, 1.3]) box(sg, x, .69, 0, .22, .65, sofa.d - .3, c.green);
  for (const x of [-1, 1]) box(sg, x, .12, 0, .16, .2, sofa.d - .5, c.woodDark);
  box(sg, -.35, .91, .2, .45, .45, .45, '#e2bd8b');
  const coffee = ZONE.coffee;
  box(office, coffee.x, .42, coffee.z, coffee.w, .1, coffee.d, c.wood, 'wood');
  for (const x of [coffee.x - .45, coffee.x + .45]) for (const z of [coffee.z - .26, coffee.z + .26]) box(office, x, .2, z, .09, .4, .09, c.ink);
  box(office, coffee.x - .2, .5, coffee.z, .4, .06, .3, c.white);
  mug(office, coffee.x + .34, .47, coffee.z - .08, c.orange);
  for (const [id, facing] of [['armchair-a', Math.PI / 2], ['armchair-b', -Math.PI / 2]]) {
    const a = ZONE[id], g = group(office, a.x, 0, a.z); g.rotation.y = facing;
    box(g, 0, .68, a.d / 2 - .1, a.w, 1, .22, '#708fa5');
    box(g, 0, .38, 0, a.w, .3, a.d - .3, '#708fa5');
    box(g, 0, .57, -.04, .6, .18, .6, '#abc2c9');
    for (const x of [-a.w / 2 + .1, a.w / 2 - .1]) box(g, x, .64, 0, .18, .6, a.d - .24, '#708fa5');
  }
  for (let a = 0; a < 7; a++) for (let b = 0; b < 6; b++) {
    box(office, sofa.x - 2 + a * .55, .049, 5 + b * .45, .545, .015, .445, (a + b) % 2 ? '#d9c4a0' : '#dfcbaa');
  }
  for (const id of ['plant-corner-a', 'plant-corner-b', 'plant-corner-c']) {
    const spot = ZONE[id];
    plant(spot.x, spot.z, .9);
  }

  return { office, obstacles, seats: layout.seats, stations: layout.seats, screens, displays };
}
