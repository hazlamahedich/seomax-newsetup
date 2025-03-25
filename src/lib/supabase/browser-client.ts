import { createClient } from '@supabase/supabase-js';

// This client is for client-side usage (singleton)
export const browserClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    auth: {
      persistSession: true,
    },
  }
); 