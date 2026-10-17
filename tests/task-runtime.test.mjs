import test from 'node:test';
import assert from 'node:assert/strict';
import { createTaskRuntime, createBindings } from '../src/shared/task-runtime.js';
import { createMockTaskSource } from '../src/shared/mock-task-source.js';
import { smallOffice, teamOffice } from '../src/layouts.js';
import { floorOffice } from '../src/floor/layout.js';
import { loftOffice } from '../src/loft/layout.js';
import { suiteOffice } from '../src/suite/layout.js';
import { boardPages, wrapText } from '../src/shared/task-display-renderers.js';
import * as THREE from 'three';
import { displayCameraPose } from '../src/shared/display-focus.js';

function fixture(layout = smallOffice) {
  const displays = layout.stations.map((_, i) => ({ id: `display-${i}`, kind: 'computer', stationId: `${layout.id}:station:${i}`, roomId: layout.stations[i].room }));
  const bindings = createBindings(layout, displays.reverse());
  const source = createMockTaskSource(bindings);
  const runtime = createTaskRuntime(source.getSnapshot());
  source.subscribe(runtime.apply);
  return { bindings, source, runtime };
}

test('all layouts bind actors to their assigned stations, independent of display order', () => {
  for (const layout of [smallOffice, teamOffice, loftOffice, suiteOffice, floorOffice]) {
    const { bindings } = fixture(layout);
    assert.equal(new Set(bindings.map(b => b.displayId)).size, layout.capacity);
    bindings.forEach((b, i) => assert.equal(b.displayId, `display-${layout.stationFor[i]}`));
    if (layout.rooms) bindings.forEach(b => assert.ok(b.roomId));
  }
  assert.equal(fixture().bindings[0].displayId, 'display-1');
  assert.throws(() => createBindings(smallOffice, []), /Missing computer/);
});

test('deterministic playback has parallel agents, blocked recovery and a final result', () => {
  const { source, runtime } = fixture();
  source.advance(9000);
  let state = runtime.getSnapshot();
  assert.equal(state.subtasks.filter(t => t.status === 'running').length, 3);
  assert.ok(Object.values(state.logs).filter(logs => logs.length).length >= 2);
  assert.notDeepEqual(Object.values(state.logs)[0], Object.values(state.logs)[1]);
  source.advance(20000);
  assert.equal(runtime.getSnapshot().subtasks[3].status, 'blocked');
  source.advance(5000);
  assert.equal(runtime.getSnapshot().subtasks[3].status, 'running');
  source.advance(50000);
  state = runtime.getSnapshot();
  assert.equal(state.run.status, 'completed');
  assert.equal(state.subtasks.filter(t => t.status === 'completed').length, 6);
  assert.equal(source.getPlayback().elapsed, 74000);
});

test('pause freezes events; reset and re-advance reproduce the identical state', () => {
  const { source, runtime } = fixture();
  source.advance(12000);
  const first = runtime.getSnapshot();
  source.pause(true); source.advance(50000);
  assert.deepEqual(runtime.getSnapshot(), first);
  assert.equal(source.getPlayback().elapsed, 12000);
  source.reset(); runtime.reset(source.getSnapshot());
  assert.equal(runtime.getSnapshot().seq, 0);
  assert.ok(Object.values(runtime.getSnapshot().logs).every(logs => !logs.length));
  source.pause(false); source.advance(12000);
  assert.deepEqual(runtime.getSnapshot(), first);
});

test('invalid or stale events cannot mutate state, consume a sequence or cross agent logs', () => {
  const { runtime, bindings } = fixture();
  const before = runtime.getSnapshot(), runId = before.run.id;
  const event = { runId, seq: 1, type: 'agent.output', payload: { agentId: bindings[1].agentId, subtaskId: 'task-1', id: 'x', text: 'wrong agent', timestamp: 0 } };
  assert.equal(runtime.apply(event), false);
  assert.deepEqual(runtime.getSnapshot(), before);
  event.payload.agentId = bindings[0].agentId;
  assert.equal(runtime.apply(event), true);
  assert.equal(runtime.apply(event), false);
  assert.equal(runtime.apply({ ...event, runId: 'other', seq: 2 }), false);
  assert.equal(runtime.apply({ ...event, seq: 0 }), false);
  assert.equal(runtime.getSnapshot().logs[bindings[0].agentId].length, 1);
  const detached = runtime.getSnapshot(); detached.run.title = 'changed';
  assert.equal(runtime.getSnapshot().run.title, before.run.title);
});

test('output is capped; subscriptions can be detached', () => {
  const { runtime, bindings } = fixture();
  let calls = 0; const unsubscribe = runtime.subscribe(() => calls++);
  for (let seq = 1; seq <= 220; seq++) runtime.apply({ runId: 'voxel-task-demo', seq, type: 'agent.output', payload: { agentId: bindings[0].agentId, subtaskId: 'task-1', id: `id-${seq}`, text: '输出'.repeat(2000), timestamp: seq } });
  const logs = runtime.getSnapshot().logs[bindings[0].agentId];
  assert.equal(logs.length, 200); assert.equal(logs[0].id, 'id-21'); assert.equal(logs[0].text.length, 2000); assert.equal(calls, 220);
  unsubscribe(); runtime.apply({ runId: 'voxel-task-demo', seq: 221, type: 'run.updated', payload: { status: 'failed' } });
  assert.equal(calls, 220);
});

test('long CJK and mixed text paginates without losing body or title content', () => {
  const ctx = { measureText: text => ({ width: Array.from(text).reduce((w, c) => w + (c.charCodeAt(0) < 128 ? 6 : 12), 0) }) };
  assert.deepEqual(wrapText(ctx, '中文AB中文', 36), ['中文AB', '中文']);
  const task = { title: '很长的中文标题'.repeat(12), description: '说明内容和agent日志'.repeat(50) };
  const layout = boardPages(ctx, 576, 132, [task]);
  assert.ok(layout.pages > 1);
  assert.equal(layout.cards.flatMap(c => c.body).join(''), task.description);
  assert.ok(layout.cards.some(c => c.title.join('').includes('标题')));
  assert.equal(boardPages(ctx, 576, 132, []).pages, 1);
});

test('display framing faces rotated panels and keeps all corners inside a portrait viewport', () => {
  const camera = new THREE.OrthographicCamera(-10, 10, 18, -18, .1, 100);
  const group = new THREE.Group(); group.position.set(7, 0, -4); group.rotation.y = Math.PI / 2;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.2)); mesh.position.set(0, 2, .06); group.add(mesh);
  const pose = displayCameraPose(camera, { mesh, width: 3, height: 1.2 }, { clientWidth: 390, clientHeight: 700 });
  const center = mesh.getWorldPosition(new THREE.Vector3());
  assert.ok(pose.position.x > center.x); assert.ok(Math.abs(pose.position.z - center.z) < .001);
  camera.position.copy(pose.position); camera.zoom = pose.zoom; camera.lookAt(pose.target); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  for (const x of [-1.5, 1.5]) for (const y of [-.6, .6]) {
    const p = mesh.localToWorld(new THREE.Vector3(x, y, 0)).project(camera);
    assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1, 'all panel corners must remain visible');
  }
  mesh.geometry.dispose(); mesh.material.dispose();
});
