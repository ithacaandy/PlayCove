'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function Header() {
  const pathname = usePathname() || '/';
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [display, setDisplay] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data: sres } = await supabase.auth.getSession();
      const u = sres?.session?.user || null;
      setUser(u);
      const md = u?.user_metadata || {};
      setDisplay(md.name || md.full_name || u?.email?.split('@')[0] || '');
      setAvatarUrl(md.avatar_url || md.picture || '');
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user || null;
      setUser(u);
      const md = u?.user_metadata || {};
      setDisplay(md.name || md.full_name || u?.email?.split('@')[0] || '');
      setAvatarUrl(md.avatar_url || md.picture || '');
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const initials = useMemo(() => {
    if (!display?.trim()) return '';
    const parts = display.trim().split(/\s+/);
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  }, [display]);

  const isActive = (base) => pathname === base || pathname.startsWith(base + '/');

  return (
    <header className={`sticky top-0 z-40 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 transition-shadow ${scrolled ? 'shadow-[0_2px_12px_rgba(0,0,0,0.06)]' : 'shadow-none'}`}>
      <div className="mx-auto flex h-14 max-w-screen-md items-center justify-between px-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-gray-900">PlayCove</Link>

        {/* Even distribution */}
        <nav className="hidden md:grid grid-cols-3 gap-2 w-full max-w-xl mx-3">
          <NavButton href="/discover" active={isActive('/discover')} label="Discover">
            <DiscoverIcon />
          </NavButton>
          <NavButton href="/groups" active={isActive('/groups')} label="My Groups">
            <GroupsIcon />
          </NavButton>
          <NavButton href="/mine" active={isActive('/mine')} label="My Events">
            <PostsIcon />
          </NavButton>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <Link href="/account" className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 overflow-hidden" aria-label="Account">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-[12px] font-medium text-gray-600">{initials || '🙂'}</span>
              )}
            </Link>
          ) : (
            <Link href="/auth" className="rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavButton({ href, active, label, children }) {
  const base = 'w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 font-medium transition';
  const cls = active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900';
  return (
    <Link href={href} prefetch={false} aria-current={active ? 'page' : undefined} className={`${base} ${cls}`}>
      <span className="inline-flex">{children}</span>
      <span className="text-sm">{label}</span>
    </Link>
  );
}

/* Icons */
function GroupsIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm7 2a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM4 18a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2H4v-2Zm10 2v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2H14Z"/></svg>; }
function PostsIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h10l6 6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm10 0v6h6"/></svg>; }
function DiscoverIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11 4a7 7 0 1 1-4.95 2.05A6.97 6.97 0 0 1 11 4Zm0-2C5.48 2 1 6.48 1 12s4.48 10 10 10 10-4.48 10-10S16.52 2 11 2Zm4.24 6.76-3 6a1 1 0 0 1-.48.48l-6 3 3-6a1 1 0 0 1 .48-.48l6-3Z"/></svg>; }
