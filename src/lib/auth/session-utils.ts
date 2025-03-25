/**
 * Session Utilities
 * 
 * This file provides utilities for managing session persistence and restoration
 * across page navigations and browser refreshes. It works with both NextAuth
 * and Supabase authentication.
 */

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
export const saveSessionToStorage = (userData: UserData | null, isAdmin = false): void => {
  if (typeof window === 'undefined') return;
  
  try {
    if (userData) {
      // Validate the user ID is non-empty
      if (!isValidUser(userData)) {
        console.error('[SessionUtils] Cannot save user with invalid ID:', userData);
        return;
      }
      
      // Check if the data has changed before writing
      const currentData = localStorage.getItem(STORAGE_KEYS.USER);
      const currentAdmin = localStorage.getItem(STORAGE_KEYS.IS_ADMIN) === 'true';
      
      // Only update if the data is different
      if (!currentData || 
          isAdmin !== currentAdmin || 
          JSON.stringify(userData) !== currentData) {
        
        // Store user information
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
        // Store timestamp for expiry checking
        localStorage.setItem(STORAGE_KEYS.AUTH_TIME, Date.now().toString());
        // Store admin status separately for quick access
        localStorage.setItem(STORAGE_KEYS.IS_ADMIN, isAdmin.toString());
        
        console.log('[SessionUtils] Saved user session to storage:', userData.email);
      }
    } else {
      // Only clear if we actually have data stored
      if (localStorage.getItem(STORAGE_KEYS.USER)) {
        // Clear all session data
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.AUTH_TIME);
        localStorage.removeItem(STORAGE_KEYS.IS_ADMIN);
        
        console.log('[SessionUtils] Cleared user session from storage');
      }
    }
  } catch (error) {
    console.error('[SessionUtils] Error saving session:', error);
  }
};

// Cache for session information to avoid excessive localStorage reads
let cachedSession: StoredUser | null = null;

/**
 * Get user session data from localStorage
 * Returns null if no valid session exists or if session has expired
 * Uses a cache to reduce localStorage reads
 */
export function getSessionFromStorage(): { user: UserData | null; isAdmin: boolean } {
  if (typeof window === 'undefined') {
    return { user: null, isAdmin: false };
  }

  try {
    // Use cached value if available and recent (less than 1 second old)
    if (cachedSession && Date.now() - cachedSession.timestamp < 1000) {
      return { user: cachedSession.user, isAdmin: cachedSession.isAdmin };
    }
    
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const authTime = localStorage.getItem(STORAGE_KEYS.AUTH_TIME);
    const storedIsAdmin = localStorage.getItem(STORAGE_KEYS.IS_ADMIN) === 'true';
    
    if (!storedUser || !authTime) {
      cachedSession = { user: null, isAdmin: false, timestamp: Date.now() };
      return { user: null, isAdmin: false };
    }
    
    // Check if auth data is less than 4 hours old
    const authTimestamp = parseInt(authTime, 10);
    const now = Date.now();
    const fourHours = 4 * 60 * 60 * 1000;
    
    if (now - authTimestamp > fourHours) {
      // Auth data is too old, clear it
      console.log('[SessionUtils] Session expired, clearing');
      clearSessionStorage();
      
      cachedSession = { user: null, isAdmin: false, timestamp: Date.now() };
      return { user: null, isAdmin: false };
    }
    
    const user = JSON.parse(storedUser) as UserData;
    
    // Validate the user has a valid ID
    if (!isValidUser(user)) {
      console.error('[SessionUtils] Retrieved user with invalid ID, removing from storage');
      clearSessionStorage();
      cachedSession = { user: null, isAdmin: false, timestamp: Date.now() };
      return { user: null, isAdmin: false };
    }
    
    // Only log if we haven't logged recently
    if (!cachedSession || cachedSession.user?.email !== user.email) {
      console.log('[SessionUtils] Retrieved user session from storage:', user.email);
    }
    
    // Update the cache
    cachedSession = { user, isAdmin: storedIsAdmin, timestamp: Date.now() };
    return { user, isAdmin: storedIsAdmin };
  } catch (error) {
    console.error('[SessionUtils] Error reading session:', error);
    clearSessionStorage();
    return { user: null, isAdmin: false };
  }
}

/**
 * Check if the current user is an admin based on stored session
 */
export const checkIsAdminFromStorage = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Quick check from the dedicated flag
    const isAdmin = localStorage.getItem(STORAGE_KEYS.IS_ADMIN) === 'true';
    
    // Additional validation from user email
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (storedUser) {
      const user = JSON.parse(storedUser) as UserData;
      if (user.email?.endsWith('@seomax.com')) {
        return true;
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
export const clearSessionStorage = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TIME);
    localStorage.removeItem(STORAGE_KEYS.IS_ADMIN);
    console.log('[SessionUtils] Cleared all session data');
  } catch (error) {
    console.error('[SessionUtils] Error clearing session:', error);
  }
};

/**
 * Update admin status in storage without changing other session data
 */
export const updateAdminStatus = (isAdmin: boolean): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.IS_ADMIN, isAdmin.toString());
    console.log('[SessionUtils] Updated admin status in storage:', isAdmin);
  } catch (error) {
    console.error('[SessionUtils] Error updating admin status:', error);
  }
};

// Debug utility for logging session info
export function debugSessionInfo(location: string) {
  try {
    const session = getSessionFromStorage();
    const hasUser = !!session?.user;
    const userId = session?.user?.id || 'none';
    const isAdmin = checkIsAdminFromStorage();
    
    console.log(`[DEBUG:${location}] Session info:`, {
      hasValidSession: hasUser,
      userId,
      isAdmin,
      timestamp: new Date().toISOString()
    });
    
    return { hasUser, userId, isAdmin };
  } catch (e) {
    console.error(`[DEBUG:${location}] Error checking session:`, e);
    return { hasUser: false, userId: 'error', isAdmin: false };
  }
} 