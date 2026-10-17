// Optional compatibility layer. The engine itself owns no window-global API.
export function attachEmbedBridge(api, target = window) {
  const previous = target.PixOfficeVoxel;
  target.PixOfficeVoxel = api;
  function receive(event) {
    if (event.source !== target.parent || event.origin !== target.location.origin) return;
    const command = event.data;
    if (!command || command.type !== 'pixoffice-voxel:command') return;
    if (command.person !== undefined && !api.select(command.person)) return;
    if (command.action) api.action(command.action);
    if (command.expression) api.expression(command.expression);
    if (command.camera) api.camera(command.camera);
    if (typeof command.paused === 'boolean') api.pause(command.paused);
  }
  target.addEventListener('message', receive);
  if (target.parent !== target) target.parent.postMessage({ type: 'pixoffice-voxel:ready' }, target.location.origin);
  return () => {
    target.removeEventListener('message', receive);
    if (target.PixOfficeVoxel === api) {
      if (previous && !previous.disposed) target.PixOfficeVoxel = previous;
      else delete target.PixOfficeVoxel;
    }
  };
}
