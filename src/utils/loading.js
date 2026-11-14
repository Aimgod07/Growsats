const tasks = new Map();
const failures = new Map();
const listeners = new Set();
let snapshot = { pending: 0, errors: [], version: 0 };
function publish() {
  snapshot = { pending: tasks.size, errors: [...failures.values()], version: snapshot.version + 1 };
  listeners.forEach(listener => listener());
}
export const subscribeLoading = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const getLoadingSnapshot = () => snapshot;
export function clearLoadingErrors() { failures.clear(); publish(); }
export function beginLoading(label) {
  const id = Symbol(label);
  failures.delete(label);
  tasks.set(id, label);
  publish();
  let finished = false;
  return error => {
    if (finished) return;
    finished = true;
    tasks.delete(id);
    if (error && error.status !== 401) failures.set(label, { label, message: error.message });
    publish();
  };
}

/** Track the complete response body, not just arrival of response headers. */
export async function trackedFetch(url, options = {}) {
  const finish = beginLoading(String(url));
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 20000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (response.clone) await response.clone().arrayBuffer();
    finish(response.ok ? null : Object.assign(new Error('A request could not be completed.'), { status: response.status }));
    return response;
  } catch (error) {
    finish(error);
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}

// Trusted same-origin srcDoc screens share this request tracker with React.
if (typeof window !== 'undefined') window.__playlootTrackedFetch = trackedFetch;
