import { box, group, panel, canvasMaterial, batchStaticBoxes, palette as c } from './art.js';
import { smallOffice, workstationObstacles } from './layouts.js';
import { registerDisplay, registerComputers } from './shared/display-surface.js';
import { monitorPlacement } from './shared/workstation.js';

export function createOffice(scene, layout = smallOffice) {
  const office = group(scene), obstacles = [], screens = [], displays = [];
  const team = layout.capacity === 9;
  const halfWidth = layout.width / 2, halfDepth = layout.depth / 2;
  const back = -halfDepth + .05, left = -halfWidth + .05;
  const block = (x, z, w, d) => obstacles.push({ x, z, w, d });
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
  // Open dollhouse shell: two walls, front and right open for inspection.
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
    ctx.fillStyle = '#c4d8cc';ctx.fillRect(2, 34, 64, 6);
  }, true);
  for (const x of (team ? [-7.5, -3.9, -.3, 3.3] : [-3.85, -.65])) {
    box(office, x, 2.05, back + .17, 2.75, 1.85, .12, c.white);
    panel(office, x, 2.05, back + .248, 2.5, 1.6, windowMat);
    box(office, x, 2.05, back + .30, .08, 1.7, .08, c.white);
    box(office, x, 2.05, back + .30, 2.55, .08, .08, c.white);
    box(office, x, 1.12, back + .35, 2.9, .12, .45, c.white);
  }
  const sign = canvasMaterial(256, 112, ctx => {
    ctx.fillStyle = '#79917a'; ctx.fillRect(0, 0, 256, 112);
    ctx.fillStyle = '#f8f9f5'; ctx.font = 'bold 33px monospace'; ctx.fillText('PIX OFFICE', 24, 47);
    ctx.font = '12px monospace'; ctx.fillText(team ? 'NINE PEOPLE. ONE TEAM.' : 'MAKE SPACE FOR IDEAS.', 26, 78);
  });
  const signX = team ? 7.35 : 3.65;
  box(office, signX, 2.35, back + .20, 2.8, 1.3, .16, c.wood);
  registerDisplay(displays, 'topic', panel(office, signX, 2.35, back + .292, 2.62, 1.13, sign), { id: 'mission', label: '任务主题' });

  function plant(x, z, scale = 1, y = 0) {
    const g = group(office, x, y, z); g.scale.setScalar(scale);
    box(g, 0, .19, 0, .42, .38, .42, '#e6d3b8');
    box(g, 0, .4, 0, .48, .08, .48, c.white);
    box(g, 0, .46, 0, .35, .05, .35, c.woodDark);
    box(g, 0, .78, 0, .09, .65, .09, c.woodDark);
    for (const [a, b, h, s] of [[-.22, 0, .9, .42], [.22, .06, 1.16, .46], [0, -.14, 1.42, .48], [-.12, .17, 1.23, .38], [.16, -.1, .77, .32]]) {
      box(g, a, h, b, s, s * .8, s, h > 1.2 ? c.leafLight : c.leaf);
    }
    if (!y) block(x, z, .6 * scale, .6 * scale);
  }
  function mug(parent, x, y, z, color) {
    box(parent, x, y + .09, z, .16, .18, .16, color);
    box(parent, x, y + .185, z, .11, .01, .11, c.woodDark);
    box(parent, x + .11, y + .09, z, .08, .09, .07, color);
  }
  function chair(x, z) {
    const g = group(office, x, 0, z);
    box(g, 0, .57, 0, .74, .16, .68, c.green);
    box(g, 0, .94, .31, .74, .68, .14, c.green);
    box(g, 0, .29, 0, .09, .45, .09, c.ink);
    box(g, 0, .09, 0, .74, .08, .1, c.ink); box(g, 0, .09, 0, .1, .08, .66, c.ink);
    for (const x of [-.33, .33]) for (const z of [-.26, .26]) box(g, x, .065, z, .12, .12, .12, c.ink);
    // Chairs are part of a workstation reserved zone during navigation.
  }
  const screenMat = canvasMaterial(64, 40, ctx => {
    ctx.fillStyle = '#293e40'; ctx.fillRect(0, 0, 64, 40);
    ctx.fillStyle = '#52666a'; ctx.fillRect(0, 0, 64, 5); ctx.fillRect(0, 7, 12, 33);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = ['#e2bd8b', '#9ec5b5', '#839fac'][i % 3];
      ctx.fillRect(16 + i % 2 * 5, 10 + i * 4, 13 + (i * 7) % 25, 2);
    }
  }, true);
  const stations = layout.stations;
  stations.forEach((p, i) => {
    const g = group(office, p.x, 0, p.z);
    box(g, 0, 1.10, 0, 2.55, .15, 1.28, c.wood, 'wood');
    for (const x of [-1.05, 1.05]) {
      box(g, x, .54, 0, .11, 1.02, 1, c.white);
      box(g, x, .05, 0, .35, .09, 1.15, c.white);
    }
    const screenZ = 1.18 - monitorPlacement.screenDistance;
    box(g, 0, 1.23, screenZ, .5, .07, .32, c.ink);
    box(g, 0, 1.43, screenZ - .08, .09, .40, .09, c.ink);
    box(g, 0, 1.70, screenZ - .06, 1.05, .65, .10, c.ink);
    screens.push(panel(g, 0, 1.70, screenZ, .94, .53, screenMat));
    box(g, -.05, 1.21, .30, .72, .045, .25, '#e6e6d9');
    for (let row = 0; row < 3; row++) for (let col = 0; col < 9; col++) box(g, -.35 + col * .073, 1.239, .22 + row * .07, .052, .013, .04, '#99a3a1');
    box(g, .6, 1.19, .25, .36, .02, .4, c.green);
    box(g, .6, 1.23, .25, .12, .06, .19, c.white);
    mug(g, -.92, 1.18, .22, [c.orange, c.blue, c.green][i % 3]);
    box(g, .9, 1.22, -.23, .35, .10, .4, [c.blue, c.orange, c.green][i % 3]);
    box(g, .9, 1.28, -.20, .32, .03, .34, c.white);
    chair(p.x, p.z + 1.18);
  });
  obstacles.push(...workstationObstacles(stations));
  // Lounge with block cushions and a small table.
  const loungeX = team ? -8.35 : -4.48;
  const loungeZ = team ? 1.6 : 1.62;
  const sofa = group(office, loungeX, 0, loungeZ);
  box(sofa, -.48, .72, 0, .25, 1.1, 2.55, c.green);
  box(sofa, .02, .38, 0, 1.05, .3, 2.55, c.green);
  for (const z of [-.75, 0, .75]) box(sofa, .06, .59, z, .9, .20, .70, '#a6b497');
  for (const z of [-1.25, 1.25]) box(sofa, .04, .69, z, 1.1, .65, .2, c.green);
  for (const z of [-1, 1]) box(sofa, -.05, .12, z, .8, .2, .16, c.woodDark);
  box(sofa, -.22, .91, -.7, .22, .45, .5, '#e2bd8b');
  block(loungeX, loungeZ, 1.2, 2.75);
  const tableX = team ? -6.8 : -2.85;
  box(office, tableX, .62, 1.5, 1.15, .12, 1.75, c.wood, 'wood');
  for (const x of [tableX - .4, tableX + .4]) for (const z of [.9, 2.1]) box(office, x, .3, z, .09, .6, .09, c.ink);
  box(office, tableX + .05, .72, 1.35, .45, .08, .58, c.blue);
  box(office, tableX, .78, 1.4, .45, .04, .58, c.white);
  mug(office, tableX + .05, .69, 1.95, c.orange); block(tableX, 1.5, 1.15, 1.75);
  // Rug, gridded in woven pixel patches.
  const rugX = team ? -9 : -.3;
  for (let a = 0; a < 7; a++) for (let b = 0; b < 8; b++) box(office, rugX + a * .55, .049, .55 + b * .35, .545, .015, .345, (a + b) % 2 ? '#d9c4a0' : '#dfcbaa');
  // Side cabinet, coffee machine, books, pinboard.
  const coffeeX = team ? 8.25 : 4.65;
  box(office, coffeeX, .53, 2.05, 1.1, 1.02, 2.65, c.cream);
  box(office, coffeeX, 1.08, 2.05, 1.2, .12, 2.75, c.wood, 'wood');
  for (const z of [1.25, 2.05, 2.85]) {
    box(office, coffeeX - .565, .52, z, .03, .86, .76, '#dde0cb');
    box(office, coffeeX - .6, .72, z, .06, .05, .18, c.woodDark);
  }
  box(office, coffeeX - .03, 1.45, 1.35, .62, .65, .6, c.ink);
  box(office, coffeeX - .36, 1.48, 1.35, .03, .32, .42, '#657671');
  box(office, coffeeX - .39, 1.27, 1.35, .16, .05, .44, c.ink);
  mug(office, coffeeX - .45, 1.29, 1.35, c.white);
  plant(coffeeX, 2.8, .55, 1.15);
  block(coffeeX, 2.05, 1.25, 2.75);
  plant(-halfWidth + .85, -halfDepth + .9, .9); plant(halfWidth - .85, -halfDepth + 1, 1.1); plant(-halfWidth + 1, halfDepth - .95, .7);
  const board = group(office, left + .16, 2.15, .1); board.rotation.y = Math.PI / 2;
  box(board, 0, 0, 0, 2.45, 1.35, .1, c.wood);
  box(board, 0, 0, .06, 2.27, 1.17, .05, '#c5ae8b');
  if (!team) registerDisplay(displays, 'board', panel(board, 0, 0, .105, 2.27, 1.17, sign), { id: 'tasks', label: '全部子任务' });
  const clock = group(office, left + .17, 2.7, team ? 4.5 : 2.7); clock.rotation.y = Math.PI / 2;
  box(clock, 0, 0, 0, .65, .65, .12, c.woodDark); box(clock, 0, 0, .08, .54, .54, .05, c.white);
  box(clock, 0, .09, .12, .04, .21, .02, c.ink);box(clock, .09, 0, .12, .21, .04, .02, c.ink);
  if (team) {
    // A team board, low storage and planting break up the larger side aisles.
    const boardMat = canvasMaterial(192, 112, ctx => {
      ctx.fillStyle = '#edf0df'; ctx.fillRect(0, 0, 192, 112);
      ctx.fillStyle = '#526568'; ctx.font = 'bold 15px monospace'; ctx.fillText('TEAM / WEEKLY', 16, 25);
      for (let col = 0; col < 3; col++) {
        ctx.fillStyle = '#c4cbb8'; ctx.fillRect(16 + col * 57, 36, 47, 2);
        for (let row = 0; row < 2; row++) { ctx.fillStyle = ['#d6b080', '#a7bda1', '#9db5c1'][col]; ctx.fillRect(19 + col * 57, 47 + row * 25, 38, 18); }
      }
    });
    const teamBoard = group(office, -9.77, 2, -4.3); teamBoard.rotation.y = Math.PI / 2;
    box(teamBoard, 0, 0, 0, 3.2, 1.9, .12, c.wood);
    registerDisplay(displays, 'board', panel(teamBoard, 0, 0, .075, 3, 1.7, boardMat), { id: 'tasks', label: '全部子任务' });
    box(office, 8.25, .5, -3.4, 1.2, 1, 2.8, c.cream);
    box(office, 8.25, 1.06, -3.4, 1.3, .12, 2.9, c.wood, 'wood');
    for (let i = 0; i < 6; i++) box(office, 8.2, 1.25 + (i % 2) * .05, -4.4 + i * .4, .7, .3 + i % 2 * .1, .22, [c.blue, c.green, c.orange][i % 3]);
    plant(8.25, -2.5, .55, 1.12);
    block(8.25, -3.4, 1.3, 2.9);
    plant(-8.4, 5.2, 1.1); plant(8.25, 6.4, .9);
  }
  batchStaticBoxes(office);
  registerComputers(displays, screens, layout);
  return { office, obstacles, seats: layout.seats, stations, screens, displays };
}
