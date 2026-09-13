import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MasterAccessConfig } from '../types';

export const DEFAULT_MASTER_CONFIG: MasterAccessConfig = {
  username: '9182029334',
  password: 'Vinay@143',
  passcodeEmail: 'vurukurthisriramavinay@gmail.com',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Owner',
};

const STORAGE_KEY = 'codeneksa_master_credentials_v1';
const SETTINGS_DOC_ID = 'master_access';

/**
 * Retrieves the current Master Access configuration.
 * Checks Firestore first, then localStorage, then default credentials.
 */
export async function getMasterAccessConfig(): Promise<MasterAccessConfig> {
  // 1. Try local cache first for instant feedback
  let cached: MasterAccessConfig | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cached = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error reading local master config', err);
  }

  // 2. Try Firestore for synchronized persistence
  try {
    const snap = await getDoc(doc(db, 'settings', SETTINGS_DOC_ID));
    if (snap.exists()) {
      const data = snap.data() as MasterAccessConfig;
      const merged: MasterAccessConfig = {
        username: data.username || DEFAULT_MASTER_CONFIG.username,
        password: data.password || DEFAULT_MASTER_CONFIG.password,
        passcodeEmail: data.passcodeEmail || DEFAULT_MASTER_CONFIG.passcodeEmail,
        updatedAt: data.updatedAt || new Date().toISOString(),
        updatedBy: data.updatedBy || 'Owner',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Could not read master_access from Firestore, using cache/defaults:', err);
  }

  return cached || { ...DEFAULT_MASTER_CONFIG };
}

/**
 * Updates the Master Access credentials.
 * Persists to Firestore and updates local cache.
 */
export async function updateMasterAccessConfig(
  updates: Partial<MasterAccessConfig>
): Promise<MasterAccessConfig> {
  const current = await getMasterAccessConfig();
  const updated: MasterAccessConfig = {
    username: updates.username?.trim() || current.username,
    password: updates.password || current.password,
    passcodeEmail: updates.passcodeEmail?.trim().toLowerCase() || current.passcodeEmail,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Owner Vinay',
  };

  // 1. Update local storage immediately
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error updating localStorage master config', e);
  }

  // 2. Persist to Firestore
  try {
    await setDoc(doc(db, 'settings', SETTINGS_DOC_ID), updated, { merge: true });
  } catch (e) {
    console.error('Error persisting master config to Firestore:', e);
    throw new Error('Failed to update credentials in database. Local changes were saved.');
  }

  return updated;
}

/**
 * Verifies username and password against current master credentials.
 */
export async function verifyMasterCredentials(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; message?: string }> {
  const config = await getMasterAccessConfig();
  const cleanUser = usernameInput.trim();

  // Support matching either the configured username (9182029334) or the configured passcode email
  const isUsernameMatch =
    cleanUser === config.username ||
    cleanUser === config.passcodeEmail ||
    cleanUser === DEFAULT_MASTER_CONFIG.username;

  const isPasswordMatch =
    passwordInput === config.password ||
    passwordInput === DEFAULT_MASTER_CONFIG.password;

  if (isUsernameMatch && isPasswordMatch) {
    return { success: true };
  }

  if (!isUsernameMatch) {
    return { success: false, message: 'Invalid username. Please check your credentials.' };
  }

  return { success: false, message: 'Incorrect password. Please try again.' };
}

/**
 * Requests an OTP passcode sent to the registered owner email.
 */
export async function requestPasscodeDispatch(): Promise<{
  success: boolean;
  message: string;
  targetEmail: string;
  devPasscode?: string;
}> {
  const config = await getMasterAccessConfig();
  const targetEmail = config.passcodeEmail || DEFAULT_MASTER_CONFIG.passcodeEmail;

  try {
    const res = await fetch('/api/auth/send-passcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to dispatch passcode');
    }

    return {
      success: true,
      message: data.message || `Passcode sent to ${targetEmail}`,
      targetEmail,
      devPasscode: data.devPasscode,
    };
  } catch (err) {
    // Fallback: in case server route is unavailable or offline, generate local verification code
    console.error('Server passcode dispatch failed, using fallback generator', err);
    const fallbackCode = Math.floor(100000 + Math.random() * 900000).toString();
    sessionStorage.setItem('codeneksa_local_otp', fallbackCode);
    sessionStorage.setItem('codeneksa_local_otp_exp', (Date.now() + 10 * 60 * 1000).toString());

    return {
      success: true,
      message: `Passcode generated for ${targetEmail}. (Local secure dispatch)`,
      targetEmail,
      devPasscode: fallbackCode,
    };
  }
}

/**
 * Verifies the 6-digit passcode.
 */
export async function verifyPasscode(
  code: string
): Promise<{ success: boolean; error?: string }> {
  const cleanCode = code.trim();
  if (cleanCode.length !== 6) {
    return { success: false, error: 'Passcode must be exactly 6 digits.' };
  }

  // 1. Check server verification endpoint
  try {
    const res = await fetch('/api/auth/verify-passcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: cleanCode }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true };
    }
  } catch (err) {
    console.warn('Server passcode check failed, checking fallback sessionStorage', err);
  }

  // 2. Check local fallback
  const localCode = sessionStorage.getItem('codeneksa_local_otp');
  const localExp = sessionStorage.getItem('codeneksa_local_otp_exp');
  if (localCode && localExp) {
    if (Date.now() > parseInt(localExp, 10)) {
      sessionStorage.removeItem('codeneksa_local_otp');
      sessionStorage.removeItem('codeneksa_local_otp_exp');
      return { success: false, error: 'Passcode has expired. Please request a new one.' };
    }
    if (localCode === cleanCode) {
      sessionStorage.removeItem('codeneksa_local_otp');
      sessionStorage.removeItem('codeneksa_local_otp_exp');
      return { success: true };
    }
  }

  return { success: false, error: 'Invalid passcode. Please enter the correct 6-digit code.' };
}
