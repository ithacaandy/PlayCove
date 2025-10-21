'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function BottomNav() {
  const pathname = usePathname();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data: sres } = await supabase.auth.getSession();
      const md = sres?.session?.user?.user_metadata || {};
      setAvatarUrl(md.avatar_url || md.picture || '');
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const md = session?.user?.user_metadata || {};
      setAvatarUrl(md.avatar_url || md.picture || '');
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const items = useMemo(
    () => [
      { href: '/', label: 'PlayCove', icon: HomeIcon },
      { href: '/discover', label: 'Discover', icon: DiscoverIcon },
      { href: '/groups', label: 'My Groups', icon: GroupsIcon },
      { href: '/mine', label: 'My Events', icon: PostsIcon },
      { href: '/account', label: 'Account', avatar: true },
    ],
    []
  );

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 md:hidden transition-shadow ${scrolled ? 'shadow-[0_-6px_12px_rgba(0,0,0,0.06)]' : 'shadow-none'}`}>
      <ul className="mx-auto flex max-w-screen-md items-center justify-around px-1 py-1 text-xs">
        {items.map((item) => (
          <li key={item.href} className="flex-1 text-center">
            <NavItem {...item} active={pathname === item.href} avatarUrl={avatarUrl} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NavItem({ href, label, icon: Icon, avatar, avatarUrl, active }) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center justify-center rounded-md px-2 py-1 transition ${active ? 'text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}
    >
      {avatar ? (
        avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Avatar" className="h-6 w-6 rounded-full object-cover border border-gray-200" />
        ) : (
          <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">🙂</div>
        )
      ) : (
        <Icon active={active} />
      )}
      <span className="mt-0.5 text-[10px] font-medium">{label}</span>
    </Link>
  );
}

/* Icons */
function HomeIcon({ active }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5Z" fill={active ? '#000' : '#888'} /></svg>; }
function GroupsIcon({ active }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#000' : '#888'}><path d="M7 7a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm7 2a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM4 18a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2H4v-2Zm10 2v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2H14Z"/></svg>; }
function PostsIcon({ active }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#000' : '#888'}><path d="M4 4h10l6 6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm10 0v6h6"/></svg>; }
function DiscoverIcon({ active }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#000' : '#888'}><path d="M11 4a7 7 0 1 1-4.95 2.05A6.97 6.97 0 0 1 11 4Zm0-2C5.48 2 1 6.48 1 12s4.48 10 10 10 10-4.48 10-10S16.52 2 11 2Zm4.24 6.76-3 6a1 1 0 0 1-.48.48l-6 3 3-6a1 1 0 0 1 .48-.48l6-3Z"/></svg>; }
