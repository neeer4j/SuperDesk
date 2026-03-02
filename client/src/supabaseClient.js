import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const serverUrl = process.env.REACT_APP_SERVER_URL || 'https://superdesk-7m7f.onrender.com';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found in environment variables');
}

// Route all Supabase API calls through the server proxy so that clients whose
// ISP DNS blocks supabase.co can still authenticate and use the database.
const effectiveSupabaseUrl = `${serverUrl}/supabase-proxy`;

// Create Supabase client with explicit persistence configuration
// This ensures session is properly retained across page reloads
export const supabase = createClient(effectiveSupabaseUrl, supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'superdesk-auth-token', // Explicit key to match agent
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});
