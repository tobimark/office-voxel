import { createLifetime } from './lifetime.js';
import './task-displays.css';
import { createTaskRuntime, createBindings } from './task-runtime.js';
import { createMockTaskSource } from './mock-task-source.js';
import { createDisplaySurface } from './display-surface.js';
import { drawTopic, drawBoard, drawComputer } from './task-display-renderers.js';
import { createDisplayFocus } from './display-focus.js';
import { createAgentMenu } from './agent-menu.js';

export function createTaskDisplays(options) {
  const lifetime = createLifetime();
  try { return mountTaskDisplays(options, lifetime); }
  catch (error) {
    try { lifetime.dispose(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Task display initialization failed'); }
    throw error;
  }
}

function mountTaskDisplays({ layout, displays, camera, controls, renderer, viewport, root, embed = false, onPose, onExit, returnToRoom, selectPerson }, lifetime) {
  const aborter = new AbortController(), { signal } = aborter;
  lifetime.add(() => aborter.abort());
  const listen = (el, event, fn) => el.addEventListener(event, fn, { signal });
  const bindings = createBindings(layout, displays);
  let source = createMockTaskSource(bindings);
  lifetime.add(() => source.dispose?.());
  const runtime = createTaskRuntime(source.getSnapshot());
  lifetime.add(() => runtime.dispose());
  let unsubscribeSource = source.subscribe(runtime.apply);
  lifetime.add(() => unsubscribeSource());
  let snapshot = runtime.getSnapshot(), fontReady = false, disposed = false, last = null, autoPageAt = 0, blink = false, blinkAt = 0;
  lifetime.add(() => { disposed = true; });
  const records = displays.map(entry => {
    const surface = createDisplaySurface(entry);
    lifetime.add(() => surface.dispose());
    return { entry, surface, key: '', page: 0, offset: 0, info: { page: 0, pages: 1 } };
  });
  const stage = viewport.parentElement;
  const toolbar = document.createElement('div'); toolbar.className = 'task-toolbar'; toolbar.setAttribute('role', 'group'); toolbar.setAttribute('aria-label', '任务展示控制');
  toolbar.innerHTML = '<span class="task-brand"><i aria-hidden="true"></i><span data-source-label>多 AGENT / 模拟数据</span></span><button type="button" data-task-focus="mission" aria-pressed="false">任务主题</button><button type="button" data-task-focus="tasks" aria-pressed="false">子任务看板</button><button type="button" data-task-room>返回全景</button><span class="task-playback"><output data-task-time>00s</output><button type="button" data-task-pause aria-pressed="false">暂停演示</button><button type="button" data-task-replay>重新演示</button></span><span class="task-font-status" role="status">加载中文像素字体…</span>';
  stage.append(toolbar); lifetime.add(() => toolbar.remove());
  const reader = document.createElement('div'); reader.className = 'display-reader'; reader.hidden = true; reader.setAttribute('aria-label', '显示内容翻页');
  reader.innerHTML = '<label data-board-picker>看板<select aria-label="选择子任务看板"></select></label><span data-display-label></span><button type="button" data-display-prev>上一页</button><output data-display-page></output><button type="button" data-display-next>下一页</button><button type="button" data-display-latest>最新输出</button>';
  stage.append(reader); lifetime.add(() => reader.remove());
  const $ = (selector, root = toolbar) => root.querySelector(selector);
  let embedPeople;
  if (embed) {
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.textContent = '人物电脑'; toggle.dataset.taskPeople = ''; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'task-people');
    toolbar.insertBefore(toggle, $('.task-playback'));
    embedPeople = document.createElement('div'); embedPeople.className = 'task-people'; embedPeople.id = 'task-people'; embedPeople.hidden = true; embedPeople.setAttribute('aria-label', '人物头像');
    bindings.forEach(binding => {
      const original = root.querySelector(`.people [data-person="${binding.actorIndex}"]`);
      const button = document.createElement('button'); button.type = 'button'; button.dataset.agentPerson = binding.actorIndex;
      const portrait = original.querySelector('.avatar');
      const avatar = portrait.cloneNode(true);
      if (portrait.tagName === 'CANVAS') { avatar.width = portrait.width; avatar.height = portrait.height; avatar.getContext('2d').drawImage(portrait, 0, 0); }
      const name = document.createElement('span'); name.textContent = binding.name;
      button.append(avatar, name); embedPeople.append(button);
    });
    toolbar.append(embedPeople);
    listen(toggle, 'click', () => { embedPeople.hidden = !embedPeople.hidden; toggle.setAttribute('aria-expanded', String(!embedPeople.hidden)); });
  }
  const picker = $('select', reader);
  displays.filter(d => d.kind === 'board').sort((a, b) => Number(Boolean(a.roomId)) - Number(Boolean(b.roomId))).forEach(d => { const option = document.createElement('option'); option.value = d.id; option.textContent = d.label; picker.append(option); });
  const focusController = createDisplayFocus({ camera, controls, viewport, onPose, onExit });
  lifetime.add(() => focusController.dispose());
  let savedRatio = null;
  function sharpen() {
    if (savedRatio === null) savedRatio = renderer.getPixelRatio();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  }
  function restoreRatio() {
    if (savedRatio !== null) { renderer.setPixelRatio(savedRatio); renderer.setSize(viewport.clientWidth, viewport.clientHeight); savedRatio = null; }
  }
  lifetime.add(() => { stage.classList.remove('display-active'); restoreRatio(); });
  function exit() {
    focusController.exit(); reader.hidden = true; stage.classList.remove('display-active'); restoreRatio();
    toolbar.querySelectorAll('[data-task-focus]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  }
  function focus(id) {
    if (lifetime.disposed) return false;
    const record = records.find(r => r.entry.id === id);
    if (!record) return false;
    menu.close(); sharpen(); focusController.focus(record.entry);
    if (embedPeople) { embedPeople.hidden = true; $('[data-task-people]').setAttribute('aria-expanded', 'false'); }
    const rect = stage.getBoundingClientRect();
    if (rect.top < -20 || rect.top > innerHeight * .4) window.scrollTo({ top: scrollY + rect.top - 8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    stage.classList.add('display-active'); reader.hidden = false;
    root.querySelectorAll('[data-camera]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    if (record.entry.kind === 'board') picker.value = id;
    toolbar.querySelectorAll('[data-task-focus]').forEach(b => b.setAttribute('aria-pressed', String(record.entry.kind === (b.dataset.taskFocus === 'mission' ? 'topic' : 'board'))));
    paint(); syncReader(); return true;
  }
  const menu = createAgentMenu({ bindings, getState: () => snapshot, focusComputer: focus, selectPerson, signal, root, viewport });
  lifetime.add(() => menu.dispose());
  function tasksFor(entry) {
    if (!entry.roomId) return snapshot.subtasks;
    const agents = new Set(bindings.filter(b => b.roomId === entry.roomId).map(b => b.agentId));
    return snapshot.subtasks.filter(t => agents.has(t.assigneeAgentId));
  }
  function paint() {
    if (!fontReady || disposed) return;
    const compact = viewport.clientWidth < 600;
    for (const record of records) {
      const { entry, surface } = record;
      if (surface.resize(compact)) record.key = '';
      const binding = entry.kind === 'computer' ? bindings.find(b => b.displayId === entry.id) : null;
      const agent = binding ? snapshot.agents.find(a => a.id === binding.agentId) : null;
      const content = entry.kind === 'topic' ? [snapshot.run.title, snapshot.run.objective, snapshot.run.status, snapshot.subtasks.filter(t => t.status === 'completed').length, snapshot.subtasks.length, record.page]
        : entry.kind === 'board' ? [tasksFor(entry), snapshot.agents.map(a => [a.id, a.name]), record.page]
          : [agent, snapshot.subtasks.find(t => t.id === agent?.currentSubtaskId), snapshot.logs[agent?.id], record.offset, agent?.status === 'running' && blink];
      const key = JSON.stringify([compact, content]);
      if (key === record.key) continue;
      surface.draw((ctx, w, h) => {
        record.info = entry.kind === 'topic' ? drawTopic(ctx, w, h, snapshot, record.page, compact)
          : entry.kind === 'board' ? drawBoard(ctx, w, h, snapshot, tasksFor(entry), record.page, entry.label, compact)
            : drawComputer(ctx, w, h, snapshot, agent ?? { id: '', name: binding.name, status: 'idle', currentStep: '未连接 Agent' }, record.offset, blink);
      });
      record.key = key;
    }
    menu.refresh(); syncReader();
  }
  function syncReader() {
    const active = focusController.active;
    if (!active) return;
    const record = records.find(r => r.entry === active), computer = active.kind === 'computer';
    $('[data-board-picker]', reader).hidden = active.kind !== 'board';
    $('[data-display-label]', reader).textContent = computer ? `${bindings.find(b => b.displayId === active.id).name}的电脑` : active.kind === 'topic' ? '任务主题' : '';
    $('[data-display-latest]', reader).hidden = !computer;
    $('[data-display-prev]', reader).textContent = computer ? '较早输出' : '上一页';
    $('[data-display-next]', reader).textContent = computer ? '较新输出' : '下一页';
    $('[data-display-page]', reader).textContent = computer ? record.info.offset ? '历史输出' : '最新输出' : `${record.info.page + 1} / ${record.info.pages}`;
    $('[data-display-prev]', reader).disabled = computer ? record.offset >= record.info.maxOffset : record.info.pages <= 1;
    $('[data-display-next]', reader).disabled = computer ? record.offset <= 0 : record.info.pages <= 1;
  }
  function changePage(direction) {
    const record = records.find(r => r.entry === focusController.active);
    if (!record) return;
    if (record.entry.kind === 'computer') record.offset = Math.min(record.info.maxOffset, Math.max(0, record.offset - direction * record.info.capacity));
    else record.page = (record.info.page + direction + record.info.pages) % record.info.pages;
    paint();
  }
  function syncPlayback() {
    const playback = source.getPlayback?.();
    $('.task-playback').hidden = !playback;
    $('[data-source-label]').textContent = source.kind === 'mock' ? '多 AGENT / 模拟数据' : '多 AGENT / 实时数据';
    if (!playback) return;
    $('[data-task-pause]').textContent = playback.paused ? '继续演示' : '暂停演示';
    $('[data-task-pause]').setAttribute('aria-pressed', String(playback.paused));
    $('[data-task-time]').textContent = `${String(Math.floor(playback.elapsed / 1000)).padStart(2, '0')}s`;
  }
  const unsubscribeRuntime = runtime.subscribe(next => { snapshot = next; paint(); });
  lifetime.add(unsubscribeRuntime);
  const contentObserver = new ResizeObserver(paint);
  lifetime.add(() => contentObserver.disconnect()); contentObserver.observe(viewport);
  toolbar.querySelectorAll('[data-task-focus]').forEach(button => listen(button, 'click', () => focus(button.dataset.taskFocus)));
  listen($('[data-task-room]'), 'click', () => { exit(); returnToRoom(); });
  listen($('[data-task-pause]'), 'click', () => { source.pause?.(!source.getPlayback().paused); syncPlayback(); });
  function replay() {
    source.reset?.(); runtime.reset(source.getSnapshot()); records.forEach(r => { r.page = 0; r.offset = 0; r.key = ''; });
    source.pause?.(false); last = null; autoPageAt = 0; paint(); syncPlayback();
  }
  listen($('[data-task-replay]'), 'click', replay);
  listen(picker, 'change', () => focus(picker.value));
  listen($('[data-display-prev]', reader), 'click', () => changePage(-1));
  listen($('[data-display-next]', reader), 'click', () => changePage(1));
  listen($('[data-display-latest]', reader), 'click', () => { const r = records.find(r => r.entry === focusController.active); if (r) { r.offset = 0; paint(); } });
  // Existing camera presets and keyboard commands can leave display mode cleanly.
  root.querySelectorAll('[data-camera]').forEach(b => listen(b, 'click', exit));
  listen(document, 'visibilitychange', () => { last = null; });
  listen(root, 'keydown', e => { if (!e.defaultPrevented && e.key === 'Escape' && focusController.active && menuHidden()) { exit(); returnToRoom(); } });
  function menuHidden() { return menu.hidden; }
  const fontStatus = $('.task-font-status');
  async function loadFont() {
    try {
      const fonts = await document.fonts.load('12px "Office Pixel"', '任务主题子任务运行中像素办公室');
      if (!fonts.length) throw new Error('Pixel font unavailable');
      if (disposed) return;
      fontReady = true; fontStatus.hidden = true; records.forEach(r => { r.key = ''; }); paint();
    } catch {
      if (!disposed) { fontStatus.hidden = false; fontStatus.textContent = '中文像素字体加载失败，请刷新重试。'; }
    }
  }
  void loadFont();
  syncPlayback();
  const api = {
    focus, exit,
    pause(value) { source.pause?.(value); syncPlayback(); }, replay,
    seek(ms) { if (source.kind !== 'mock' || !Number.isFinite(ms)) return false; replay(); source.advance(Math.max(0, ms)); syncPlayback(); return true; },
    // A backend adapter implements getSnapshot() and subscribe(onEvent). Return
    // an unsubscribe function and optionally dispose() to release its transport.
    setSource(next) {
      const initial = next.getSnapshot();
      const validation = createTaskRuntime(initial); validation.dispose();
      unsubscribeSource(); source.dispose?.(); source = next;
      runtime.reset(initial); unsubscribeSource = source.subscribe(runtime.apply);
      records.forEach(r => { r.page = 0; r.offset = 0; r.key = ''; }); last = null; paint(); syncPlayback();
    },
    getState: () => ({ ...runtime.getSnapshot(), bindings: structuredClone(bindings), playback: source.getPlayback?.() ?? null, fontReady, focused: focusController.active?.id ?? null,
      surfaces: records.map(r => ({ id: r.entry.id, kind: r.entry.kind, stationId: r.entry.stationId, roomId: r.entry.roomId, width: r.surface.canvas.width, height: r.surface.canvas.height, revision: r.surface.revision, page: r.info.page, pages: r.info.pages, offset: r.info.offset })) }),
    tick(now) {
      if (disposed) return;
      const delta = last === null ? 0 : Math.max(0, now - last); last = now;
      source.advance?.(delta); syncPlayback();
      const playback = source.getPlayback?.();
      if (!playback?.paused && now - blinkAt > 700) { blinkAt = now; blink = !blink; paint(); }
      if (playback && !playback.paused && playback.elapsed - autoPageAt > 9000) {
        autoPageAt = playback.elapsed;
        records.filter(r => r.entry.kind !== 'computer' && r.entry !== focusController.active).forEach(r => { r.page = (r.info.page + 1) % r.info.pages; }); paint();
      }
    },
    dispose() {
      lifetime.dispose();
    },
  };
  for (const key of ['focus', 'exit', 'pause', 'replay', 'seek', 'setSource', 'tick']) {
    const command = api[key]; api[key] = (...args) => lifetime.disposed ? false : command(...args);
  }
  return api;
}
