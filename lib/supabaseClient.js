// lib/supabaseClient.js
'use client';

import { createBrowserClient } from '@supabase/ssr';
import { homeFeedStore } from './home-feed';

let supabase;

export function getSupabaseClient() {
  if (!supabase) {
    supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    if (typeof window !== 'undefined') {
      supabase.auth.onAuthStateChange((event, session) => {
        homeFeedStore.setAccount(session?.user?.id || null);
        if (event === 'SIGNED_OUT') homeFeedStore.clear();
      });
    }
  }
  return supabase;
}
