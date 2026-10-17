import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCharacter } from '../character.js';
import { findPath } from '../navigation.js';
import { createLifetime } from './lifetime.js';
import { resolveSceneLayout, validateOffice } from './scene-contract.js';
import { acquireArtResources } from '../art.js';
import { disposeSceneResources } from './scene-resources.js';

export const ACTIONS = { idle: '自在站立', wave: '挥手招呼', work: '坐下工作', walk: '散步走走', celebrate: '开心庆祝', think: '想点事情' };
export const EXPRESSIONS = { happy: '开心', focus: '专注', surprise: '惊讶', sleepy: '困倦' };

export const defaultLabels = {
  loading: '正在搭建办公室…',
  bootFailed: '3D 场景未能启动。请使用支持 WebGL 2 的浏览器，开启硬件加速后刷新重试。',
  bootFailedStatus: '场景加载失败',
  webglLost: '图形连接已中断，请刷新页面重新加载场景。',
  sceneState: { day: '自由探索', golden: '午后暖光', night: '下班时分' },
  selecting: name => `已选择${name}，可以切换动作或点击空地移动。`,
  blocked: '这里被墙或家具挡住了，走门才能去别的房间。',
  pickPerson: '今天也一起做点有趣的事吧。',
  floorClick: '点击地面空处可以移动，人物会绕开家具。',
  walking: name => `${name}开始散步。点击空地可以指定目的地。`,
  returning: name => `${name}正在走回自己的工位。`,
  seated: name => `${name}已坐下，正在敲键盘。`,
  acting: (name, label) => `${name} · ${label}`,
  departing: name => `${name} · 出发`,
  feeling: (name, label) => `${name}的心情：${label}`,
  bubbleWave: '嗨，欢迎来到我们的办公室！',
  bubbleCelebrate: '好耶！又完成了一件小事。',
  bubbleThink: '嗯…这个点子还能再有趣一点。',
};

/** Mount a scene in a supplied viewport. No page selectors or global bridge. */
export function createScene({ viewport, layout: definition, createOffice, labels = {}, onEvent, mountTasks }) {
  if (!viewport?.append) throw new Error('A scene viewport is required');
  const layout = resolveSceneLayout(definition);
  const text = { ...defaultLabels, ...labels, sceneState: { ...defaultLabels.sceneState, ...labels.sceneState } };
  const lifetime = createLifetime();
  const aborter = new AbortController();
  lifetime.add(() => aborter.abort());
  const listen = (target, event, fn) => target.addEventListener(event, fn, { signal: aborter.signal });
  const listeners = new Set(onEvent ? [onEvent] : []);
  const emit = event => { for (const fn of listeners) fn(event); };
  let taskDisplays, api, frameId, bubbleText = '', destroyed = false;
  lifetime.add(() => { destroyed = true; cancelAnimationFrame(frameId); listeners.clear(); });
  try {
    lifetime.add(acquireArtResources());
    const scene = new THREE.Scene();
    lifetime.add(() => disposeSceneResources(scene));
    scene.background = new THREE.Color('#dce6e9');
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    lifetime.add(() => { renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    viewport.append(renderer.domElement);
    const camera = new THREE.OrthographicCamera(-10, 10, 7, -7, .1, 100);
    camera.position.fromArray(layout.camera.position);
    const controls = new OrbitControls(camera, renderer.domElement);
    lifetime.add(() => controls.dispose());
    controls.target.set(0, .5, 0); controls.enableDamping = true; controls.dampingFactor = .08;
    controls.minZoom = .65; controls.maxZoom = layout.camera.maxZoom ?? 6;
    controls.minPolarAngle = .12; controls.maxPolarAngle = Math.PI / 2.12;
    controls.enablePan = false; controls.update();
    const hemi = new THREE.HemisphereLight('#fff5df', '#91a5a4', 2.6); scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff1d5', 3.4); sun.position.set(-3, 10, 6); scene.add(sun);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const shadowSize = layout.render?.shadowSize ?? Math.max(layout.width, layout.depth) / 2 + 4;
    Object.assign(sun.shadow.camera, { left: -shadowSize, right: shadowSize, top: shadowSize, bottom: -shadowSize, far: layout.render?.shadowFar ?? 80 });
    sun.shadow.bias = -.0003; sun.shadow.normalBias = .025; sun.shadow.radius = 3;
    const fill = new THREE.DirectionalLight('#d0e2e9', 1.0); fill.position.set(6, 6, -4); scene.add(fill);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(layout.render?.groundSize ?? 400, layout.render?.groundSize ?? 400), new THREE.ShadowMaterial({ color: '#718887', opacity: .13 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -.66; ground.receiveShadow = true; scene.add(ground);
    const built = createOffice(scene, layout);
    validateOffice(built, layout);
    const { office, obstacles, displays } = built;
    const seats = layout.seats;
    const actors = layout.actors.map(config => createCharacter(scene, config));
    // Every seat belongs to one character, who starts seated facing the table.
    const stationFor = layout.stationFor;
    actors.forEach((actor, i) => {
      actor.root.traverse(obj => { if (obj.isMesh && obj !== actor.ring) obj.userData.person = i; });
      actor.ring.visible = i === 0;
      if (i > 0) {
        const seat = seats[stationFor[i]];
        actor.root.position.set(seat.x, 0, seat.z);
        actor.action = 'work'; actor.expression = 'focus';
        actor.targetYaw = seat.yaw; actor.root.rotation.y = seat.yaw;
        actor.update(0, 1, .85);
      }
    });
    const marker = new THREE.Mesh(new THREE.RingGeometry(.13, .19, 24), new THREE.MeshBasicMaterial({ color: '#d57645', side: THREE.DoubleSide, depthWrite: false }));
    marker.rotation.x = -Math.PI / 2; marker.position.y = .07; marker.visible = false; scene.add(marker);
    let selected = 0, flex = .85, paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let elapsed = 0, last = performance.now(), frames = 0, frameStart = last;
    let bubbleUntil = 0, cameraMode = 'room', cameraTween = null, width = 1, height = 1, pixelated = false;

    let currentLighting = 'day';
    const status = message => emit({ type: 'status', message });
    function sync() {
      actors.forEach((actor, i) => { actor.ring.visible = i === selected; });
      if (api) emit({ type: 'state', state: api.getState() });
    }
    function setPaused(value) { if (typeof value !== 'boolean') return false; paused = value; sync(); return true; }
    function hideBubble() { bubbleText = ''; emit({ type: 'bubble', hidden: true }); }
    function showBubble(message) {
      bubbleText = message; emit({ type: 'bubble', hidden: false, message }); bubbleUntil = elapsed + 3.5;
      actors[selected].talkingUntil = elapsed + 2.5;
    }
    function select(index) {
      if (!Number.isInteger(index) || !actors[index]) return false;
      selected = index; marker.visible = false; hideBubble(); sync();
      if (cameraMode === 'person') setCamera('person');
      status(text.selecting(actors[index].config.name));
      return true;
    }
    const seatOf = actor => seats[stationFor[actors.indexOf(actor)]];
    const exitOf = seat => seat.exit;
    function leaveChair(actor) {
      if (actor.action !== 'work') return;
      const seat = seatOf(actor), exit = exitOf(seat);
      actor.root.position.set(exit.x, 0, exit.z);
      actor.targetYaw = seat.yaw + Math.PI;
    }
    function move(actor, destination, arrival = null) {
      leaveChair(actor);
      const path = findPath({ x: actor.root.position.x, z: actor.root.position.z }, destination, obstacles, layout.bounds);
      if (!path) { status(text.blocked); return false; }
      actor.path = path; actor.arrival = arrival; actor.action = 'walk';
      if (actor === actors[selected]) {
        marker.position.set(destination.x, .07, destination.z); marker.visible = true;
        sync();
      }
      return true;
    }
    function act(action) {
      if (!Object.hasOwn(ACTIONS, action)) return false;
      const actor = actors[selected];
      setPaused(false); leaveChair(actor);
      actor.path = []; actor.arrival = null; actor.walkLoop = false; marker.visible = false;
      if (action === 'work') {
        const seat = seatOf(actor);
        const result = move(actor, exitOf(seat), () => {
          actor.root.position.set(seat.x, 0, seat.z);
          actor.targetYaw = seat.yaw; actor.action = 'work';
          if (actor === actors[selected]) { sync(); status(text.seated(actor.config.name)); }
        });
        if (!result) return false;
        actor.expression = 'focus'; status(text.returning(actor.config.name));
      } else if (action === 'walk') {
        actor.walkLoop = true;
        const points = layout.patrol;
        let n = 0;
        const next = () => {
          if (!actor.walkLoop) return;
          if (!move(actor, points[n++ % points.length], next)) actor.walkLoop = false;
        };
        next(); status(text.walking(actor.config.name));
      } else {
        actor.action = action;
        actor.targetYaw = cameraMode === 'person'
          ? Math.atan2(camera.position.x - actor.root.position.x, camera.position.z - actor.root.position.z) : .25;
        if (action === 'wave') showBubble(text.bubbleWave);
        if (action === 'celebrate') { actor.expression = 'happy'; showBubble(text.bubbleCelebrate); }
        if (action === 'think') { actor.expression = 'focus'; showBubble(text.bubbleThink); }
        status(text.acting(actor.config.name, ACTIONS[action]));
      }
      sync(); return true;
    }
    function setExpression(expression) {
      if (!Object.hasOwn(EXPRESSIONS, expression)) return false;
      actors[selected].expression = expression;
      // Allow static expression inspection while the animation is paused.
      actors[selected].update(elapsed, 0, flex);
      sync(); status(text.feeling(actors[selected].config.name, EXPRESSIONS[expression])); return true;
    }
    function setCamera(mode) {
      if (!['room', 'person', 'top'].includes(mode)) return false;
      taskDisplays?.exit();
      cameraMode = mode;
      
      const point = actors[selected].root.position;
      const target = mode === 'person' ? new THREE.Vector3(point.x, 1.1, point.z) : new THREE.Vector3(0, .5, 0);
      const position = mode === 'person' ? target.clone().add(new THREE.Vector3(2.5, 1.4, 5))
        : mode === 'top' ? new THREE.Vector3(0, layout.depth * 2, 4)
          : new THREE.Vector3().fromArray(layout.camera.position);
      cameraTween = { position, target, zoom: mode === 'person' ? layout.camera.closeZoom : mode === 'top' ? 1.1 : 1 };
      sync();
      return true;
    }
    function setLighting(value) {
      const presets = { day: ['#dce6e9', '#fff1d5', 3.4, 2.6, 1.25], golden: ['#e6d8c3', '#ffd3a0', 3.6, 1.8, 1.2], night: ['#73878f', '#c2d3f1', .7, 1.3, 1.1] };
      if (!presets[value]) return false;
      const [background, color, strength, ambient, exposure] = presets[value];
      currentLighting = value;
      scene.background.set(background); sun.color.set(color); sun.intensity = strength; hemi.intensity = ambient; renderer.toneMappingExposure = exposure;
      emit({ type: 'lighting', label: text.sceneState[value] }); sync();
      return true;
    }
    function resize() {
      width = viewport.clientWidth; height = viewport.clientHeight;
      if (!width || !height) return;
      const aspect = width / height, size = Math.max(layout.camera.minHeight, layout.camera.minWidth / aspect);
      camera.left = -size * aspect / 2; camera.right = size * aspect / 2;
      camera.top = size / 2; camera.bottom = -size / 2; camera.updateProjectionMatrix();
      renderer.setPixelRatio(pixelated && cameraMode !== 'display' ? .55 : Math.min(devicePixelRatio, 1.75));
      renderer.setSize(width, height);
      renderer.domElement.style.imageRendering = pixelated ? 'pixelated' : 'auto';
    }
    const resizeObserver = new ResizeObserver(resize);
    lifetime.add(() => resizeObserver.disconnect());
    resizeObserver.observe(viewport); resize();
    const raycaster = new THREE.Raycaster();
    let pointerStart = null;
    listen(renderer.domElement, 'pointerdown', e => { pointerStart = { x: e.clientX, y: e.clientY }; });
    listen(renderer.domElement, 'pointercancel', () => { pointerStart = null; });
    listen(renderer.domElement, 'pointerup', e => {
      if (!pointerStart || Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 5 || e.button !== 0) { pointerStart = null; return; }
      pointerStart = null;
      const rect = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), camera);
      const hits = raycaster.intersectObjects([office, ...actors.map(a => a.root)], true).filter(hit => hit.object !== actors.find(a => a.ring === hit.object)?.ring);
      const hit = hits[0]; if (!hit) return;
      if (hit.object.userData.person !== undefined) { select(hit.object.userData.person); showBubble(text.pickPerson); return; }
      if (hit.point.y > .14) { status(text.floorClick); return; }
      const actor = actors[selected]; actor.walkLoop = false;
      if (move(actor, { x: hit.point.x, z: hit.point.z })) { setPaused(false); status(text.departing(actor.config.name)); }
    });
    listen(viewport, 'keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(e.key)) return;
      e.preventDefault(); cameraTween = null;
      const offset = camera.position.clone().sub(controls.target), spherical = new THREE.Spherical().setFromVector3(offset);
      if (e.key === 'ArrowLeft') spherical.theta -= .12;
      if (e.key === 'ArrowRight') spherical.theta += .12;
      if (e.key === 'ArrowUp') spherical.phi = Math.max(.15, spherical.phi - .12);
      if (e.key === 'ArrowDown') spherical.phi = Math.min(1.45, spherical.phi + .12);
      if (['+', '='].includes(e.key)) camera.zoom = Math.min(controls.maxZoom, camera.zoom * 1.1);
      if (e.key === '-') camera.zoom = Math.max(.65, camera.zoom / 1.1);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); camera.updateProjectionMatrix(); controls.update();
    });
    controls.addEventListener('start', () => { cameraTween = null; });
    listen(renderer.domElement, 'webglcontextlost', e => { e.preventDefault(); setPaused(true); emit({ type: 'error', message: text.webglLost }); });
    listen(document, 'visibilitychange', () => { last = performance.now(); });

    taskDisplays = mountTasks?.({ layout, displays, camera, controls, renderer, viewport,
      onPose: pose => { cameraTween = pose; cameraMode = 'display'; hideBubble(); sync(); },
      returnToRoom: () => setCamera('room'), selectPerson: select,
    });
    if (taskDisplays) lifetime.add(() => taskDisplays.dispose());
    api = {
      tasks: taskDisplays,
      dispose: () => lifetime.dispose(),
      get disposed() { return lifetime.disposed; },
      subscribe(fn) {
        if (lifetime.disposed) return () => {};
        listeners.add(fn); return () => listeners.delete(fn);
      },
      lighting: setLighting,
      flexibility(value) {
        if (!Number.isFinite(value) || value < 0 || value > 1) return false;
        flex = value; sync(); return true;
      },
      pixelated(value) {
        if (typeof value !== 'boolean') return false;
        pixelated = value; resize(); sync(); return true;
      },
      select, action: act, expression: setExpression, camera: setCamera, pause: setPaused,
      getState: () => ({ scene: layout.id, capacity: layout.capacity, selected, paused, disposed: lifetime.disposed, pixelated, flexibility: flex, camera: cameraMode, lighting: currentLighting,
        actors: actors.map(a => ({ instanceId: a.config.instanceId, characterId: a.config.characterId, appearanceId: a.config.appearanceId,
          name: a.config.name, action: a.action, expression: a.expression, yaw: a.root.rotation.y,
          position: { x: a.root.position.x, z: a.root.position.z }, remainingSteps: a.path.length })),
        render: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures },
      }),
    };
    // Reject commands retained by a host after this instance has been destroyed.
    for (const key of ['select', 'action', 'expression', 'camera', 'pause', 'lighting', 'flexibility', 'pixelated']) {
      const command = api[key]; api[key] = (...args) => lifetime.disposed ? false : command(...args);
    }
    function tick(now) {
      if (destroyed) return;
      frameId = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, .05); last = now;
      if (document.hidden) return;
      taskDisplays?.tick(now);
      if (!paused) {
        elapsed += dt;
        actors.forEach(actor => {
          if (actor.path.length) {
            const destination = actor.path[0], dx = destination.x - actor.root.position.x, dz = destination.z - actor.root.position.z;
            const distance = Math.hypot(dx, dz), step = dt * 1.45;
            if (distance > .001) actor.targetYaw = Math.atan2(dx, dz);
            if (distance <= step) {
              actor.root.position.x = destination.x; actor.root.position.z = destination.z; actor.path.shift();
              if (!actor.path.length) {
                actor.action = 'idle';
                const arrival = actor.arrival; actor.arrival = null;
                if (actor === actors[selected]) marker.visible = false;
                arrival?.();
                if (actor === actors[selected]) sync();
              }
            } else { actor.root.position.x += dx / distance * step; actor.root.position.z += dz / distance * step; }
          }
          actor.update(elapsed, dt, flex);
        });
      }
      if (cameraTween) {
        const alpha = cameraTween.deadline && now >= cameraTween.deadline ? 1 : 1 - Math.exp(-dt * 6);
        camera.position.lerp(cameraTween.position, alpha); controls.target.lerp(cameraTween.target, alpha);
        camera.zoom = THREE.MathUtils.lerp(camera.zoom, cameraTween.zoom, alpha); camera.updateProjectionMatrix();
        if (camera.position.distanceTo(cameraTween.position) < .005 && Math.abs(camera.zoom - cameraTween.zoom) < .005) cameraTween = null;
      }
      controls.update();
      if (bubbleText) {
        if (elapsed > bubbleUntil) hideBubble();
        else {
          const projected = new THREE.Vector3(actors[selected].root.position.x, 2.35, actors[selected].root.position.z).project(camera);
          const left = (projected.x + 1) / 2 * width, top = (-projected.y + 1) / 2 * height;
          emit({ type: 'bubble', hidden: false, message: bubbleText, left: Math.max(110, Math.min(width - 110, left)), top: Math.max(70, top) });
        }
      }
      renderer.render(scene, camera);
      frames++;
      if (now - frameStart >= 1000) { emit({ type: 'fps', value: Math.round(frames * 1000 / (now - frameStart)) }); frames = 0; frameStart = now; }
    }
    sync(); emit({ type: 'ready' }); frameId = requestAnimationFrame(tick);
    return api;
  } catch (error) {
    try { lifetime.dispose(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Scene initialization failed'); }
    throw error;
  }
}
