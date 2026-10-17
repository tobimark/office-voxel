import * as THREE from 'three';

/** Orthographic framing uses the display's world transform, including rotated rooms. */
export function displayCameraPose(camera, entry, viewport) {
  entry.mesh.updateWorldMatrix(true, false);
  const target = entry.mesh.getWorldPosition(new THREE.Vector3());
  const orientation = entry.mesh.getWorldQuaternion(new THREE.Quaternion());
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(orientation).normalize();
  const scale = entry.mesh.getWorldScale(new THREE.Vector3());
  const w = entry.width * scale.x, h = entry.height * scale.y;
  const availableWidth = Math.max(160, viewport.clientWidth - 48) / viewport.clientWidth;
  const availableHeight = Math.max(140, viewport.clientHeight - 220) / viewport.clientHeight;
  const zoom = Math.min((camera.right - camera.left) / w * availableWidth, (camera.top - camera.bottom) / h * availableHeight) * .94;
  return { target, position: target.clone().addScaledVector(normal, .58).add(new THREE.Vector3(0, .002, 0)), zoom };
}

export function createDisplayFocus({ camera, controls, viewport, onPose, onExit }) {
  let active = null, previous = null;
  function focus(entry) {
    if (!previous) previous = { minZoom: controls.minZoom, maxZoom: controls.maxZoom, minPolarAngle: controls.minPolarAngle, maxPolarAngle: controls.maxPolarAngle };
    active = entry;
    controls.minZoom = .2; controls.maxZoom = 160;
    controls.minPolarAngle = .01; controls.maxPolarAngle = Math.PI / 2 + .01;
    const pose = { ...displayCameraPose(camera, entry, viewport), deadline: performance.now() + 900 };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      camera.position.copy(pose.position); camera.zoom = pose.zoom; controls.target.copy(pose.target); camera.updateProjectionMatrix(); controls.update();
      onPose(null);
    } else onPose(pose);
    return true;
  }
  function exit() {
    if (previous) Object.assign(controls, previous);
    active = null; previous = null;
    onExit?.();
  }
  const observer = new ResizeObserver(() => { if (active) focus(active); });
  observer.observe(viewport);
  return { focus, exit, get active() { return active; }, dispose() { observer.disconnect(); exit(); } };
}
