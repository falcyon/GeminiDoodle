// Persistent cache: localStorage (L1) + Firebase Realtime DB (L2)
// Keys are pre-normalized by Gemini (see gemini.js normalizePrompt).

const LS_PREFIX = 'objcache:';

// Firebase keys cannot contain . $ # [ ] /
function encodeFirebaseKey(key) {
  return key.replace(/[.$#\[\]/]/g, '_');
}

export const LS_PREFIX_EXPORT = LS_PREFIX;

export async function fetchAllFirebase() {
  const firebaseUrl = import.meta.env.VITE_FIREBASE_DB_URL || '';
  if (!firebaseUrl) return {};
  try {
    const res = await fetch(`${firebaseUrl}/cache.json`);
    if (!res.ok) return {};
    const data = await res.json();
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

export function createCache() {
  const firebaseUrl = import.meta.env.VITE_FIREBASE_DB_URL || '';

  function getLocal(key) {
    try {
      const val = localStorage.getItem(LS_PREFIX + key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  }

  function setLocal(key, code) {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(code));
    } catch { /* storage full — ignore */ }
  }

  async function getFirebase(key) {
    if (!firebaseUrl) return null;
    try {
      const fbKey = encodeFirebaseKey(key);
      const res = await fetch(`${firebaseUrl}/cache/${fbKey}.json`);
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data === 'string' ? data : null;
    } catch {
      return null;
    }
  }

  function setFirebase(key, code) {
    if (!firebaseUrl) return;
    const fbKey = encodeFirebaseKey(key);
    // Fire-and-forget
    fetch(`${firebaseUrl}/cache/${fbKey}.json`, {
      method: 'PUT',
      body: JSON.stringify(code),
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  }

  return {
    async get(key) {
      // L1: localStorage
      const local = getLocal(key);
      if (local) {
        console.log('[Cache hit] localStorage:', key);
        return local;
      }

      // L2: Firebase
      const remote = await getFirebase(key);
      if (remote) {
        console.log('[Cache hit] Firebase:', key);
        setLocal(key, remote); // promote to L1
        return remote;
      }

      console.log('[Cache miss]', key);
      return null;
    },

    set(key, code) {
      setLocal(key, code);
      setFirebase(key, code);
    },
  };
}
