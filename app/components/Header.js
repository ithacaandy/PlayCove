// app/components/Header.js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

const supabase = getSupabaseClient();

const LINKS = [
  { href: '/groups', label: 'My Groups' },
  { href: '/mine', label: 'My Posts' },
  { href: '/new', label: 'New Post', type: 'action' }, // yellow +
  { href: '/groups/discover', label: 'Discover' },
];

export default function Header() {
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (!supabase) return;
    let unsub = () => {};

    async function init() {
      const { data: sres } = await supabase.auth.getSession();
      const u = sres?.session?.user || null;
      setUser(u);
      const md = u?.user_metadata || {};
      setDisplay(md.name || md.full_name || u?.email?.split('@')?.[0] || '');
      setAvatarUrl(md.avatar_url || md.picture || '');
    }
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user || null;
      setUser(u);
      const md = u?.user_metadata || {};
      setDisplay(md.name || md.full_name || u?.email?.split('@')?.[0] || '');
      setAvatarUrl(md.avatar_url || md.picture || '');
    });
    unsub = () => sub?.subscription?.unsubscribe();
    return () => unsub();
  }, []);

  const initials = useMemo(() => {
    if (display?.trim()) {
      const parts = display.trim().split(/\s+/);
      return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
    }
    return '';
  }, [display]);

  const isActive = (href) => pathname === href || (href !== '/' && pathname?.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-md items-center justify-between gap-3 px-3">
        {/* Left: Brand */}
        <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">
          PlayCove
        </Link>

        {/* Center: Desktop nav (hidden on mobile; BottomNav mirrors these items) */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {LINKS.map(({ href, label, type }) =>
            type === 'action' ? (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-2 rounded-full border border-yellow-300 bg-yellow-300 px-3 py-1.5 font-medium text-gray-900 hover:bg-yellow-400 transition"
                aria-label="New Post"
              >
                <PlusIcon />
                <span>{label}</span>
              </Link>
            ) : (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 transition ${
                  isActive(href) ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
                aria-current={isActive(href) ? 'page' : undefined}
              >
                {label}
              </Link>
            )
          )}
        </nav>

        {/* Right: Account */}
        <div className="flex items-center gap-2">
          {user ? (
            <Link
              href="/account"
              className="inline-flex items-center gap-2 rounded-full border px-2 py-1 hover:bg-gray-50"
              aria-label="Account"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[13px] font-medium text-gray-600">
                    {initials || '🙂'}
                  </span>
                )}
              </span>
              <span className="hidden sm:inline text-sm text-gray-700">
                {display || user.email}
              </span>
            </Link>
          ) : (
            <Link href="/auth" className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

/* Minimal inline icon */
function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" className="fill-gray-900" />
    </svg>
  );
}
