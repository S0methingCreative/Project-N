import firebaseConfig from '../../firebase-applet-config.json';

const QUOTA_EXHAUSTED_KEY = 'firestore_quota_exhausted';
const QUOTA_BACKOFF_MS = 5 * 60 * 1000; // 5-minute temporary backoff if a real quota error occurs

// Start with false so Firestore is enabled by default; clear any legacy sticky flag from localStorage
let isQuotaExhaustedMemory = false;
let quotaExhaustedAt = 0;

if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(QUOTA_EXHAUSTED_KEY);
    sessionStorage.removeItem(QUOTA_EXHAUSTED_KEY);
  } catch {}
}

const listeners = new Set<(exhausted: boolean) => void>();

export function isFirestoreQuotaExhausted(): boolean {
  if (!isQuotaExhaustedMemory) return false;
  if (Date.now() - quotaExhaustedAt > QUOTA_BACKOFF_MS) {
    isQuotaExhaustedMemory = false;
    quotaExhaustedAt = 0;
    return false;
  }
  return true;
}

export function markFirestoreQuotaExhausted(): void {
  if (isQuotaExhaustedMemory) return;
  isQuotaExhaustedMemory = true;
  quotaExhaustedAt = Date.now();
  listeners.forEach(cb => {
    try { cb(true); } catch {}
  });
}

export function resetQuotaExhaustedForTesting(): void {
  isQuotaExhaustedMemory = false;
  quotaExhaustedAt = 0;
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
