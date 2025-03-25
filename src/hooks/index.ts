// Export all hooks from this file for easier imports
import { useAuth as useOldAuth } from './useAuth.tsx';
import { useSupabaseAuth } from './useAuth.ts';
import { useAuthHook } from './auth-hooks';
import { useExtendedAuth } from '@/components/providers/auth-provider';

// Re-export the enhanced auth hook as useAuth for backward compatibility
export const useAuth = useExtendedAuth;

// Export other hooks with proper naming to avoid conflicts
export { useSupabaseAuth, useAuthHook }; 