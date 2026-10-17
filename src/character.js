import * as THREE from 'three';
import { box, group, panel, palette as c } from './art.js';
import { addHair, addHeadAccessory, addOutfit, decorateArm } from './appearance.js';

const damp = (a, b, dt) => THREE.MathUtils.damp(a, b, 11, dt);
export function createCharacter(scene, config) {
  const skin = config.skin || c.skin;
  const root = group(scene);
  root.position.set(config.x, 0, config.z);
  const body = group(root);
  body.scale.set(config.build || 1, config.height || 1, config.build || 1);
  const hips = group(body, 0, .78, 0);
  box(hips, 0, 0, 0, .48, .18, .29, config.pants);
  const torso = group(hips);
  box(torso, 0, .30, 0, .53, .53, .31, config.shirt);
  box(torso, 0, .54, .02, .21, .09, .23, skin);
  if (config.outfit) addOutfit(torso, config);
  else {
    // Keep the original three-person page's clothing intact.
    box(torso, 0, .065, .166, .52, .05, .025, config.trim);
    box(torso, 0, .34, .17, .035, .32, .025, config.trim);
    box(torso, -.15, .36, .17, .12, .12, .025, config.trim);
  }
  const head = group(torso, 0, .58, 0);
  box(head, 0, .245, 0, .55, .53, .49, config.hair);
  box(head, 0, .20, .05, .53, .43, .44, skin);
  box(head, -.29, .18, .025, .065, .14, .15, skin);
  box(head, .29, .18, .025, .065, .14, .15, skin);
  addHair(head, config);
  addHeadAccessory(head, config);
  if (config.outfit) {
    const nose = new THREE.Color(skin).multiplyScalar(.92);
    box(head, 0, .20, .292, .045, .045, .035, `#${nose.getHexString()}`);
    if (config.glasses) for (const side of [-1, 1]) box(head, side * .28, .265, .12, .025, .035, .29, '#46515a');
  }
  const faceCanvas = document.createElement('canvas'); faceCanvas.width = faceCanvas.height = 32;
  const faceTexture = new THREE.CanvasTexture(faceCanvas);
  faceTexture.colorSpace = THREE.SRGBColorSpace;
  faceTexture.magFilter = faceTexture.minFilter = THREE.NearestFilter;
  const faceMaterial = new THREE.MeshStandardMaterial({ map: faceTexture, transparent: true, roughness: 1 });
  panel(head, 0, .225, .276, .52, .43, faceMaterial);
  function arm(side) {
    const shoulder = group(torso, side * .345, .49, 0);
    box(shoulder, 0, -.12, 0, .19, .28, .24, config.outfit === 'varsity' ? config.trim : config.shirt);
    const elbow = group(shoulder, 0, -.27, 0);
    box(elbow, 0, -.105, 0, .17, .24, .20, skin);
    box(elbow, 0, -.24, .015, .19, .09, .22, skin);
    decorateArm(elbow, config, side);
    return { shoulder, elbow };
  }
  function leg(side) {
    const thigh = group(hips, side * .145, -.06, 0);
    box(thigh, 0, -.15, 0, .21, .33, .26, config.pants);
    const knee = group(thigh, 0, -.32, 0);
    box(knee, 0, -.14, 0, .20, .31, .24, config.pants);
    box(knee, 0, -.30, .055, .23, .13, .36, config.shoes || '#f0eedf');
    box(knee, 0, -.35, .055, .24, .04, .37, '#64716d');
    return { thigh, knee };
  }
  const left = arm(-1), right = arm(1), legL = leg(-1), legR = leg(1);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.41, .46, 48), new THREE.MeshBasicMaterial({ color: c.orange, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .062; root.add(ring);
  const actor = {
    root, body, hips, head, torso, left, right, legL, legR, ring, config,
    action: 'idle', expression: 'happy', path: [], arrival: null, walkLoop: false,
    targetYaw: 0, phase: config.phase || 0, talkingUntil: 0,
  };
  let lastFace = '';
  function drawFace(time) {
    const blink = (time + actor.phase) % 4.7 > 4.52;
    const talking = time < actor.talkingUntil && Math.sin(time * 17) > -.1;
    const faceKey = `${actor.expression}:${blink}:${talking}`;
    if (faceKey === lastFace) return;
    lastFace = faceKey;
    const ctx = faceCanvas.getContext('2d'); ctx.clearRect(0, 0, 32, 32);
    ctx.fillStyle = '#d58e74'; ctx.fillRect(4, 19, 5, 2); ctx.fillRect(24, 19, 5, 2);
    ctx.fillStyle = c.ink;
    const e = actor.expression;
    if (blink || e === 'sleepy') { ctx.fillRect(7, 15, 6, 1); ctx.fillRect(21, 15, 6, 1); }
    else {
      const eyeH = e === 'surprise' ? 7 : { bright: 6, relaxed: 3, almond: 4, narrow: 3, round: 6 }[config.eyes] || 5;
      const eyeW = config.eyes === 'round' ? 5 : 4;
      const eyeY = config.eyes === 'relaxed' && e !== 'surprise' ? 14 : 12;
      ctx.fillRect(8, eyeY, eyeW, eyeH); ctx.fillRect(21, eyeY, eyeW, eyeH);
      if (config.lashes) { ctx.fillRect(6, eyeY - 1, 5, 1);ctx.fillRect(24, eyeY - 1, 4, 1); }
      ctx.fillStyle = c.white;ctx.fillRect(9, eyeY, 1, 2);ctx.fillRect(22, eyeY, 1, 2);
    }
    ctx.fillStyle = config.hair;
    ctx.fillRect(7, e === 'surprise' ? 7 : 9, 6, 1);
    ctx.fillRect(20, e === 'surprise' ? 7 : e === 'focus' ? 10 : 9, 6, 1);
    if (config.freckles) {
      ctx.fillStyle = '#ad774f'; for (const [x, y] of [[5, 20], [8, 21], [26, 20], [29, 21]]) ctx.fillRect(x, y, 1, 1);
    }
    if (config.beautyMark) {ctx.fillStyle = '#73514b';ctx.fillRect(26, 23, 1, 1);}
    if (config.beard) {
      ctx.fillStyle = config.hair;ctx.fillRect(9, 25, 17, 5);ctx.fillRect(9, 22, 3, 5);ctx.fillRect(23, 22, 3, 5);ctx.fillRect(13, 21, 10, 2);
    }
    ctx.fillStyle = '#8e4a39';
    if (talking || e === 'surprise') { ctx.fillRect(14, 22, 5, 5);ctx.fillStyle = '#e3a18a';ctx.fillRect(15, 25, 3, 1); }
    else if (e === 'happy') {ctx.fillRect(12, 22, 2, 2);ctx.fillRect(14, 24, 6, 2);ctx.fillRect(20, 22, 2, 2);}
    else ctx.fillRect(14, 23, 7, 1);
    if (config.glasses) {
      const color = config.glasses === 'heavy' ? '#303847' : config.glasses === 'round' ? '#745039' : config.glasses === 'square' ? '#9b773d' : '#52615c';
      ctx.strokeStyle = color;ctx.lineWidth = config.glasses === 'heavy' ? 2 : 1;
      for (const x of [5.5, 19.5]) {
        if (config.glasses === 'round') {
          ctx.beginPath();ctx.moveTo(x + 2, 10.5);ctx.lineTo(x + 7, 10.5);ctx.lineTo(x + 9, 12.5);ctx.lineTo(x + 9, 17.5);ctx.lineTo(x + 7, 19.5);ctx.lineTo(x + 2, 19.5);ctx.lineTo(x, 17.5);ctx.lineTo(x, 12.5);ctx.closePath();ctx.stroke();
        } else ctx.strokeRect(x, 10.5, 9, 9);
      }
      ctx.fillStyle = color;ctx.fillRect(15, 13, 4, 1);
    }
    faceTexture.needsUpdate = true;
  }
  actor.update = (time, dt, flexibility) => {
    const t = time + actor.phase, f = flexibility;
    const p = { hy: .78, hz: 0, tx: 0, tz: 0, hx: 0, hyaw: 0, hzrot: 0, lax: 0, laz: -.06, rax: 0, raz: .06, lex: -.06, rex: -.06, llx: 0, rlx: 0, lkx: 0, rkx: 0 };
    const breathe = Math.sin(t * 2.4);
    p.hy += breathe * .012 * f; p.tz = Math.sin(t * 1.4) * .015 * f;
    p.hx = Math.sin(t * 1.1) * .035 * f;
    p.lax = breathe * .035; p.rax = -breathe * .035;
    if (actor.action === 'walk') {
      const stride = Math.sin(t * 8), counter = Math.sin(t * 8 + Math.PI);
      p.llx = stride * .55; p.rlx = counter * .55;
      p.lkx = Math.max(0, -stride) * .75 * f; p.rkx = Math.max(0, -counter) * .75 * f;
      p.lax = counter * .5; p.rax = stride * .5;
      p.lex = -.25 * f; p.rex = -.25 * f;
      p.hy += Math.abs(Math.cos(t * 8)) * .035 * f;
      p.tz = stride * .045 * f; p.hx = -.04 * f;
    } else if (actor.action === 'wave') {
      p.raz = 2.3 + Math.sin(t * 7) * .27;
      p.rax = -.25 * f; p.rex = (-.6 + Math.sin(t * 7 + .5) * .35) * f;
      p.tz = -.09 * f; p.hzrot = .12 * f; p.hyaw = Math.sin(t * 1.6) * .12 * f;
    } else if (actor.action === 'work') {
      p.hy = .59 / (config.height || 1); p.hz = .16; p.llx = p.rlx = -1.43; p.lkx = p.rkx = 1.43;
      p.tx = .13 * f; p.hx = .13 * f;
      p.lax = -1.48; p.rax = -1.48;
      p.lex = (-.50 + Math.sin(t * 13) * .14) * f;
      p.rex = (-.50 + Math.cos(t * 12) * .14) * f;
      p.laz = -.12; p.raz = .12;
      p.hyaw = Math.sin(t * .7) * .06 * f;
    } else if (actor.action === 'celebrate') {
      p.hy += Math.max(0, Math.sin(t * 6)) * .23;
      p.laz = -2.5 - Math.sin(t * 6) * .2; p.raz = 2.5 + Math.sin(t * 6) * .2;
      p.lex = p.rex = -.5 * f;
      p.lkx = p.rkx = Math.max(0, -Math.sin(t * 6)) * .45 * f;
      p.hx = -.16 * f; p.tz = Math.sin(t * 3) * .10 * f;
    } else if (actor.action === 'think') {
      p.rax = -.6; p.rex = -1.8 * f; p.raz = .14 * f;
      p.lax = -.1; p.lex = -.45 * f; p.hzrot = -.16 * f; p.hx = .08 * f;
      p.hyaw = .22 * f;
    }
    hips.position.y = damp(hips.position.y, p.hy, dt); hips.position.z = damp(hips.position.z, p.hz, dt);
    const values = [[torso,'x',p.tx],[torso,'z',p.tz],[head,'x',p.hx],[head,'y',p.hyaw],[head,'z',p.hzrot],
      [left.shoulder,'x',p.lax],[left.shoulder,'z',p.laz],[right.shoulder,'x',p.rax],[right.shoulder,'z',p.raz],
      [left.elbow,'x',p.lex],[right.elbow,'x',p.rex],[legL.thigh,'x',p.llx],[legR.thigh,'x',p.rlx],
      [legL.knee,'x',p.lkx],[legR.knee,'x',p.rkx]];
    for (const [joint, axis, angle] of values) joint.rotation[axis] = damp(joint.rotation[axis], angle, dt);
    const delta = Math.atan2(Math.sin(actor.targetYaw - root.rotation.y), Math.cos(actor.targetYaw - root.rotation.y));
    root.rotation.y += delta * (1 - Math.exp(-dt * 10));
    drawFace(time);
  };
  actor.update(0, 1, .85);
  return actor;
}
