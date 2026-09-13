import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from './firestoreError';
import { recordActivity } from './dashboardService';

export async function loginWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  await syncUserProfile(user);
  await recordActivity({
    actionType: 'USER_LOGIN',
    description: `Operator signed in via Google: ${user.email}`,
    category: 'system',
  }).catch((err) => console.warn('Activity record skipped on login', err));
  return user;
}

export async function loginWithEmail(email: string, pass: string): Promise<FirebaseUser> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const user = result.user;
  await syncUserProfile(user);
  await recordActivity({
    actionType: 'USER_LOGIN',
    description: `Operator signed in: ${user.email}`,
    category: 'system',
  }).catch((err) => console.warn('Activity record skipped on login', err));
  return user;
}

export async function createAdminAccount(email: string, pass: string, displayName: string): Promise<FirebaseUser> {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  const user = result.user;
  if (displayName) {
    await updateProfile(user, { displayName });
  }
  await syncUserProfile(user, displayName);
  await recordActivity({
    actionType: 'SYSTEM_INITIALIZED',
    description: `Admin profile provisioned for ${user.email}`,
    category: 'system',
  }).catch((err) => console.warn('Activity record skipped on createAdmin', err));
  return user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function syncUserProfile(user: FirebaseUser, customName?: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const path = `users/${user.uid}`;
  const nowStr = new Date().toISOString();

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: customName || user.displayName || user.email?.split('@')[0] || 'Operator',
        role: 'admin',
        photoURL: user.photoURL || '',
        createdAt: nowStr,
        updatedAt: nowStr,
      };
      await setDoc(
        userRef,
        {
          ...newProfile,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );
      return newProfile;
    } else {
      const data = snap.data() as UserProfile;
      return data;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
