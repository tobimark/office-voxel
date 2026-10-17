import { createScene, defaultLabels } from './scene.js';
import { createSceneControls } from './scene-controls.js';
import { createTaskDisplays } from './task-displays.js';
import { attachEmbedBridge } from './embed-bridge.js';
import { createLifetime } from './lifetime.js';

// Page composition owns the demo DOM, task UI and the optional legacy bridge.
export function bootScene({ root = document.querySelector('#app'), embed = new URLSearchParams(location.search).get('embed') === '1', bridge = true, ...options }) {
  if (!root) throw new Error('A scene page root is required');
  const lifetime = createLifetime();
  const aborter = new AbortController();
  lifetime.add(() => aborter.abort());
  const text = { ...defaultLabels, ...options.labels };
  const viewport = root.querySelector('#viewport');
  const bodyWasEmbed = document.body.classList.contains('embed');
  document.body.classList.toggle('embed', embed);
  lifetime.add(() => document.body.classList.toggle('embed', bodyWasEmbed));
  const loading = root.querySelector('#loading');
  if (loading) { loading.hidden = false; loading.textContent = text.loading; }
  // A previous failed mount may have disabled these controls.
  root.querySelectorAll('[data-scene-disabled]').forEach(el => { el.disabled = false; delete el.dataset.sceneDisabled; });
  try {
    const controls = createSceneControls({ root, layout: options.layout, signal: aborter.signal });
    const api = createScene({ ...options, viewport, onEvent: controls.handleEvent,
      mountTasks: context => createTaskDisplays({ ...context, root, embed }),
    });
    const destroyEngine = api.dispose;
    lifetime.add(destroyEngine);
    api.dispose = () => lifetime.dispose();
    controls.connect(api);
    if (bridge) lifetime.add(attachEmbedBridge(api));
    if (import.meta.hot) import.meta.hot.dispose(() => api.dispose());
    return api;
  } catch (error) {
    try { lifetime.dispose(); } catch (cleanupError) { console.error(cleanupError); }
    if (loading) { loading.hidden = false; loading.textContent = text.bootFailed; }
    const status = root.querySelector('#status');
    if (status) status.textContent = text.bootFailedStatus;
    root.querySelectorAll('button, input, select').forEach(el => {
      if (!el.disabled) { el.disabled = true; el.dataset.sceneDisabled = ''; }
    });
    console.error(error);
    return null;
  }
}
