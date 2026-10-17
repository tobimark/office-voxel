// Release in reverse construction order, including after partial initialization.
export function createLifetime() {
  const cleanups = [];
  let disposed = false;
  return {
    get disposed() { return disposed; },
    add(cleanup) {
      if (disposed) cleanup();
      else cleanups.push(cleanup);
      return cleanup;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const errors = [];
      for (const cleanup of cleanups.reverse()) {
        try { cleanup(); } catch (error) { errors.push(error); }
      }
      cleanups.length = 0;
      if (errors.length) throw new AggregateError(errors, 'Scene cleanup failed');
    },
  };
}
