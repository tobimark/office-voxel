import { STATUS } from './task-runtime.js';

export function createAgentMenu({ bindings, getState, focusComputer, selectPerson, signal, root, viewport }) {
  const menu = document.createElement('div');
  menu.className = 'agent-menu'; menu.id = 'agent-display-menu'; menu.hidden = true;
  menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', '人物操作');
  const name = document.createElement('b'), detail = document.createElement('p'), button = document.createElement('button');
  button.type = 'button'; button.setAttribute('role', 'menuitem'); button.textContent = '查看电脑屏幕';
  menu.append(name, detail, button); root.append(menu);
  let owner = null, binding = null;
  function close(restore = false) {
    menu.hidden = true;
    owner?.setAttribute('aria-expanded', 'false');
    if (restore) owner?.focus({ preventScroll: true });
    owner = null; binding = null;
  }
  function place() {
    if (!owner) return;
    const r = owner.getBoundingClientRect(), m = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(12, Math.min(innerWidth - m.width - 12, r.left))}px`;
    menu.style.top = `${Math.max(12, Math.min(innerHeight - m.height - 12, r.top - m.height - 8))}px`;
  }
  function refresh() {
    if (!binding) return;
    const agent = getState().agents.find(a => a.id === binding.agentId);
    name.textContent = `${binding.name} / Agent`;
    detail.textContent = `${STATUS[agent?.status] ?? '待命'} · 专属工位`;
  }
  root.querySelectorAll('.people [data-person], .task-people [data-agent-person]').forEach(avatar => {
    avatar.setAttribute('aria-haspopup', 'menu'); avatar.setAttribute('aria-expanded', 'false'); avatar.setAttribute('aria-controls', menu.id);
    avatar.addEventListener('click', () => {
      if (owner === avatar) return close();
      close(); owner = avatar; binding = bindings.find(b => b.actorIndex === Number(avatar.dataset.person ?? avatar.dataset.agentPerson));
      if (avatar.dataset.agentPerson !== undefined) selectPerson(binding.actorIndex);
      refresh(); menu.hidden = false; owner.setAttribute('aria-expanded', 'true'); place(); button.focus({ preventScroll: true });
    }, { signal });
  });
  button.addEventListener('click', () => { const id = binding.displayId; close(); focusComputer(id); viewport.focus({ preventScroll: true }); }, { signal });
  document.addEventListener('pointerdown', e => { if (owner && !menu.contains(e.target) && !owner.contains(e.target)) close(); }, { signal });
  root.addEventListener('keydown', e => {
    if (!owner) return;
    if (e.key === 'Escape') { e.preventDefault(); close(true); }
    if (e.key === 'Tab') close();
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) { e.preventDefault(); button.focus(); }
  }, { signal });
  window.addEventListener('resize', place, { signal });
  window.addEventListener('scroll', place, { signal, capture: true });
  return { close, refresh, get hidden() { return menu.hidden; }, dispose() { close(); menu.remove(); } };
}
