import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createCharacter } from '../assets/characters/model.js';
import { acquireArtResources } from '../assets/materials/art.js';
import { disposeSceneResources } from '../engine/resources.js';
import { createLifetime } from '../engine/lifetime.js';

export function createAssetPreview(viewport, kind) {
  const release = acquireArtResources();
  const lifetime = createLifetime();
  lifetime.add(release);
  const scene = new THREE.Scene();
  let renderer, controls, observer, frameId, subject, actor, disposed = false;
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let elapsed = 0, previous = performance.now(), action = 'idle', expression = 'happy';
  const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, .01, 200);
  let extent = 2.6, center = new THREE.Vector3(0, 1, 0);
  function clearSubject() {
    actor = null;
    if (subject) {
      const old = subject; subject = null;
      scene.remove(old);
      disposeSceneResources(old);
    }
  }
  function frame(mode = 'overview') {
    const target = mode === 'face' && actor ? new THREE.Vector3(0, 1.52 * (actor.config.height ?? 1), 0) : center.clone();
    camera.zoom = mode === 'face' && actor ? 2.8 : 1;
    camera.position.copy(target).add(new THREE.Vector3(mode === 'front' || mode === 'face' ? 0 : 4, mode === 'face' ? .1 : mode === 'front' ? .2 : 2.5, 7));
    controls.target.copy(target); camera.updateProjectionMatrix(); controls.update();
  }
  function resize() {
    const width = Math.max(viewport.clientWidth, 1), height = Math.max(viewport.clientHeight, 1);
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.left = -extent * aspect / 2; camera.right = extent * aspect / 2;
    camera.top = extent / 2; camera.bottom = -extent / 2;
    camera.updateProjectionMatrix();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    lifetime.dispose();
  }
  lifetime.add(() => renderer?.domElement.remove());
  lifetime.add(() => renderer?.dispose());
  lifetime.add(() => disposeSceneResources(scene));
  lifetime.add(clearSubject);
  lifetime.add(() => controls?.dispose());
  lifetime.add(() => observer?.disconnect());
  lifetime.add(() => cancelAnimationFrame(frameId));
  try {
    scene.background = new THREE.Color('#dce6e9');
    scene.add(new THREE.HemisphereLight('#fff4dd', '#90a2a6', 2.5));
    const key = new THREE.DirectionalLight('#fff1dc', 2.4); key.position.set(-3, 6, 6); scene.add(key);
    const rim = new THREE.DirectionalLight('#dfeaf2', 1.3); rim.position.set(4, 5, -6); scene.add(rim);
    const grid = new THREE.GridHelper(30, 60, '#b2c1c4', '#ccd8da'); grid.position.y = -.04; scene.add(grid);
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    renderer.domElement.setAttribute('aria-label', '3D 素材预览，拖拽旋转，滚轮缩放');
    viewport.append(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.enablePan = false; controls.minZoom = .4; controls.maxZoom = 6;
    observer = new ResizeObserver(resize); observer.observe(viewport); resize(); frame();
    const tick = now => {
      if (disposed) return;
      const dt = Math.min((now - previous) / 1000, .05); previous = now;
      if (!paused && !document.hidden) { elapsed += dt; actor?.update(elapsed, dt, .85); }
      controls.update(); renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
  } catch (error) { dispose(); throw error; }
  return {
    select(entry) {
      if (disposed) return false;
      clearSubject();
      subject = new THREE.Group(); scene.add(subject);
      try {
        if (kind === 'characters') {
          actor = createCharacter(subject, entry.look); actor.ring.visible = false;
          actor.action = action; actor.expression = expression; actor.update(elapsed, 1, .85);
          center.set(0, 1, 0); extent = 3.3;
        } else {
          entry.create(subject);
          const bounds = new THREE.Box3().setFromObject(subject);
          if (bounds.isEmpty()) throw new Error('素材没有可显示的模型');
          const size = bounds.getSize(new THREE.Vector3()), middle = bounds.getCenter(new THREE.Vector3());
          subject.position.set(-middle.x, -bounds.min.y, -middle.z);
          center.set(0, size.y / 2, 0);
          extent = Math.max(size.x, size.y, size.z, .2) * 1.7;
        }
        resize(); frame(); renderer.render(scene, camera);
      } catch (error) { clearSubject(); throw error; }
    },
    thumbnail(entry) {
      if (disposed) return null;
      const root = new THREE.Group(), thumbnailScene = new THREE.Scene();
      thumbnailScene.background = new THREE.Color('#eaf0e7');
      thumbnailScene.add(new THREE.HemisphereLight('#fff4dd', '#90a2a6', 3));
      const light = new THREE.DirectionalLight('#fff1dc', 2); light.position.set(-3, 6, 6); thumbnailScene.add(light, root);
      try {
        entry.create(root);
        const bounds = new THREE.Box3().setFromObject(root), size = bounds.getSize(new THREE.Vector3());
        const middle = bounds.getCenter(new THREE.Vector3()), span = Math.max(size.x, size.y, size.z, .2) * 1.55;
        const thumbnailCamera = new THREE.OrthographicCamera(-span * .75, span * .75, span / 2, -span / 2, .01, 200);
        thumbnailCamera.position.copy(middle).add(new THREE.Vector3(4, 3, 7)); thumbnailCamera.lookAt(middle);
        renderer.setSize(240, 160, false); renderer.render(thumbnailScene, thumbnailCamera);
        return renderer.domElement.toDataURL('image/png');
      } finally { disposeSceneResources(thumbnailScene); resize(); }
    },
    action(value) { if (disposed) return false; action = value; if (actor) { actor.action = value; actor.update(elapsed, 1, .85); } },
    expression(value) { if (disposed) return false; expression = value; if (actor) { actor.expression = value; actor.update(elapsed, 1, .85); } },
    pause(value) { if (disposed) return false; paused = value; },
    get paused() { return paused; },
    getState: () => ({ action, expression, paused, disposed, time: elapsed, hasActor: Boolean(actor) }),
    frame, dispose,
  };
}
