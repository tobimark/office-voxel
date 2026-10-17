// Big floor plate furniture. Six glazed team rooms (each with a four-person facing
// table), a corridor with a meeting room closing one end and the break area at the
// other. Every solid piece sits inside a collision box declared in ./layout.js,
// including each partition segment and every open door leaf.
import * as THREE from 'three';
import { registerDisplay, registerComputers } from '../shared/display-surface.js';
import { box, group, panel, canvasMaterial, batchStaticBoxes, palette as c } from '../art.js';
import { floorOffice, floorRooms, meetingRoom, floorWallRuns, floorZones, floorObstacles, floorSeats, deskItems, tableSurface, tableThickness, wallSpec, floorPlanterOffsets } from './layout.js';

const ZONE = Object.fromEntries(floorZones.map(item => [item.id, item]));

export function createFloorOffice(scene, layout = floorOffice) {
  const office = group(scene), obstacles = floorObstacles(), screens = [], displays = [];
  const { halfWidth, halfDepth, back, left } = layout.shell;

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
  // Open dollhouse shell: the wide back and left walls stay, the rest stays open.
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
  const boardMat = canvasMaterial(320, 96, ctx => {
    ctx.fillStyle = '#f4f7f1'; ctx.fillRect(0, 0, 320, 96);
    ctx.fillStyle = '#5c6e70'; ctx.font = 'bold 13px "Microsoft YaHei",monospace'; ctx.fillText('SPRINT BOARD', 14, 20);
    ctx.strokeStyle = '#7d9aa0'; ctx.lineWidth = 2;
    for (const [x, y, w, h] of [[18, 34, 60, 34], [110, 34, 54, 34], [196, 34, 74, 34]]) ctx.strokeRect(x, y, w, h);
    ctx.beginPath(); ctx.moveTo(78, 51); ctx.lineTo(110, 51); ctx.moveTo(164, 51); ctx.lineTo(196, 51); ctx.stroke();
    ctx.fillStyle = '#d57645'; ctx.fillRect(26, 62, 44, 26);
    ctx.fillStyle = '#79917a'; ctx.fillRect(140, 62, 40, 26);
    ctx.fillStyle = '#708fa5'; ctx.fillRect(226, 62, 40, 26);
  });
  const plateMat = room => canvasMaterial(128, 40, ctx => {
    ctx.fillStyle = '#f5f7f2'; ctx.fillRect(0, 0, 128, 40);
    ctx.fillStyle = '#d57645'; ctx.fillRect(0, 0, 9, 40);
    ctx.fillStyle = '#293635'; ctx.font = 'bold 13px "Microsoft YaHei",monospace'; ctx.fillText(room.number, 17, 17);
    ctx.fillStyle = '#52666a'; ctx.font = '12px "Microsoft YaHei",monospace'; ctx.fillText(room.name, 17, 33);
  });
  const directoryMat = canvasMaterial(192, 112, ctx => {
    ctx.fillStyle = '#edf0df'; ctx.fillRect(0, 0, 192, 112);
    ctx.fillStyle = '#526568'; ctx.font = 'bold 14px "Microsoft YaHei",monospace'; ctx.fillText('FLOOR DIRECTORY', 14, 22);
    for (let row = 0; row < 3; row++) {
      ctx.fillStyle = ['#d6b080', '#a7bda1', '#9db5c1'][row];
      ctx.fillRect(14, 34 + row * 24, 12, 14);
      ctx.fillStyle = '#6b7a78'; ctx.fillRect(34, 39 + row * 24, 132 - row * 22, 5);
    }
  });
  const signMat = canvasMaterial(256, 112, ctx => {
    ctx.fillStyle = '#79917a'; ctx.fillRect(0, 0, 256, 112);
    ctx.fillStyle = '#f8f9f5'; ctx.font = 'bold 33px monospace'; ctx.fillText('PIX OFFICE', 24, 47);
    ctx.font = '12px monospace'; ctx.fillText('SIX ROOMS / TWENTY-FOUR SEATS', 26, 78);
  });
  const menuMat = canvasMaterial(128, 96, ctx => {
    ctx.fillStyle = '#2f3c3b'; ctx.fillRect(0, 0, 128, 96);
    ctx.fillStyle = '#f0ead6'; ctx.font = 'bold 12px monospace'; ctx.fillText('BAR', 12, 20);
    ctx.fillStyle = '#c9a477'; for (let i = 0; i < 4; i++) ctx.fillRect(12, 32 + i * 14, 84 - i * 12, 5);
    ctx.fillStyle = '#8caa70'; ctx.fillRect(104, 14, 12, 74);
  });
  const tvMat = canvasMaterial(64, 40, ctx => {
    ctx.fillStyle = '#22313a'; ctx.fillRect(0, 0, 64, 40);
    ctx.fillStyle = '#3d5866'; ctx.fillRect(4, 4, 56, 26);
    ctx.fillStyle = '#8fb3bd'; ctx.fillRect(8, 9, 20, 3); ctx.fillRect(8, 15, 32, 3);
    ctx.fillStyle = '#c9a477'; ctx.fillRect(8, 21, 26, 3);
  }, true);
  const glassMat = new THREE.MeshStandardMaterial({ color: '#cfe3e6', transparent: true, opacity: .3, roughness: .3 });

  function mug(parent, x, y, z, color) {
    box(parent, x, y + .09, z, .16, .18, .16, color);
    box(parent, x, y + .185, z, .11, .01, .11, c.woodDark);
    box(parent, x + .11, y + .09, z, .08, .09, .07, color);
  }
  function plant(x, z, scale = 1, y = 0) {
    const g = group(office, x, y, z); g.scale.setScalar(scale);
    box(g, 0, .19, 0, .42, .38, .42, '#e6d3b8');
    box(g, 0, .4, 0, .48, .08, .48, c.white);
    box(g, 0, .46, 0, .35, .05, .35, c.woodDark);
    box(g, 0, .78, 0, .09, .65, .09, c.woodDark);
    for (const [a, b, h, s] of [[-.22, 0, .9, .42], [.22, .06, 1.16, .46], [0, -.14, 1.42, .48], [-.12, .17, 1.23, .38], [.16, -.1, .77, .32]]) {
      box(g, a, h, b, s, s * .8, s, h > 1.2 ? c.leafLight : c.leaf);
    }
  }
  function stool(id) {
    const s = ZONE[id], g = group(office, s.x, 0, s.z);
    box(g, 0, .63, 0, s.w, .07, s.w, c.wood, 'wood');
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, sx * .13, .3, sz * .13, .06, .6, .06, c.ink);
    box(g, 0, .2, 0, s.w - .12, .04, .04, c.ink);
  }

  // North rooms look onto the back windows; south rooms get a glazed end wall.
  for (const room of floorRooms) {
    if (room.side === 'north') {
      for (const x of [room.centerX - 4.6, room.centerX, room.centerX + 4.6]) {
        box(office, x, 2.05, back + .17, 2.4, 1.85, .12, c.white);
        panel(office, x, 2.05, back + .248, 2.15, 1.6, windowMat);
        box(office, x, 2.05, back + .30, .08, 1.7, .08, c.white);
        box(office, x, 2.05, back + .30, 2.2, .08, .08, c.white);
        box(office, x, 1.12, back + .35, 2.55, .12, .45, c.white);
      }
    } else {
      const z = -back - .05;
      box(office, room.centerX, .45, z, room.span[1] - room.span[0], .9, .18, c.cream);
      box(office, room.centerX, 1.65, z, room.span[1] - room.span[0], 1.5, .1, glassMat);
      box(office, room.centerX, .93, z, room.span[1] - room.span[0] + .06, .08, .26, c.wood, 'wood');
      box(office, room.centerX, 2.42, z, room.span[1] - room.span[0] + .06, .12, .26, c.cream);
      for (let x = room.span[0] + .08; x <= room.span[1]; x += 3.4) box(office, x, 1.65, z, .1, 1.5, .2, c.wood);
    }
  }

  // Walls: solid base, glazed band, rails, posts, and real door openings.
  function wallRun({ at, from, to, axis = 'x', doors = [] }) {
    const { thickness, solid: base, height: top } = wallSpec, glass = top - base;
    const place = (mid, length, y, height, depth, color, kind = 'noise') => (axis === 'x'
      ? box(office, mid, y, at, length, height, depth, color, kind)
      : box(office, at, y, mid, depth, height, length, color, kind));
    const segment = (a, b) => {
      const mid = (a + b) / 2, length = b - a;
      if (length <= .02) return;
      place(mid, length, base / 2, base, thickness, c.cream);
      place(mid, length, base + glass / 2, glass, thickness * .35, glassMat);
      place(mid, length, base + .04, .07, thickness + .06, c.wood, 'wood');
      place(mid, length, top - .06, .12, thickness + .06, c.cream);
      for (const edge of [a + .05, b - .05]) place(edge, .1, top / 2, top, thickness + .07, c.wood, 'wood');
    };
    const coord = door => (axis === 'x' ? door.x : door.z);
    let cursor = from;
    for (const door of [...doors].sort((a, b) => coord(a) - coord(b))) {
      const center = coord(door), start = center - door.width / 2, end = center + door.width / 2;
      segment(cursor, start);
      for (const edge of [start + .05, end - .05]) place(edge, .12, top / 2, top, thickness + .09, c.wood);
      place(center, door.width, top - .1, .2, thickness + .09, c.cream);
      place(center, door.width - .12, top - .32, .24, thickness * .3, glassMat);
      const length = door.width - .14, into = door.into, hinge = end - .06;
      const leaf = (y, height, depth, material) => (axis === 'x'
        ? box(office, hinge, y, at + into * (length / 2 + .06), depth, height, length, material)
        : box(office, at + into * (length / 2 + .06), y, hinge, length, height, depth, material));
      leaf(.98, 1.96, .06, glassMat);
      leaf(2.02, .12, .1, c.wood);
      leaf(.1, .16, .12, c.wood);
      if (axis === 'x') box(office, hinge, 1, at + into * (length - .04), .07, .5, .07, c.ink);
      else box(office, at + into * (length - .04), 1, hinge, .07, .5, .07, c.ink);
      if (axis === 'x') box(office, center, .02, at, door.width, .04, thickness + .04, c.woodDark, 'wood');
      else box(office, at, .02, center, thickness + .04, .04, door.width, c.woodDark, 'wood');
      cursor = end;
    }
    segment(cursor, to);
  }
  floorWallRuns.forEach(wallRun);

  // Room plates beside every door, on the corridor side.
  for (const room of floorRooms) {
    const x = room.door + 1.05;
    if (room.side === 'north') panel(office, x, 1.62, -layout.band + .12, .95, .3, plateMat(room));
    else panel(office, x, 1.62, layout.band - .12, .95, .3, plateMat(room)).rotation.y = Math.PI;
  }
  panel(office, meetingRoom.inner[1] + .13, 1.62, meetingRoom.door.z + 1.05, .95, .3, plateMat(meetingRoom)).rotation.y = Math.PI / 2;

  // Room interiors: one shared table for four, storage, a nook, a board, a plant.
  const axis = seat => ({ fx: Math.sin(seat.yaw), fz: Math.cos(seat.yaw), rx: Math.cos(seat.yaw), rz: -Math.sin(seat.yaw) });
  const at = (seat, forward, side) => {
    const { fx, fz, rx, rz } = axis(seat);
    return { x: seat.x + fx * forward + rx * side, z: seat.z + fz * forward + rz * side };
  };
  function chair(seat) {
    const g = group(office, seat.x, 0, seat.z); g.rotation.y = seat.yaw + Math.PI;
    box(g, 0, .57, 0, .74, .16, .68, c.green);
    box(g, 0, .94, .31, .74, .68, .14, c.green);
    box(g, 0, .29, 0, .09, .45, .09, c.ink);
    box(g, 0, .09, 0, .74, .08, .1, c.ink); box(g, 0, .09, 0, .1, .08, .66, c.ink);
    for (const sx of [-.33, .33]) for (const sz of [-.26, .26]) box(g, sx, .065, sz, .12, .12, .12, c.ink);
  }
  function seatItems(seat, index) {
    const monitor = at(seat, deskItems.monitor.forward, 0);
    const g = group(office, monitor.x, 0, monitor.z); g.rotation.y = seat.yaw + Math.PI;
    box(g, 0, tableSurface + .015, 0, .34, .03, .22, c.ink);
    box(g, 0, tableSurface + .195, -.09, .08, .32, .08, c.ink);
    box(g, 0, tableSurface + .485, -.04, 1, .6, .09, c.ink);
    screens.push(panel(g, 0, tableSurface + .485, deskItems.monitor.faceOffset, .92, .52, screenMat));
    const keys = deskItems.keyboard, keyboard = at(seat, keys.forward, 0), { fx, fz, rx, rz } = axis(seat);
    box(office, keyboard.x, tableSurface + keys.thickness / 2, keyboard.z, .62, keys.thickness, keys.depth, '#e6e6d9');
    for (let row = 0; row < 3; row++) for (let col = 0; col < 9; col++) {
      const side = (col - 4) * .062, forward = (row - 1) * .068;
      box(office, keyboard.x + rx * side + fx * forward, tableSurface + keys.thickness + keys.keyHeight / 2,
        keyboard.z + rz * side + fz * forward, .05, keys.keyHeight, .045, '#99a3a1');
    }
    const mouse = at(seat, deskItems.mouse.forward, deskItems.mouse.side);
    box(office, mouse.x, tableSurface + .015, mouse.z, .12, .03, .18, c.ink);
    const book = at(seat, deskItems.notebook.forward, deskItems.notebook.side);
    box(office, book.x, tableSurface + .02, book.z, .3, .04, .24, '#e6e6d9');
    box(office, book.x, tableSurface + .045, book.z, .3, .01, .05, [c.orange, c.blue, c.green][index % 3]);
    const cup = at(seat, deskItems.mug.forward, deskItems.mug.side);
    mug(office, cup.x, tableSurface, cup.z, [c.orange, c.blue, c.green][index % 3]);
    chair(seat);
  }
  function sharedTable(room) {
    const t = ZONE[`${room.id}-table`];
    box(office, t.x, tableSurface - tableThickness / 2, t.z, t.w, tableThickness, t.d, c.wood, 'wood');
    box(office, t.x, tableSurface - tableThickness - .09, t.z, t.w - .7, .07, .55, '#4a5a58');
    for (const x of [t.x - 2.1, t.x, t.x + 2.1]) for (const z of [t.z - .85, t.z + .85]) {
      box(office, x, (tableSurface - tableThickness) / 2, z, .12, tableSurface - tableThickness, .5, c.white);
    }
    for (const x of floorPlanterOffsets.map(offset => t.x + offset)) {
      box(office, x, tableSurface + .07, t.z, .5, .14, .34, '#e6d3b8');
      box(office, x, tableSurface + .185, t.z, .34, .1, .22, c.leafLight);
      box(office, x, tableSurface + .245, t.z, .18, .07, .14, c.leaf);
    }
  }
  function storage(id, room) {
    const z = ZONE[id];
    box(office, z.x, .48, z.z, z.w, .95, z.d, c.cream);
    box(office, z.x, .98, z.z, z.w + .08, .07, z.d + .08, c.wood, 'wood');
    const face = room.side === 'north' ? z.z + z.d / 2 + .01 : z.z - z.d / 2 - .01;
    for (let i = 0; i < 4; i++) {
      box(office, z.x - 2.1 + i * 1.4, .48, face, 1.3, .78, .03, '#dde0cb');
      box(office, z.x - 2.1 + i * 1.4, .6, face + (room.side === 'north' ? .03 : -.03), .34, .05, .04, c.woodDark);
    }
    for (let i = 0; i < 6; i++) {
      box(office, z.x - 2.4 + i * .95, 1.16, z.z, .34, .26 + (i % 3) * .05, .2, [c.blue, c.green, c.orange, '#a6b497', '#c27e83'][i % 5]);
    }
    box(office, z.x + 2.5, 1.12, z.z, .6, .22, .55, c.ink);
  }
  for (const room of floorRooms) {
    sharedTable(room);
    storage(`${room.id}-storage`, room);
    const nook = ZONE[`${room.id}-nook`];
    box(office, nook.x, .52, nook.z, nook.w, .08, nook.d, c.wood, 'wood');
    for (const [dx, dz] of [[-.45, -.45], [.45, -.45], [-.45, .45], [.45, .45]]) box(office, nook.x + dx, .26, nook.z + dz, .09, .52, .09, c.ink);
    mug(office, nook.x + .2, .56, nook.z - .1, c.white);
    stool(`${room.id}-stool-a`); stool(`${room.id}-stool-b`);
    plant(ZONE[`${room.id}-plant`].x, ZONE[`${room.id}-plant`].z, .85);
    const boardX = room.span[1] - .01;
    const board = group(office, boardX, 1.95, room.centerZ); board.rotation.y = -Math.PI / 2;
    box(board, 0, 0, 0, 3.2, 1.2, .1, c.wood);
    registerDisplay(displays, 'board', panel(board, 0, 0, .06, 3, 1.02, boardMat), { id: `room-tasks-${room.id}`, roomId: room.id, label: `${room.name}子任务` });
    box(board, 0, -.66, .08, 2.9, .06, .12, c.wood);
    box(board, 0, .04, .1, .5, .05, .04, c.orange);
  }
  floorSeats.forEach(seatItems);

  // Meeting room at the west end of the corridor.
  const meet = ZONE['meeting-table'];
  box(office, meet.x, .74, meet.z, meet.w, .1, meet.d, c.wood, 'wood');
  for (const x of [meet.x - (meet.w / 2 - .25), meet.x + (meet.w / 2 - .25)]) box(office, x, .36, meet.z, .12, .72, meet.d - .2, c.ink);
  box(office, meet.x, .82, meet.z, .5, .06, .34, c.white);
  mug(office, meet.x + .9, .79, meet.z - .08, c.blue);
  for (const id of Object.keys(ZONE).filter(key => key.startsWith('meeting-chair'))) {
    const s = ZONE[id], head = s.z < meet.z ? -1 : 1;
    const g = group(office, s.x, 0, s.z); g.rotation.y = head > 0 ? Math.PI : 0;
    box(g, 0, .44, 0, .46, .1, .46, '#708fa5');
    box(g, 0, .74, .2, .46, .5, .1, '#708fa5');
    for (const [sx, sz] of [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]]) box(g, sx, .19, sz, .06, .38, .06, c.ink);
  }
  for (let a = 0; a < 7; a++) for (let b = 0; b < 5; b++) {
    box(office, meet.x - 2 + a * .55, .049, meet.z - 1.2 + b * .5, .545, .015, .495, (a + b) % 2 ? '#d9c4a0' : '#dfcbaa');
  }
  const screen = group(office, left + .16, 1.95, meet.z); screen.rotation.y = Math.PI / 2;
  box(screen, 0, 0, 0, 2.4, 1.35, .12, c.ink);
  panel(screen, 0, 0, .08, 2.18, 1.14, tvMat);
  const credenza = ZONE['meeting-credenza'];
  box(office, credenza.x, .5, credenza.z, credenza.w, 1, credenza.d, c.cream);
  box(office, credenza.x, 1.03, credenza.z, credenza.w + .06, .07, credenza.d + .06, c.wood, 'wood');
  box(office, meet.x + 2.6, 1.85, meetingRoom.inner[2] + .14, 2.1, 1.1, .1, c.wood);
  registerDisplay(displays, 'board', panel(office, meet.x + 2.6, 1.85, meetingRoom.inner[2] + .20, 1.92, .92, boardMat), { id: 'tasks', label: '全部子任务' });

  // Corridor: a long runner, benches, the wall sign, a clock and a directory.
  for (let col = 0; col < 58; col++) for (let row = 0; row < 2; row++) {
    box(office, -15.7 + col * .55 + .275, .049, -.245 + row * .49, .545, .015, .48, (col + row) % 2 ? '#d7c8ad' : '#ddcfb6');
  }
  const sign = group(office, -4.5, 1.7, -layout.band + .1);
  box(sign, 0, 0, 0, 2.7, 1.3, .14, c.wood);
  registerDisplay(displays, 'topic', panel(sign, 0, 0, .08, 2.5, 1.12, signMat), { id: 'mission', label: '任务主题' });
  const clock = group(office, 4.5, 1.95, -layout.band + .11);
  box(clock, 0, 0, 0, .62, .62, .12, c.woodDark); box(clock, 0, 0, .08, .51, .51, .05, c.white);
  box(clock, 0, .09, .12, .04, .2, .02, c.ink); box(clock, .09, 0, .12, .2, .04, .02, c.ink);
  const directory = group(office, -4.5, 1.75, layout.band - .1); directory.rotation.y = Math.PI;
  box(directory, 0, 0, 0, 2.4, 1.4, .1, c.wood);
  panel(directory, 0, 0, .06, 2.22, 1.22, directoryMat);
  for (const id of ['corridor-bench-a', 'corridor-bench-b']) {
    const b = ZONE[id];
    box(office, b.x, .44, b.z, b.w, .1, b.d, c.wood, 'wood');
    for (const dx of [-b.w / 2 + .2, b.w / 2 - .2]) box(office, b.x + dx, .22, b.z, .1, .44, b.d - .16, c.ink);
  }

  // Break area: bar with stools, lockers and plants at the east end.
  const bar = ZONE['pantry-bar'], barBack = ZONE['pantry-back'];
  box(office, bar.x, .53, bar.z, bar.w, 1.02, bar.d, c.cream);
  box(office, bar.x, 1.08, bar.z, bar.w + .16, .12, bar.d + .14, c.wood, 'wood');
  for (const z of [-1.4, 0, 1.4]) {
    box(office, bar.x - bar.w / 2 - .02, .52, z, .03, .84, 1.3, '#dde0cb');
    box(office, bar.x - bar.w / 2 - .05, .72, z, .06, .05, .18, c.woodDark);
  }
  box(office, bar.x, 1.16, bar.z - 1.2, .5, .04, .62, '#c3cfcb');
  box(office, bar.x - .35, 1.32, bar.z - .9, .06, .32, .06, '#9fb0ad');
  box(office, bar.x - .31, 1.42, bar.z - .85, .3, .05, .05, '#9fb0ad');
  box(office, bar.x + .05, 1.45, bar.z + .5, .56, .62, .5, c.ink);
  box(office, bar.x - .36, 1.48, bar.z + .5, .03, .3, .34, '#657671');
  mug(office, bar.x - .3, 1.14, bar.z - .3, c.white);
  mug(office, bar.x - .3, 1.14, bar.z + 1.1, c.orange);
  box(office, barBack.x, 1, barBack.z, barBack.w, 2, barBack.d, c.cream);
  box(office, barBack.x, 2.03, barBack.z, barBack.w + .08, .08, barBack.d + .08, c.wood, 'wood');
  for (let i = 0; i < 3; i++) box(office, barBack.x, .45 + i * .5, barBack.z, barBack.w + .06, .05, barBack.d - .16, '#dde0cb');
  for (let i = 0; i < 6; i++) box(office, barBack.x - .02, .62 + (i % 3) * .5, barBack.z - 1.6 + i * .65, .2, .3, .24, [c.blue, c.green, c.orange, c.woodDark][i % 4]);
  panel(office, barBack.x - barBack.w / 2 - .04, 1.62, barBack.z, 1.8, .8, menuMat).rotation.y = -Math.PI / 2;
  for (const id of Object.keys(ZONE).filter(key => key.startsWith('pantry-stool'))) stool(id);
  const lockers = ZONE['pantry-lockers'];
  box(office, lockers.x, .9, lockers.z, lockers.w, 1.8, lockers.d, c.cream);
  box(office, lockers.x, 1.83, lockers.z, lockers.w + .1, .07, lockers.d + .1, c.wood, 'wood');
  for (let col = 0; col < 4; col++) for (let row = 0; row < 2; row++) {
    const x = lockers.x - lockers.w / 2 + .36 + col * .64, y = .52 + row * .82;
    box(office, x, y, lockers.z - lockers.d / 2 - .015, .56, .74, .03, '#dde0cb');
    box(office, x + .18, y, lockers.z - lockers.d / 2 - .04, .05, .13, .04, c.woodDark);
  }
  for (const id of Object.keys(ZONE).filter(key => key.startsWith('plant-'))) {
    plant(ZONE[id].x, ZONE[id].z, .9);
  }

  batchStaticBoxes(office);
  registerComputers(displays, screens, layout);
  return { office, obstacles, seats: layout.seats, stations: layout.seats, screens, displays };
}
