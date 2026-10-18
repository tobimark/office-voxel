import { box, group, panel, canvasMaterial, palette as c } from '../materials/art.js';

// All additions attach to an existing joint, so hair, hats and clothing follow
// the same character animations without another skeleton or external assets.
export function addHair(head, config) {
  const h = group(head); h.name = `hair:${config.hairStyle}`;
  const hair = (x, y, z, w, height, d) => box(h, x, y, z, w, height, d, config.hair);
  hair(0, .49, 0, .57, .13, .53);
  const standardFringe = () => {
    hair(-.19, .38, .264, .18, .18, .04);
    hair(.04, .42, .264, .29, .1, .04);
  };
  switch (config.hairStyle) {
    case 'shoulder-bob':
      // Centre part, a closed back and inward-stepped ends at the shoulders.
      hair(-.15, .41, .268, .24, .15, .045);
      hair(.16, .44, .268, .22, .09, .045);
      hair(0, .15, -.25, .56, .54, .12);
      for (const side of [-1, 1]) {
        hair(side * .285, .17, -.045, .10, .54, .44);
        hair(side * .26, -.08, -.045, .13, .12, .43);
      }
      break;
    case 'bob':
      standardFringe();
      hair(-.27, .22, -.07, .09, .47, .43); hair(.27, .22, -.07, .09, .47, .43);
      hair(.32, .30, -.17, .17, .18, .2); break;
    case 'spiky':
      standardFringe(); hair(-.15, .59, -.08, .21, .14, .3); hair(.1, .56, -.04, .19, .10, .36); break;
    case 'bun':
      standardFringe(); hair(0, .52, -.30, .30, .27, .24);
      box(h, 0, .45, -.43, .20, .08, .025, config.trim); break;
    case 'asymmetric':
      hair(-.22, .20, -.05, .16, .48, .46); hair(.26, .29, -.09, .11, .30, .43);
      hair(-.13, .39, .27, .32, .20, .055); hair(.10, .45, .27, .18, .08, .055);
      hair(-.05, .19, -.27, .48, .45, .1); break;
    case 'curly':
      for (const [x, y, z, s] of [[-.22, .53, .04, .28], [.07, .60, .08, .31], [.27, .50, -.04, .26], [-.13, .57, -.25, .30], [.16, .56, -.23, .28], [-.27, .27, -.13, .19]]) hair(x, y, z, s, s * .8, s);
      hair(-.16, .39, .27, .24, .16, .08); break;
    case 'ponytail': {
      hair(0, .43, .26, .55, .09, .04);
      const tail = group(h, 0, .40, -.31); tail.rotation.x = -.20;
      box(tail, 0, -.19, -.08, .23, .55, .24, config.hair);
      box(tail, 0, -.50, -.09, .17, .18, .2, config.hair);
      box(h, 0, .39, -.34, .27, .09, .1, config.shirt);
      break;
    }
    case 'undercut':
      hair(.05, .54, -.02, .46, .16, .45); hair(.17, .42, .27, .23, .1, .05);
      box(h, -.279, .31, -.05, .018, .15, .35, '#697079'); break;
    case 'braid':
      hair(-.22, .39, .26, .18, .19, .05); hair(.10, .44, .26, .33, .08, .05);
      hair(.27, .19, -.01, .13, .41, .39);
      for (let i = 0; i < 4; i++) hair(-.32 + i % 2 * .035, .17 - i * .13, .01, .16, .16, .18);
      box(h, -.285, -.27, .01, .16, .06, .19, config.trim); break;
    case 'locs':
      for (let i = 0; i < 4; i++) hair(-.21 + i * .14, .55 + i % 2 * .04, -.04, .12, .16, .48);
      hair(0, .31, -.32, .26, .54, .23); hair(.07, -.02, -.36, .18, .18, .19);
      box(h, 0, .36, -.45, .28, .08, .04, config.trim); break;
    case 'pixie':
      hair(-.10, .56, .03, .41, .19, .46); hair(-.20, .37, .27, .18, .20, .05);
      hair(.02, .43, .27, .30, .09, .05); hair(.27, .34, -.02, .08, .17, .42); break;
    case 'sidepart':
      hair(-.13, .57, -.01, .34, .14, .5); hair(.19, .51, 0, .15, .08, .5);
      hair(-.12, .40, .27, .33, .16, .05); hair(-.26, .29, -.05, .08, .32, .42);
      box(h, .08, .55, 0, .025, .06, .49, '#7b8587'); break;
    case 'shaggy':
      hair(-.22, .21, -.05, .13, .41, .44); hair(.24, .23, -.05, .11, .35, .44);
      hair(-.17, .35, .27, .15, .16, .06); hair(.04, .39, .27, .21, .12, .06);
      hair(0, .12, -.27, .51, .25, .11); break;
    default: standardFringe();
  }
}

export function addHeadAccessory(head, config) {
  const g = group(head); g.name = `accessory:${config.accessory || 'none'}`;
  switch (config.accessory) {
    case 'hairclip':
      box(g, .275, .34, .20, .035, .07, .20, '#f4dca2');
      box(g, .292, .34, .21, .015, .025, .12, '#eaad66'); break;
    case 'headphones':
      box(g, 0, .70, -.02, .65, .08, .11, '#314655');
      for (const side of [-1, 1]) {
        box(g, side * .33, .51, -.02, .06, .37, .1, '#314655');
        box(g, side * .35, .27, -.02, .14, .25, .26, '#314655');
        box(g, side * .425, .27, -.02, .018, .14, .15, '#b8c8aa');
      }
      break;
    case 'cap': {
      const cap = group(g, 0, .51, 0); cap.rotation.z = -.06;
      box(cap, 0, .10, 0, .63, .25, .56, '#344f65');
      box(cap, 0, -.005, .32, .65, .06, .28, '#344f65');
      box(cap, 0, .11, .287, .14, .13, .025, config.trim);
      box(cap, 0, .245, 0, .08, .05, .08, config.trim); break;
    }
    case 'beret': {
      const hat = group(g, -.025, .53, -.015); hat.rotation.z = .13;
      box(hat, 0, .02, 0, .58, .09, .54, '#85677d');
      box(hat, -.055, .10, -.01, .72, .15, .61, '#85677d');
      box(hat, -.03, .21, -.02, .08, .09, .08, '#85677d'); break;
    }
    case 'bow':
      box(g, .31, .43, .03, .06, .09, .12, '#efdca5');
      box(g, .33, .48, -.06, .10, .16, .15, '#f4e7c5');
      box(g, .33, .38, .12, .10, .16, .15, '#f4e7c5'); break;
    case 'beanie':
      box(g, 0, .57, -.015, .64, .24, .59, '#d28b4e');
      box(g, 0, .45, 0, .67, .10, .62, '#e2aa69');
      box(g, 0, .72, -.02, .50, .10, .48, '#d28b4e');
      box(g, .19, .45, .32, .10, .09, .02, '#f2dfb0'); break;
  }
}

export function addOutfit(torso, config) {
  const g = group(torso); g.name = `outfit:${config.outfit}`;
  const add = (x, y, z, w, h, d, color = config.trim) => box(g, x, y, z, w, h, d, color);
  switch (config.outfit) {
    case 'dress':
      add(0, .055, 0, .55, .13, .34, config.shirt);
      add(0, .11, .177, .53, .035, .025, '#34333b');
      break;
    case 'utility':
      for (const side of [-1, 1]) { add(side * .18, .20, .18, .13, .17, .04, '#b66137'); add(side * .10, .51, .18, .12, .13, .04); }
      add(0, .31, .18, .035, .42, .03); add(0, .36, -.17, .4, .07, .025); break;
    case 'hoodie':
      add(0, .45, -.20, .45, .32, .18, '#4a725f'); add(0, .18, .18, .35, .16, .05, '#507961');
      for (const side of [-1, 1]) add(side * .10, .43, .19, .025, .17, .025);
      add(0, .08, -.17, .50, .07, .025); break;
    case 'blazer':
      add(0, .34, .17, .20, .41, .025);
      for (const side of [-1, 1]) {
        const lapel = add(side * .12, .43, .19, .09, .25, .04, '#8ea6bc'); lapel.rotation.z = side * .24;
      }
      add(.16, .31, .20, .14, .15, .035, '#f3edda');
      add(.16, .37, .225, .11, .025, .015, '#cf9a55');
      add(.16, .28, .225, .08, .025, .015, '#718a93');
      add(0, .50, -.17, .25, .05, .03, '#8ea6bc'); break;
    case 'varsity':
      add(0, .28, .18, .055, .42, .03); add(0, .07, .18, .52, .09, .03);
      add(-.15, .36, .19, .13, .15, .03); add(-.15, .36, .21, .05, .08, .015, config.shirt);
      add(0, .35, -.17, .30, .26, .025, '#f0e5c9');
      add(0, .35, -.19, .13, .13, .02, config.shirt); break;
    case 'apron':
      add(0, .25, .19, .41, .48, .05, '#839664');
      for (const side of [-1, 1]) {
        add(side * .15, .47, .19, .055, .18, .035, '#839664');
        const strap = add(side * .08, .35, -.18, .055, .42, .035, '#839664'); strap.rotation.z = side * -.35;
      }
      add(0, .15, .225, .26, .12, .03, '#a5b584');
      add(-.08, .20, .25, .035, .06, .015, '#dba575'); add(.055, .13, .25, .07, .03, .015, '#a5c1c9'); break;
    case 'plaid': {
      const plaid = canvasMaterial(32, 32, ctx => {
        ctx.fillStyle = config.shirt; ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#bdd0b3';
        for (let i = 4; i < 32; i += 12) { ctx.fillRect(i, 0, 3, 32); ctx.fillRect(0, i, 32, 3); }
        ctx.fillStyle = '#35585e'; for (let i = 2; i < 32; i += 12) { ctx.fillRect(i, 0, 1, 32); ctx.fillRect(0, i, 32, 1); }
      });
      panel(g, 0, .30, .177, .52, .49, plaid);
      const back = panel(g, 0, .30, -.177, .52, .49, plaid); back.rotation.y = Math.PI;
      add(0, .30, .19, .045, .48, .03, '#d0c8a3'); break;
    }
    case 'overalls':
      add(0, .21, .185, .40, .35, .04, config.pants); add(0, .19, -.18, .42, .30, .04, config.pants);
      for (const side of [-1, 1]) {
        add(side * .16, .42, .19, .065, .29, .04, config.pants); add(side * .16, .42, -.18, .065, .29, .04, config.pants);
        add(side * .16, .39, .218, .04, .04, .02, '#c7984b');
      }
      add(0, .25, .22, .20, .13, .03, '#f4e8d1'); break;
    case 'vest':
      for (const side of [-1, 1]) add(side * .16, .28, .19, .20, .44, .05, '#78758f');
      add(0, .29, -.18, .53, .48, .04, '#78758f'); add(0, .32, .19, .045, .36, .03, '#474e62');
      add(-.16, .35, .225, .12, .10, .025, '#5d6079'); add(-.17, .42, .25, .025, .13, .02, '#e7b56d'); break;
    case 'cardigan':
      add(0, .29, .18, .17, .45, .025, '#f2e6c9');
      for (const side of [-1, 1]) add(side * .18, .15, .19, .12, .12, .035, '#a98543');
      add(0, .52, .02, .42, .12, .45, '#577c73');
      add(-.13, .32, .23, .13, .38, .065, '#577c73');
      add(-.13, .16, .267, .13, .045, .018, '#c8cfad');
      add(.12, .39, -.23, .12, .24, .06, '#577c73'); break;
  }
  if (config.accessory === 'scarf') {
    const scarf = group(g); scarf.name = 'accessory:scarf';
    box(scarf, 0, .54, .015, .48, .16, .42, config.trim);
    box(scarf, -.115, .435, .235, .17, .16, .09, config.trim);
    const tail = box(scarf, -.12, .27, .225, .14, .34, .07, config.trim);
    tail.rotation.z = -.08;
    box(scarf, -.132, .105, .267, .14, .045, .02, '#eb5654');
    box(scarf, .12, .39, -.22, .12, .22, .06, config.trim);
  }
}

export function decorateLeg(thigh, config) {
  if (config.outfit !== 'dress') return;
  // Two overlapping panels share the leg joints: the hem follows walking and
  // folds onto the lap while seated instead of hanging through the chair.
  const skirt = group(thigh); skirt.name = 'outfit:dress-skirt';
  box(skirt, 0, -.115, 0, .30, .34, .36, config.shirt);
  box(skirt, 0, -.265, .005, .32, .07, .39, config.shirt);
}

export function decorateArm(elbow, config, side) {
  if (config.outfit === 'hoodie' || config.outfit === 'cardigan' || config.outfit === 'blazer' || config.outfit === 'varsity' || config.outfit === 'vest') {
    box(elbow, 0, -.075, 0, .18, .18, .215, config.outfit === 'varsity' ? config.trim : config.shirt);
    if (config.outfit === 'hoodie' || config.outfit === 'varsity') box(elbow, 0, -.16, 0, .19, .05, .22, config.trim);
  }
  if (config.accessory === 'watch' && side === -1) {
    box(elbow, 0, -.17, 0, .19, .065, .22, '#3c4a45');
    box(elbow, -.107, -.17, .01, .04, .09, .13, '#cdbb85');
  }
}

// A matching pixel portrait helps identify the same character in the selector.
export function drawPortrait(canvas, config) {
  canvas.width = 36; canvas.height = 40;
  const ctx = canvas.getContext('2d');
  const fill = (color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  fill(config.shirt, 4, 29, 28, 11);
  if (config.outfit === 'vest' || config.outfit === 'apron' || config.outfit === 'overalls') fill(config.outfit === 'vest' ? '#78758f' : config.outfit === 'apron' ? '#839664' : config.pants, 9, 28, 18, 12);
  if (config.outfit === 'blazer' || config.outfit === 'cardigan') fill(config.trim, 15, 29, 6, 11);
  if (config.outfit === 'varsity') { fill(config.trim, 4, 29, 5, 11); fill(config.trim, 27, 29, 5, 11); }
  if (config.outfit === 'plaid') for (const x of [8, 16, 24]) fill(config.trim, x, 29, 2, 11);
  if (config.outfit === 'cardigan') { fill('#577c73', 10, 28, 16, 4); fill('#577c73', 11, 30, 4, 10); }
  fill(config.hair, 6, 5, 25, 24); fill(config.skin || c.skin, 9, 10, 19, 18);
  fill(config.hair, 7, 5, 23, 7);
  if (['asymmetric', 'sidepart', 'pixie', 'braid'].includes(config.hairStyle)) fill(config.hair, 7, 10, 8, 9);
  if (config.hairStyle === 'asymmetric') fill(config.hair, 6, 15, 4, 14);
  if (config.hairStyle === 'curly') { fill(config.hair, 3, 5, 9, 9); fill(config.hair, 10, 1, 11, 10); fill(config.hair, 23, 3, 10, 11); }
  if (config.hairStyle === 'ponytail') fill(config.hair, 27, 13, 6, 20);
  if (config.hairStyle === 'braid') for (let i = 0; i < 4; i++) fill(config.hair, 4 + i % 2, 20 + i * 4, 5, 5);
  if (config.hairStyle === 'locs') { for (const x of [7, 13, 19, 25]) fill(config.hair, x, 2, 4, 8); fill(config.hair, 28, 17, 5, 15); }
  if (config.hairStyle === 'shoulder-bob') {
    fill(config.hair, 5, 12, 5, 19); fill(config.hair, 27, 12, 5, 19);
    fill(config.hair, 7, 10, 9, 4); fill(config.hair, 22, 10, 7, 2);
    fill(config.hair, 7, 29, 4, 3); fill(config.hair, 26, 29, 4, 3);
  }
  if (config.accessory === 'scarf') {
    fill(config.trim, 10, 28, 17, 4); fill(config.trim, 11, 31, 6, 9);
    fill('#eb5654', 11, 38, 6, 2);
  }
  const eyeH = ['narrow', 'relaxed'].includes(config.eyes) ? 2 : 4;
  fill(c.ink, 13, 17, 3, eyeH); fill(c.ink, 23, 17, 3, eyeH); fill('#995940', 18, 25, 4, 1);
  if (config.freckles) { fill('#b87f59', 11, 23, 1, 1); fill('#b87f59', 26, 23, 1, 1); }
  if (config.beard) { fill(config.hair, 12, 25, 14, 3); fill('#b77f58', 17, 25, 5, 1); }
  if (config.glasses) { ctx.strokeStyle = c.ink; ctx.lineWidth = config.glasses === 'heavy' ? 2 : 1;ctx.strokeRect(10.5, 15.5, 7, 7);ctx.strokeRect(20.5, 15.5, 7, 7); fill(c.ink, 18, 18, 3, 1); }
  switch (config.accessory) {
    case 'hairclip': fill('#f4dca2', 28, 13, 3, 2); break;
    case 'headphones': fill('#314655', 3, 5, 30, 3);fill('#314655', 2, 13, 5, 11);fill('#314655', 29, 13, 5, 11);break;
    case 'cap': fill('#344f65', 5, 3, 26, 10);fill('#344f65', 6, 11, 28, 3);fill(config.trim, 17, 6, 4, 4);break;
    case 'beret': fill('#85677d', 3, 3, 30, 7);fill('#85677d', 7, 1, 23, 6);fill('#85677d', 16, 0, 2, 3);break;
    case 'bow':fill('#f4e7c5', 29, 9, 5, 4);fill('#f4e7c5', 29, 15, 5, 4);fill('#efdca5', 30, 13, 3, 2);break;
    case 'beanie':fill('#d28b4e', 5, 2, 26, 10);fill('#e2aa69', 4, 10, 28, 4);fill('#f2dfb0', 25, 10, 3, 4);break;
  }
}
