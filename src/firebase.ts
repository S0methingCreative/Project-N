import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App instance singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Connect to specified Firestore database ID if provisioned
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

import { isFirestoreQuotaExhausted, markFirestoreQuotaExhausted } from './services/firestoreQuotaService';

// Critical Constraint: Test connection from server on boot
export async function testConnection(): Promise<boolean> {
  if (isFirestoreQuotaExhausted()) {
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is currently offline or unreachable:', error.message);
    } else if (
      (error as any)?.code === 'resource-exhausted' ||
      (error as any)?.message?.includes('Quota limit exceeded')
    ) {
      markFirestoreQuotaExhausted();
      return false;
    } else {
      // It's normal if document does not exist yet; network path is reachable
      return true;
    }
    return false;
  }
}

// Deferred connection verification off the initial startup path
if (typeof window !== 'undefined') {
  window.setTimeout(() => {
    testConnection().catch(() => {});
  }, 3000);
}
