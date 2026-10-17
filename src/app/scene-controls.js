import { drawPortrait } from '../assets/characters/appearance.js';
import { ACTIONS } from '../engine/scene.js';

// The existing demo UI is an adapter. The scene only emits state/presentation events.
export function createSceneControls({ root, layout, signal }) {
  const $ = selector => root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];
  const listen = (target, event, fn) => target?.addEventListener(event, fn, { signal });
  const people = $('.people');
  people?.replaceChildren(...layout.actors.map((person, index) => {
    const button = document.createElement('button');
    button.className = 'person'; button.dataset.person = String(index);
    button.setAttribute('aria-pressed', String(index === 0));
    if (person.signature) button.title = `${person.name}：${person.signature}`;
    const avatar = document.createElement(person.outfit ? 'canvas' : 'span');
    avatar.className = 'avatar'; avatar.setAttribute('aria-hidden', 'true');
    avatar.style.setProperty('--shirt', person.shirt); avatar.style.setProperty('--hair', person.hair);
    if (person.outfit) { avatar.classList.add('portrait'); drawPortrait(avatar, person); }
    else avatar.append(document.createElement('i'));
    const name = document.createElement('b'); name.textContent = person.name;
    const role = document.createElement('small'); role.textContent = person.role;
    button.append(avatar, name, role); return button;
  }));
  if ($('#people-count')) $('#people-count').textContent = `${layout.capacity} 位`;

  function sync(state) {
    const actor = state.actors[state.selected];
    for (const [selector, selected] of [['person', String(state.selected)], ['action', actor.action], ['expression', actor.expression], ['camera', state.camera]]) {
      $$(`[data-${selector}]`).forEach(button => {
        const active = button.dataset[selector] === selected;
        button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
      });
    }
    if ($('#action-label')) $('#action-label').textContent = ACTIONS[actor.action];
    if ($('#character-detail')) $('#character-detail').textContent = `${actor.name} · ${layout.actors[state.selected].signature}`;
    if ($('#pause')) { $('#pause').textContent = state.paused ? '继续动画' : '暂停动画'; $('#pause').setAttribute('aria-pressed', String(state.paused)); }
    if ($('.scene-heading')) $('.scene-heading').hidden = state.camera !== 'room';
    if ($('#flexibility')) $('#flexibility').value = String(Math.round(state.flexibility * 100));
    if ($('#flex-value')) $('#flex-value').textContent = `${Math.round(state.flexibility * 100)}%`;
    if ($('#lighting')) $('#lighting').value = state.lighting;
    if ($('#pixelated')) $('#pixelated').checked = state.pixelated;
  }
  function handleEvent(event) {
    if (event.type === 'state') sync(event.state);
    if (event.type === 'status' && $('#status')) $('#status').textContent = event.message;
    if (event.type === 'lighting' && $('#scene-state')) $('#scene-state').textContent = event.label;
    if (event.type === 'fps' && $('#fps')) $('#fps').textContent = `${event.value} FPS`;
    if (event.type === 'ready' && $('#loading')) $('#loading').hidden = true;
    if (event.type === 'error' && $('#loading')) { $('#loading').hidden = false; $('#loading').textContent = event.message; }
    const bubble = $('#bubble');
    if (event.type === 'bubble' && bubble) {
      bubble.hidden = event.hidden;
      if (event.message) bubble.textContent = event.message;
      if (event.left !== undefined) { bubble.style.left = `${event.left}px`; bubble.style.top = `${event.top}px`; }
    }
  }
  function connect(api) {
    $$('[data-person]').forEach(b => listen(b, 'click', () => api.select(Number(b.dataset.person))));
    $$('[data-action]').forEach(b => listen(b, 'click', () => api.action(b.dataset.action)));
    $$('[data-expression]').forEach(b => listen(b, 'click', () => api.expression(b.dataset.expression)));
    $$('[data-camera]').forEach(b => listen(b, 'click', () => api.camera(b.dataset.camera)));
    listen($('#pause'), 'click', () => api.pause(!api.getState().paused));
    listen($('#flexibility'), 'input', e => api.flexibility(Number(e.target.value) / 100));
    listen($('#lighting'), 'change', e => api.lighting(e.target.value));
    listen($('#pixelated'), 'change', e => api.pixelated(e.target.checked));
    const toggle = open => {
      if ($('#tweaks')) $('#tweaks').hidden = !open;
      $('#tweaks-toggle')?.setAttribute('aria-expanded', String(open));
    };
    listen($('#tweaks-toggle'), 'click', () => toggle($('#tweaks').hidden));
    listen($('#tweaks-close'), 'click', () => toggle(false));
    listen(root, 'keydown', e => { if (e.key === 'Escape') toggle(false); });
    sync(api.getState());
  }
  return { handleEvent, connect };
}
