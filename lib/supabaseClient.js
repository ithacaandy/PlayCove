// lib/supabaseClient.js
'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Singleton Supabase browser client (App Router).
 * Uses @supabase/ssr so auth cookies + localStorage stay in sync with server.
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
let _client = null;

export function getSupabaseClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('⚠️ Supabase env vars missing. Check .env.local and restart dev server.');
    return null;
  }

  _client = createBrowserClient(url, key);
  return _client;
}
