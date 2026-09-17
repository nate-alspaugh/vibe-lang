const DB_NAME = 'vibr';
const STORE = 'workspace';
const KEY = 'current';
const FALLBACK_KEY = 'vibr-workspace';

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

function run(mode, action) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const request = action(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function loadWorkspace() {
  try {
    const stored = await run('readonly', (store) => store.get(KEY));
    if (stored) return stored;
  } catch {}
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveWorkspace(workspace) {
  try {
    await run('readwrite', (store) => store.put(workspace, KEY));
    return true;
  } catch {
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(workspace));
      return true;
    } catch {
      return false;
    }
  }
}

export async function askForPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {}
}
