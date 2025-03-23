// Export all hooks from this file for easier imports
import { useAuth } from './useAuth.tsx';
import { useSupabaseAuth } from './useAuth.ts';
import { useAuthHook } from './auth-hooks';

// Export hooks with proper naming to avoid conflicts
// Note: TypeScript will resolve the imports during compilation
export { useAuth, useSupabaseAuth, useAuthHook }; 