// Transport-independent task state. A source supplies a snapshot followed by
// ordered events; rendering and mock scheduling never live in this module.
export const STATUS = { waiting: '等待', running: '运行中', blocked: '受阻', completed: '完成', failed: '失败', idle: '待命' };
const validStatus = value => Object.hasOwn(STATUS, value);
const clean = (value, max = 2000) => typeof value === 'string' ? value.slice(0, max) : '';
const copy = value => structuredClone(value);

/** @typedef {{runId:string, seq:number, type:string, payload:Object}} TaskEvent */
export function createTaskRuntime(initial) {
  let state;
  const listeners = new Set();
  const publish = () => { const snapshot = copy(state); listeners.forEach(fn => fn(snapshot)); };
  function reset(snapshot) {
    if (!snapshot?.run?.id || !Array.isArray(snapshot.agents) || !Array.isArray(snapshot.subtasks)) throw new Error('Invalid task snapshot');
    if (!validStatus(snapshot.run.status) || snapshot.agents.some(a => !a.id || !validStatus(a.status)) || new Set(snapshot.agents.map(a => a.id)).size !== snapshot.agents.length) throw new Error('Invalid agent snapshot');
    const ids = new Set(snapshot.agents.map(a => a.id));
    if (snapshot.subtasks.some(t => !t.id || !ids.has(t.assigneeAgentId) || !validStatus(t.status)) || new Set(snapshot.subtasks.map(t => t.id)).size !== snapshot.subtasks.length) throw new Error('Invalid subtask snapshot');
    state = copy({ ...snapshot, seq: snapshot.seq ?? 0, logs: Object.fromEntries(snapshot.agents.map(a => [a.id, (snapshot.logs?.[a.id] ?? []).slice(-200)])) });
    publish();
  }
  /** Invalid, stale and duplicate events leave both state and sequence intact. */
  function apply(event) {
    if (!event || event.runId !== state.run.id || !Number.isSafeInteger(event.seq) || event.seq <= state.seq || !event.payload || typeof event.payload !== 'object') return false;
    const p = event.payload;
    const agent = state.agents.find(a => a.id === p.agentId);
    const task = state.subtasks.find(t => t.id === p.subtaskId);
    switch (event.type) {
      case 'run.updated':
        if (!validStatus(p.status)) return false;
        state.run.status = p.status;
        break;
      case 'subtask.created':
        if (!p.id || state.subtasks.some(t => t.id === p.id) || !state.agents.some(a => a.id === p.assigneeAgentId) || !validStatus(p.status)) return false;
        state.subtasks.push({ id: clean(p.id, 100), runId: state.run.id, title: clean(p.title, 200), description: clean(p.description), assigneeAgentId: p.assigneeAgentId, dependsOn: [], status: p.status, summary: '' });
        break;
      case 'subtask.updated':
        if (!task || !validStatus(p.status)) return false;
        task.status = p.status;
        if (typeof p.summary === 'string') task.summary = clean(p.summary);
        break;
      case 'agent.updated':
        if (!agent || !validStatus(p.status)) return false;
        if (p.currentSubtaskId != null && !state.subtasks.some(t => t.id === p.currentSubtaskId && t.assigneeAgentId === agent.id)) return false;
        agent.status = p.status;
        agent.currentSubtaskId = p.currentSubtaskId ?? null;
        agent.currentStep = clean(p.currentStep, 300);
        break;
      case 'agent.output': {
        if (!agent || !task || task.assigneeAgentId !== agent.id || typeof p.text !== 'string' || !p.id || !Number.isFinite(p.timestamp)) return false;
        const logs = state.logs[agent.id];
        if (logs.some(log => log.id === p.id)) return false;
        logs.push({ id: clean(p.id, 100), agentId: agent.id, subtaskId: task.id, timestamp: p.timestamp, kind: ['info', 'tool', 'result', 'error'].includes(p.kind) ? p.kind : 'info', text: clean(p.text) });
        if (logs.length > 200) logs.splice(0, logs.length - 200);
        break;
      }
      default: return false;
    }
    state.seq = event.seq;
    state.run.updatedAt = event.seq;
    publish();
    return true;
  }
  reset(initial);
  return { apply, reset, getSnapshot: () => copy(state), subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, dispose() { listeners.clear(); } };
}

/** Explicit scene mapping, independent of backend entity order and actor names. */
export function createBindings(layout, displays) {
  return layout.actors.map((person, index) => {
    const stationId = `${layout.id}:station:${layout.stationFor[index]}`;
    const display = displays.find(d => d.kind === 'computer' && d.stationId === stationId);
    if (!display) throw new Error(`Missing computer: ${stationId}`);
    return { agentId: person.agentId ?? `${layout.id}:agent:${index}`, actorId: person.instanceId ?? `${layout.id}:actor:${index}`, characterId: person.characterId, appearanceId: person.appearanceId, actorIndex: index, stationId, displayId: display.id, roomId: display.roomId, name: person.name };
  });
}
