import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found in environment variables');
}

// Create Supabase client with explicit persistence configuration
// This ensures session is properly retained across page reloads
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'superdesk-auth-token', // Explicit key to match agent
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});
