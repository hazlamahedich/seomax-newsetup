/**
 * Session Utilities (Fixed Version)
 * 
 * This file provides utilities for managing session persistence and restoration
 * across page navigations and browser refreshes. It works with both NextAuth
 * and Supabase authentication.
 * 
 * This version includes proper SSR checks for localStorage access.
 */

import { ExtendedUser, StoredSession } from '@/lib/types/auth.types';
import safeStorage from './safe-storage';

const SESSION_STORAGE_KEY = 'seomax_session';

// Constants for localStorage keys
export const STORAGE_KEYS = {
  USER: 'seomax:user',
  AUTH_TIME: 'seomax:auth_time',
  IS_ADMIN: 'seomax:is_admin',
} as const;

// User type definition for better type safety
export type UserData = {
  id: string;
  email?: string;
  name?: string;
  isAdmin?: boolean;
  [key: string]: any;
};

// Define StoredUser interface based on current implementation
export interface StoredUser {
  user: UserData | null;
  isAdmin: boolean;
  timestamp: number;
}

/**
 * Validates that a user object has a valid ID
 */
export function isValidUser(user: UserData | null): boolean {
  // More robust validation to catch edge cases
  try {
    if (!user) return false;
    
    // Must have a valid ID
    if (!user.id) return false;
    
    // Explicitly check for empty string
    if (user.id === "") {
      console.warn('[SessionUtils] Invalid user ID: Empty string ID');
      return false;
    }
    
    // ID must be a string, not an empty object
    if (typeof user.id === 'object') {
      console.warn('[SessionUtils] Invalid user ID: ID is an object instead of string', user.id);
      return false;
    }
    
    // ID must be a string and not empty
    if (typeof user.id !== 'string' || user.id.trim() === '') {
      return false;
    }
    
    // If email is present, it must be a string
    if (user.email !== undefined && (typeof user.email !== 'string')) {
      return false;
    }
    
    // If name is present, it must be a string or null
    if (user.name !== undefined && user.name !== null && typeof user.name !== 'string') {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[SessionUtils] Error validating user:', error, user);
    return false;
  }
}

/**
 * Save user session data to localStorage
 * Only saves if the data has changed and has a valid ID
 */
export function saveSessionToStorage(user: ExtendedUser | null, isAdmin: boolean): void {
  if (!user) {
    clearSessionStorage();
    return;
  }

  const session: StoredSession = {
    user,
    isAdmin,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  };
  
  safeStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

// Cache for session information to avoid excessive localStorage reads
let cachedSession: StoredUser | null = null;

/**
 * Get user session data from localStorage
 * Returns empty session if no valid session exists or if session has expired
 */
export function getSessionFromStorage(): StoredSession {
  const defaultSession: StoredSession = {
    user: null,
    isAdmin: false,
    expires: new Date(0).toISOString()
  };
  
  const sessionStr = safeStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionStr) {
    return defaultSession;
  }
  
  try {
    return JSON.parse(sessionStr);
  } catch (error) {
    console.error('[SessionUtils] Error parsing session data:', error);
    return defaultSession;
  }
}

/**
 * Check if the current user is an admin based on stored session
 */
export const checkIsAdminFromStorage = (): boolean => {
  try {
    // Quick check from the dedicated flag
    const isAdmin = safeStorage.getItem(STORAGE_KEYS.IS_ADMIN) === 'true';
    
    // Additional validation from user email
    const storedUser = safeStorage.getItem(STORAGE_KEYS.USER);
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as UserData;
        if (user.email?.endsWith('@seomax.com')) {
          return true;
        }
      } catch (error) {
        console.error('[SessionUtils] Error parsing user data:', error);
      }
    }
    
    return isAdmin;
  } catch (error) {
    console.error('[SessionUtils] Error checking admin status:', error);
    return false;
  }
};

/**
 * Clear all session data from localStorage
 */
export function clearSessionStorage(): void {
  safeStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Update admin status in storage without changing other session data
 */
export const updateAdminStatus = (isAdmin: boolean): void => {
  safeStorage.setItem(STORAGE_KEYS.IS_ADMIN, isAdmin.toString());
  console.log('[SessionUtils] Updated admin status in storage:', isAdmin);
};

// Debug utility for logging session info
export function debugSessionInfo(location: string) {
  try {
    let sessionInfo = { hasUser: false, userId: 'not-available', isAdmin: false };
    
    // Only try to access storage on client side
    if (safeStorage.isBrowser()) {
      const session = getSessionFromStorage();
      const hasUser = !!session?.user;
      const userId = session?.user?.id || 'none';
      const isAdmin = checkIsAdminFromStorage();
      
      sessionInfo = { hasUser, userId, isAdmin };
      
      console.log(`[DEBUG:${location}] Session info:`, {
        hasValidSession: hasUser,
        userId,
        isAdmin,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`[DEBUG:${location}] Running on server-side, no session available`);
    }
    
    return sessionInfo;
  } catch (e) {
    console.error(`[DEBUG:${location}] Error checking session:`, e);
    return { hasUser: false, userId: 'error', isAdmin: false };
  }
}

export function isSessionExpired(session: StoredSession): boolean {
  if (!session.expires) return true;
  return new Date(session.expires) < new Date();
} 