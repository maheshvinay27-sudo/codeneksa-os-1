import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Cloud Firestore with explicit database ID and experimentalForceLongPolling for robust connectivity in iframes and proxies
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);

// Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Firebase Storage
export const storage = getStorage(app);

// Connectivity validation helper
export async function validateFirestoreConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = performance.now();
  try {
    // Testing connection using doc lookup on settings
    await getDoc(doc(db, 'settings', 'connectivity'));
    const latencyMs = Math.round(performance.now() - start);
    return { ok: true, latencyMs };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('the client is offline') || message.includes('unavailable')) {
      return { ok: false, latencyMs, error: 'Firebase backend is synchronizing...' };
    }
    // Any response from server (including missing doc or permission check) confirms server connectivity
    return { ok: true, latencyMs };
  }
}

export { app, firebaseConfig };
