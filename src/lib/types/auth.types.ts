import { User as SupabaseUser } from '@supabase/supabase-js';
import { Session as NextAuthSession } from 'next-auth';
import { ServiceError } from './common';

// Base user type that extends Supabase User with additional properties
export interface ExtendedUser extends Omit<SupabaseUser, 'confirmed_at' | 'email_confirmed_at' | 'phone_confirmed_at' | 'last_sign_in_at'> {
  __supabase?: boolean;
  __nextauth?: boolean;
  name?: string | null;
  image?: string | null;
  confirmed_at?: string | null;
  email_confirmed_at?: string | null;
  phone_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
}

// Extended session type that works with both NextAuth and Supabase
export interface ExtendedSession extends Omit<NextAuthSession, 'user'> {
  user?: ExtendedUser | null;
  isAdmin?: boolean;
  expires: string;
}

// Response type for auth operations
export interface AuthResponse {
  user: ExtendedUser | null;
  error?: ServiceError;
}

// Type for storing user data in local storage
export interface StoredSession {
  user: ExtendedUser | null;
  isAdmin: boolean;
  expires: string;
}

// Auth context type
export interface AuthContextType {
  supabaseUser: ExtendedUser | null;
  loading: boolean;
  supabaseSignIn: (email: string, password: string) => Promise<AuthResponse>;
  supabaseSignOut: () => Promise<void>;
  isAdmin: () => boolean;
  getActiveUser: () => ExtendedUser | null;
  refreshAuth: () => Promise<ExtendedUser | null>;
  synchronizeSupabaseSession: () => Promise<void>;
  checkProjectAccess: (projectId: string) => Promise<boolean>;
}

// Type guard functions
export function isExtendedUser(user: any): user is ExtendedUser {
  return (
    user &&
    typeof user.id === 'string' &&
    user.id.trim() !== '' &&
    (!user.email || typeof user.email === 'string')
  );
}

export function isExtendedSession(session: any): session is ExtendedSession {
  return (
    session &&
    typeof session.expires === 'string' &&
    (!session.user || isExtendedUser(session.user))
  );
}

// Helper function to convert NextAuth session to ExtendedSession
export function convertNextAuthToExtendedSession(session: NextAuthSession | null): ExtendedSession | null {
  if (!session?.user) return null;

  const extendedUser: ExtendedUser = {
    id: session.user.id,
    email: session.user.email || '',
    phone: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    factors: [],
    name: session.user.name,
    image: session.user.image,
    __nextauth: true,
    aud: 'authenticated'
  };

  return {
    ...session,
    user: extendedUser,
    isAdmin: session.user.email?.endsWith('@seomax.com') || false,
    expires: session.expires
  };
} 