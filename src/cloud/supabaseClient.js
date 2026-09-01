import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://appesztafatypbxzdunr.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_70RugEcKQxZWUa5eQfmyeg_y7AkVz9V';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'snippets-auth'
  }
});
