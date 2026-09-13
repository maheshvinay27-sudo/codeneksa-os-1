import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile } from '../types';
import {
  loginWithGoogle as svcLoginGoogle,
  loginWithEmail as svcLoginEmail,
  createAdminAccount as svcCreateAdmin,
  logoutUser as svcLogout,
  syncUserProfile,
} from '../services/authService';
import {
  verifyMasterCredentials,
  verifyPasscode,
  getMasterAccessConfig,
} from '../services/masterAuthService';
import { recordActivity } from '../services/dashboardService';

const SESSION_STORAGE_KEY = 'codeneksa_master_session_v1';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithMasterCredentials: (username: string, pass: string) => Promise<void>;
  loginWithPasscode: (passcode: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  createAdminAccount: (email: string, pass: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadProfile = async (fbUser: FirebaseUser) => {
    try {
      const snap = await getDoc(doc(db, 'users', fbUser.uid));
      if (snap.exists()) {
        setUserProfile(snap.data() as UserProfile);
      } else {
        const synced = await syncUserProfile(fbUser);
        setUserProfile(synced);
      }
    } catch (err) {
      console.warn('Could not load user profile, falling back to minimal', err);
      setUserProfile({
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || 'Operator',
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Restore master session or listen to Firebase Auth
  useEffect(() => {
    // 1. Check for stored Master Owner session
    try {
      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession) as UserProfile;
        if (parsed && parsed.uid) {
          setUserProfile(parsed);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not read saved session', e);
    }

    // 2. Otherwise listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadProfile(currentUser);
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Primary Login: Username & Password
   */
  const loginWithMasterCredentials = async (username: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await verifyMasterCredentials(username, pass);
      if (!res.success) {
        throw new Error(res.message || 'Invalid username or password.');
      }

      const config = await getMasterAccessConfig();
      const ownerProfile: UserProfile = {
        uid: 'master_owner_vinay',
        email: config.passcodeEmail || 'vurukurthisriramavinay@gmail.com',
        displayName: 'Vinay (Owner)',
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(ownerProfile));
      setUserProfile(ownerProfile);

      await recordActivity({
        actionType: 'USER_LOGIN',
        description: `Owner authenticated via credentials (${config.username})`,
        category: 'system',
      }).catch((e) => console.warn('Activity record skipped', e));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Alternative Login: 6-Digit Email Passcode
   */
  const loginWithPasscode = async (passcode: string) => {
    setIsLoading(true);
    try {
      const res = await verifyPasscode(passcode);
      if (!res.success) {
        throw new Error(res.error || 'Invalid passcode.');
      }

      const config = await getMasterAccessConfig();
      const ownerProfile: UserProfile = {
        uid: 'master_owner_vinay',
        email: config.passcodeEmail || 'vurukurthisriramavinay@gmail.com',
        displayName: 'Vinay (Owner)',
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(ownerProfile));
      setUserProfile(ownerProfile);

      await recordActivity({
        actionType: 'USER_LOGIN',
        description: `Owner authenticated via 6-digit email passcode (${ownerProfile.email})`,
        category: 'system',
      }).catch((e) => console.warn('Activity record skipped', e));
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const fbUser = await svcLoginGoogle();
      await loadProfile(fbUser);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const fbUser = await svcLoginEmail(email, pass);
      await loadProfile(fbUser);
    } finally {
      setIsLoading(false);
    }
  };

  const createAdminAccount = async (email: string, pass: string, displayName: string) => {
    setIsLoading(true);
    try {
      const fbUser = await svcCreateAdmin(email, pass, displayName);
      await loadProfile(fbUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      await svcLogout().catch(() => {});
      setUser(null);
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        setUserProfile(JSON.parse(saved));
        return;
      } catch (e) {
        console.warn(e);
      }
    }
    if (user) {
      await loadProfile(user);
    }
  };

  const isAuthenticated = Boolean(userProfile || user);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isLoading,
        isAuthenticated,
        loginWithMasterCredentials,
        loginWithPasscode,
        loginWithGoogle,
        loginWithEmail,
        createAdminAccount,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
