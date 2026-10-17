// A deterministic source with the same snapshot + event subscription contract a
// future SSE/WebSocket adapter can implement. No timer or DOM dependency.
const specs = [
  ['需求梳理', '明确主任务、子任务与工位屏幕的信息层级。', '整理显示需求与验收条件', ['读取五种办公室布局', '标记黑板、白板与电脑位置', '需求清单已确认']],
  ['像素界面', '设计中文像素文字和白板卡片的布局。', '绘制中文像素界面', ['加载本地中文像素字体', '排版任务卡片与终端', '长标题换行检查通过']],
  ['数据协议', '定义任务事件、Agent 归属与运行状态。', '建立统一任务事件协议', ['定义快照和增量事件', '校验 Agent 与子任务引用', '事件协议与模拟数据已就绪']],
  ['场景接入', '把任务内容绘制到五种场景的真实板面。', '连接独立电脑显示纹理', ['注册工位与显示面', '等待字体排版结果', '继续接入独立电脑输出']],
  ['交互验证', '检查头像菜单、镜头聚焦及中文可读性。', '逐一检查人物电脑特写', ['验证正面镜头与缩放', '检查窄屏和多房间遮挡', '全部交互检查通过']],
  ['结果汇总', '汇总子任务成果，保留本轮任务的最终输出。', '汇总所有 Agent 的结果', ['收集各子任务输出', '生成任务完成摘要', '五种场景动态任务展示已完成']],
];

export function createMockTaskSource(bindings) {
  const runId = 'voxel-task-demo';
  const agents = bindings.map(b => ({ id: b.agentId, name: b.name, status: 'idle', currentSubtaskId: null, currentStep: '等待任务分配' }));
  const subtasks = specs.map(([title, description], i) => ({ id: `task-${i + 1}`, runId, title, description, assigneeAgentId: bindings[i % Math.min(bindings.length, 6)].agentId, dependsOn: i > 3 ? [`task-${i}`] : [], status: 'waiting', summary: '' }));
  const initial = { run: { id: runId, title: '为像素办公室实现多 Agent 任务展示', objective: '让任务主题、子任务与 Agent 输出在场景中实时可见。', status: 'running', startedAt: 0, updatedAt: 0 }, agents, subtasks, logs: {}, seq: 0 };
  const schedule = [];
  const add = (at, type, payload) => schedule.push({ at, type, payload });
  // Three first tasks overlap. On a three-person layout, later tasks reuse the
  // same agents only after their earlier task finishes.
  const starts = [1500, 3000, 4500, 22000, 41000, 57000];
  subtasks.forEach((task, i) => {
    const start = starts[i], end = start + (i === 3 ? 18000 : 15000);
    add(start, 'subtask.updated', { subtaskId: task.id, status: 'running' });
    add(start, 'agent.updated', { agentId: task.assigneeAgentId, status: 'running', currentSubtaskId: task.id, currentStep: specs[i][2] });
    specs[i][3].forEach((text, n) => {
      add(start + 1500 + n * 5000, 'agent.output', { id: `log-${i}-${n}`, agentId: task.assigneeAgentId, subtaskId: task.id, timestamp: start + 1500 + n * 5000, kind: n === 2 ? 'result' : n === 1 ? 'tool' : 'info', text });
    });
    if (i === 3) {
      add(start + 6500, 'subtask.updated', { subtaskId: task.id, status: 'blocked' });
      add(start + 6500, 'agent.updated', { agentId: task.assigneeAgentId, status: 'blocked', currentSubtaskId: task.id, currentStep: '等待像素字体排版确认' });
      add(start + 10500, 'subtask.updated', { subtaskId: task.id, status: 'running' });
      add(start + 10500, 'agent.updated', { agentId: task.assigneeAgentId, status: 'running', currentSubtaskId: task.id, currentStep: specs[i][2] });
    }
    add(end, 'subtask.updated', { subtaskId: task.id, status: 'completed', summary: specs[i][3][2] });
    add(end, 'agent.updated', { agentId: task.assigneeAgentId, status: 'completed', currentSubtaskId: task.id, currentStep: specs[i][3][2] });
  });
  add(74000, 'run.updated', { status: 'completed' });
  schedule.sort((a, b) => a.at - b.at);
  const events = schedule.map((event, i) => ({ ...event, runId, seq: i + 1 }));
  const listeners = new Set();
  let elapsed = 0, cursor = 0, paused = false;
  function advance(ms) {
    if (paused || !Number.isFinite(ms) || ms < 0) return;
    elapsed = Math.min(74000, elapsed + ms);
    while (cursor < events.length && events[cursor].at <= elapsed) {
      const event = structuredClone(events[cursor++]);
      listeners.forEach(fn => fn(event));
    }
  }
  return {
    kind: 'mock', getSnapshot: () => structuredClone(initial),
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    advance, pause(value) { paused = Boolean(value); },
    reset() { elapsed = 0; cursor = 0; },
    getPlayback: () => ({ elapsed, duration: 74000, paused, completed: cursor === events.length }),
    dispose() { listeners.clear(); },
  };
}
