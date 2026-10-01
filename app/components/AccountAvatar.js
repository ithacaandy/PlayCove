'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import { getSupabaseClient } from '../../lib/supabaseClient';
export default function AccountAvatar() {
  const [profile, setProfile] = useState({ name: '', src: null });
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = getSupabaseClient();
        const { data: { user }, error } = await s.auth.getUser();
        if (error || !user || !mounted) return;
        setProfile({ name: user.user_metadata?.full_name || user.email || '', src: user.user_metadata?.avatar_url || null });
        const { data } = await s.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle();
        if (mounted && data) setProfile({ name: data.full_name || user.email || '', src: data.avatar_url || null });
      } catch { /* Retain the avatar fallback if profile loading fails. */ }
    })();
    return () => { mounted = false; };
  }, []);
  return <Link href="/account" aria-label="Go to account" className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"><Avatar name={profile.name} src={profile.src} size="sm" bgClassName="bg-[var(--paper)]" /></Link>;
}