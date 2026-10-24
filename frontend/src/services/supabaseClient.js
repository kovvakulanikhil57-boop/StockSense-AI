/**
 * StockSense AI — Supabase Client Instance
 * Uses the public project URL and Publishable/Anon key.
 * Never expose secret or service_role keys in frontend code.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize client only if anon key is configured; otherwise provide safe fallback
export const supabase = (SUPABASE_PROJECT_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

/**
 * Check if the frontend Supabase client is properly initialized
 */
export function isSupabaseReady() {
  return Boolean(supabase);
}
