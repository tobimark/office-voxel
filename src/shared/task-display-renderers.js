import { STATUS } from './task-runtime.js';

export const PIXEL_FONT = '"Office Pixel"';
const ink = '#293635', paper = '#f8f9f5', muted = '#73817f', green = '#79917a', orange = '#d57645', blue = '#708fa5';
const colors = { waiting: muted, idle: muted, running: blue, blocked: orange, failed: '#a44b25', completed: green };
export function wrapText(ctx, text, width) {
  const lines = [];
  let line = '';
  for (const char of String(text ?? '')) {
    if (char === '\n') { lines.push(line); line = ''; continue; }
    if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = ''; }
    line += char;
  }
  lines.push(line);
  return lines;
}
const font = (ctx, size = 12) => { ctx.font = `${size}px ${PIXEL_FONT}`; ctx.textBaseline = 'top'; };
function lines(ctx, text, x, y, width, size = 12, gap = 4) {
  font(ctx, size);
  const wrapped = wrapText(ctx, text, width);
  wrapped.forEach((line, i) => ctx.fillText(line, x, y + i * (size + gap)));
  return wrapped.length * (size + gap);
}
function status(ctx, value, x, y) {
  ctx.fillStyle = colors[value] ?? muted; ctx.fillRect(x, y + 3, 6, 6);
  font(ctx); ctx.fillText(STATUS[value] ?? value, x + 12, y);
}

export function drawTopic(ctx, w, h, state, page = 0, compact = false) {
  if (compact) {
    ctx.fillStyle = ink; ctx.fillRect(0, 0, w, h);
    font(ctx, 48); const title = wrapText(ctx, state.run.title, w - 48);
    font(ctx, 24); const objective = wrapText(ctx, state.run.objective, w - 48);
    const rows = Math.max(1, Math.floor((h - 160) / 28));
    const pages = Math.max(title.length, Math.ceil(objective.length / rows)), current = page % pages;
    ctx.fillStyle = '#c9a477'; ctx.fillText('本次任务', 24, 18);
    ctx.fillStyle = colors[state.run.status]; ctx.fillText(STATUS[state.run.status], w - 130, 18);
    ctx.fillStyle = paper; font(ctx, 48); ctx.fillText(title[current % title.length], 24, 56);
    ctx.fillStyle = '#b7ccb6'; font(ctx, 24);
    objective.slice((current % Math.ceil(objective.length / rows)) * rows).slice(0, rows).forEach((text, i) => ctx.fillText(text, 24, 116 + i * 28));
    const completed = state.subtasks.filter(t => t.status === 'completed').length;
    ctx.fillStyle = '#52666a'; ctx.fillRect(24, h - 48, w - 48, 4);
    ctx.fillStyle = green; ctx.fillRect(24, h - 48, Math.round((w - 48) * completed / Math.max(1, state.subtasks.length)), 4);
    ctx.fillStyle = paper; ctx.fillText(`完成 ${completed}/${state.subtasks.length}`, 24, h - 34); ctx.fillText(`${current + 1}/${pages}`, w - 96, h - 34);
    return { page: current, pages };
  }
  ctx.fillStyle = ink; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#c9a477'; font(ctx); ctx.fillText('本次任务 / MISSION', 24, 18);
  status(ctx, state.run.status, w - 100, 18);
  const titleSize = 24;
  font(ctx, titleSize);
  const title = wrapText(ctx, state.run.title, w - 48);
  font(ctx);
  const objective = wrapText(ctx, state.run.objective, w - 48);
  const available = h - 88;
  const titleCapacity = Math.max(1, Math.floor(available / 28) - 1);
  const titlePages = Math.ceil(title.length / titleCapacity);
  const objectiveCapacity = Math.max(1, Math.floor((available - Math.min(title.length, titleCapacity) * 28) / 16));
  const count = Math.max(titlePages, Math.ceil(objective.length / objectiveCapacity));
  const current = page % count;
  ctx.fillStyle = paper; font(ctx, titleSize);
  title.slice((current % titlePages) * titleCapacity, (current % titlePages + 1) * titleCapacity).forEach((text, i) => ctx.fillText(text, 24, 48 + i * 28));
  ctx.fillStyle = '#b7ccb6'; font(ctx);
  objective.slice((current % Math.ceil(objective.length / objectiveCapacity)) * objectiveCapacity).slice(0, objectiveCapacity).forEach((text, i) => ctx.fillText(text, 24, 48 + Math.min(title.length, titleCapacity) * 28 + i * 16));
  const completed = state.subtasks.filter(t => t.status === 'completed').length;
  const progress = state.subtasks.length ? completed / state.subtasks.length : 0;
  ctx.fillStyle = '#52666a'; ctx.fillRect(24, h - 34, w - 48, 4);
  ctx.fillStyle = green; ctx.fillRect(24, h - 34, Math.round((w - 48) * progress), 4);
  ctx.fillStyle = paper; font(ctx); ctx.fillText(`已完成 ${completed} / ${state.subtasks.length} 个子任务`, 24, h - 22);
  ctx.fillStyle = '#c9a477'; ctx.fillText(`模拟协作 ${current + 1}/${count}`, w - 126, h - 22);
  return { page: current, pages: count };
}

export function boardPages(ctx, w, h, tasks) {
  font(ctx);
  const columns = Math.max(1, Math.min(3, Math.floor(w / 180)));
  const rows = h >= 240 ? 2 : 1;
  const cw = Math.floor((w - 24 - (columns - 1) * 8) / columns), ch = Math.floor((h - 54 - (rows - 1) * 8) / rows);
  const titleCapacity = Math.max(1, Math.min(2, Math.floor((ch - 42) / 16)));
  const bodyCapacity = Math.max(1, Math.floor((ch - 34 - titleCapacity * 16) / 16));
  const cards = tasks.flatMap(task => {
    const titles = wrapText(ctx, task.title, cw - 20), body = wrapText(ctx, task.description, cw - 20);
    const count = Math.max(Math.ceil(titles.length / titleCapacity), Math.ceil(body.length / bodyCapacity));
    return Array.from({ length: count }, (_, part) => ({ task, part, count, title: titles.slice((part % Math.ceil(titles.length / titleCapacity)) * titleCapacity).slice(0, titleCapacity), body: body.slice(part * bodyCapacity, (part + 1) * bodyCapacity) }));
  });
  const capacity = columns * rows;
  return { columns, rows, cw, ch, cards, capacity, pages: Math.max(1, Math.ceil(cards.length / capacity)) };
}

export function drawBoard(ctx, w, h, state, tasks, page, label, compact = false) {
  if (compact && !tasks.length) {
    ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h); ctx.fillStyle = ink;
    lines(ctx, '本房间暂未分配子任务\nAgent 正在待命。', 24, 24, w - 48, 24, 8);
    return { page: 0, pages: 1 };
  }
  if (compact && tasks.length) {
    font(ctx, 24);
    const maxTitleRows = Math.max(1, Math.min(2, Math.floor((h - 96) / 28)));
    const cards = tasks.flatMap(task => {
      const title = wrapText(ctx, task.title, w - 48), body = wrapText(ctx, task.description, w - 48);
      const bodyRows = Math.max(1, Math.floor((h - 72 - Math.min(title.length, maxTitleRows) * 28) / 28));
      const count = Math.max(Math.ceil(title.length / maxTitleRows), Math.ceil(body.length / bodyRows));
      return Array.from({ length: count }, (_, part) => ({ task, title: title.slice((part % Math.ceil(title.length / maxTitleRows)) * maxTitleRows).slice(0, maxTitleRows), body: body.slice(part * bodyRows, (part + 1) * bodyRows) }));
    });
    const current = ((page % cards.length) + cards.length) % cards.length, card = cards[current];
    ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h); ctx.fillStyle = ink;
    card.title.forEach((text, i) => ctx.fillText(text, 24, 12 + i * 28));
    ctx.fillStyle = '#52666a'; card.body.forEach((text, i) => ctx.fillText(text, 24, 18 + card.title.length * 28 + i * 28));
    ctx.fillStyle = ink; ctx.fillText(state.agents.find(a => a.id === card.task.assigneeAgentId)?.name ?? '未分配', 24, h - 48);
    ctx.fillStyle = colors[card.task.status]; ctx.fillText(STATUS[card.task.status], w - 132, h - 48);
    font(ctx); ctx.fillStyle = muted; ctx.fillText(`${label} · ${current + 1}/${cards.length}`, 24, h - 16);
    return { page: current, pages: cards.length };
  }
  ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
  font(ctx); ctx.fillStyle = ink; ctx.fillText(label, 12, 10);
  ctx.fillStyle = muted; ctx.fillRect(12, 28, w - 24, 1);
  const layout = boardPages(ctx, w, h, tasks), current = ((page % layout.pages) + layout.pages) % layout.pages;
  const { columns, cw, ch, capacity } = layout;
  layout.cards.slice(current * capacity, (current + 1) * capacity).forEach((card, i) => {
    const x = 12 + i % columns * (cw + 8), y = 36 + Math.floor(i / columns) * (ch + 8);
    ctx.fillStyle = '#eaf0e7'; ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = '#dfe4dd'; ctx.strokeRect(x + .5, y + .5, cw - 1, ch - 1);
    font(ctx); ctx.fillStyle = ink;
    card.title.forEach((text, n) => ctx.fillText(text, x + 10, y + 7 + n * 16));
    ctx.fillStyle = '#52666a';
    card.body.forEach((text, n) => ctx.fillText(text, x + 10, y + 10 + card.title.length * 16 + n * 16));
    const owner = state.agents.find(a => a.id === card.task.assigneeAgentId)?.name ?? '未分配';
    ctx.fillStyle = ink; ctx.fillText(`${owner}${card.count > 1 ? ` ${card.part + 1}/${card.count}` : ''}`, x + 10, y + ch - 19);
    status(ctx, card.task.status, x + cw - 70, y + ch - 19);
  });
  if (!tasks.length) { ctx.fillStyle = muted; lines(ctx, '本房间暂未分配子任务\nAgent 正在待命。', 24, 48, w - 48); }
  ctx.fillStyle = muted; font(ctx); ctx.fillText(`${tasks.length} 个子任务`, 12, h - 15);
  ctx.fillText(`第 ${current + 1} / ${layout.pages} 页`, w - 108, h - 15);
  return { page: current, pages: layout.pages };
}

export function drawComputer(ctx, w, h, state, agent, offset = 0, blink = false) {
  const compact = w <= 256;
  const headerHeight = compact ? 24 : 30, titleY = compact ? 30 : 40, stepY = compact ? 46 : 58, ruleY = compact ? 64 : 78, outputY = compact ? 72 : 88, footerHeight = compact ? 20 : 24;
  ctx.fillStyle = ink; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#52666a'; ctx.fillRect(0, 0, w, headerHeight);
  ctx.fillStyle = paper; font(ctx); ctx.fillText(`${agent.name} / AGENT`, 12, 10);
  status(ctx, agent.status, w - 82, 10);
  const task = state.subtasks.find(t => t.id === agent.currentSubtaskId);
  ctx.fillStyle = '#c9a477';
  const taskLines = wrapText(ctx, task ? task.title : '等待任务分配', w - 24);
  // Full text remains accessible as pages instead of shrinking the glyph grid.
  const logs = state.logs[agent.id] ?? [];
  const output = logs.flatMap(log => wrapText(ctx, `[${String(Math.floor(log.timestamp / 1000)).padStart(2, '0')}s ${log.kind}] ${log.text}`, w - 24).map(text => ({ text, kind: log.kind })));
  const intro = [ ...taskLines.map(text => ({ text, kind: 'title' })), ...wrapText(ctx, agent.currentStep, w - 24).map(text => ({ text, kind: 'step' })), { text: '──────────────────────────────', kind: 'rule' } ];
  ctx.fillStyle = '#c9a477'; ctx.fillText(taskLines[0], 12, titleY);
  ctx.fillStyle = '#abc2c9'; ctx.fillText(wrapText(ctx, agent.currentStep, w - 24)[0], 12, stepY);
  ctx.fillStyle = '#52666a'; ctx.fillRect(12, ruleY, w - 24, 1);
  // Long task/step text also stays in the scrollback, while the current task
  // heading remains pinned above the output stream.
  const all = [...(intro.length > 3 ? intro : []), ...output];
  const capacity = Math.max(1, Math.floor((h - outputY - footerHeight) / 16));
  const maxOffset = Math.max(0, all.length - capacity), actualOffset = Math.min(maxOffset, Math.max(0, offset));
  const end = all.length - actualOffset;
  all.slice(Math.max(0, end - capacity), end).forEach((line, i) => {
    ctx.fillStyle = line.kind === 'title' ? '#c9a477' : line.kind === 'result' ? '#b7ccb6' : line.kind === 'error' ? orange : line.kind === 'tool' ? '#abc2c9' : paper;
    ctx.fillText(line.text, 12, outputY + i * 16);
  });
  if (!logs.length && !task) { ctx.fillStyle = muted; ctx.fillText('暂无输出 / 等待协作任务', 12, outputY); }
  ctx.fillStyle = '#52666a'; ctx.fillRect(0, h - footerHeight, w, footerHeight);
  ctx.fillStyle = paper; ctx.fillText(actualOffset ? `历史输出 · 向上 ${actualOffset} 行` : `最新输出 · ${logs.length} 条日志`, 12, h - 16);
  if (blink && agent.status === 'running' && !actualOffset) { ctx.fillStyle = green; ctx.fillRect(w - 20, h - 16, 7, 10); }
  return { pages: Math.max(1, Math.ceil((maxOffset + 1) / capacity)), page: Math.ceil(actualOffset / capacity), maxOffset, offset: actualOffset, capacity };
}
