import firebaseConfig from '../../firebase-applet-config.json';

const QUOTA_EXHAUSTED_KEY = 'firestore_quota_exhausted';

// Since the Firestore free-tier daily write quota is currently exhausted for this project today,
// start with true if stored in localStorage or default to true to immediately halt failing write retry streams
let isQuotaExhaustedMemory = true;

if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem(QUOTA_EXHAUSTED_KEY) ?? sessionStorage.getItem(QUOTA_EXHAUSTED_KEY);
    if (stored !== null) {
      isQuotaExhaustedMemory = stored === 'true';
    } else {
      // Mark stored as true to protect against unhandled backoff storms
      localStorage.setItem(QUOTA_EXHAUSTED_KEY, 'true');
      sessionStorage.setItem(QUOTA_EXHAUSTED_KEY, 'true');
      isQuotaExhaustedMemory = true;
    }
  } catch {
    isQuotaExhaustedMemory = true;
  }
}

const listeners = new Set<(exhausted: boolean) => void>();

export function isFirestoreQuotaExhausted(): boolean {
  if (isQuotaExhaustedMemory) return true;
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(QUOTA_EXHAUSTED_KEY) === 'true' || sessionStorage.getItem(QUOTA_EXHAUSTED_KEY) === 'true') {
      isQuotaExhaustedMemory = true;
      return true;
    }
  } catch {}
  return false;
}

export function markFirestoreQuotaExhausted(): void {
  if (isQuotaExhaustedMemory) return;
  isQuotaExhaustedMemory = true;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(QUOTA_EXHAUSTED_KEY, 'true');
      sessionStorage.setItem(QUOTA_EXHAUSTED_KEY, 'true');
    } catch {}
  }
  listeners.forEach(cb => {
    try { cb(true); } catch {}
  });
}

export function resetQuotaExhaustedForTesting(): void {
  isQuotaExhaustedMemory = false;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(QUOTA_EXHAUSTED_KEY);
      sessionStorage.removeItem(QUOTA_EXHAUSTED_KEY);
    } catch {}
  }
  listeners.forEach(cb => {
    try { cb(false); } catch {}
  });
}

export function isQuotaError(err: any): boolean {
  if (!err) return false;
  const code = (err.code || '').toString().toLowerCase();
  const msg = (err.message || '').toString().toLowerCase();
  return (
    code.includes('resource-exhausted') ||
    code.includes('quota') ||
    msg.includes('quota') ||
    msg.includes('resource-exhausted') ||
    msg.includes('free daily write units')
  );
}

export function getFirestoreUpgradeUrl(): string {
  const projectId = firebaseConfig.projectId;
  const dbId = firebaseConfig.firestoreDatabaseId;
  return `https://console.firebase.google.com/project/${projectId}/firestore/databases/${dbId}/data?openUpgradeDialog=true`;
}

export function subscribeToQuotaStatus(callback: (exhausted: boolean) => void): () => void {
  listeners.add(callback);
  callback(isFirestoreQuotaExhausted());
  return () => {
    listeners.delete(callback);
  };
}
