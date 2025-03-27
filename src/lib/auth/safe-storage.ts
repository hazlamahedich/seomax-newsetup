/**
 * Safe Storage Utility
 * 
 * This module provides safe access to browser localStorage with server-side rendering
 * compatibility. It wraps all localStorage operations with appropriate checks to prevent
 * errors when running in a server environment.
 */

/**
 * Safe browser storage access for both client and server environments
 */
const safeStorage = {
  /**
   * Get an item from localStorage with SSR safety
   */
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error(`[SafeStorage] Error accessing localStorage.getItem for ${key}:`, e);
      return null;
    }
  },
  
  /**
   * Set an item in localStorage with SSR safety
   */
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error(`[SafeStorage] Error accessing localStorage.setItem for ${key}:`, e);
    }
  },
  
  /**
   * Remove an item from localStorage with SSR safety
   */
  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`[SafeStorage] Error accessing localStorage.removeItem for ${key}:`, e);
    }
  },
  
  /**
   * Check if we're running in a browser environment
   */
  isBrowser: (): boolean => {
    return typeof window !== "undefined";
  }
};

export default safeStorage;
