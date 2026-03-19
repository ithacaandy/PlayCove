'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import Avatar from './Avatar';

const supabase = getSupabaseClient();

export default function BottomNav() {
  const pathname = usePathname();
  const [profile, setProfile] = useState({ full_name: '', avatar_url: '' });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    async function loadProfile() {
      const { data: sres } = await supabase.auth.getSession();
      const user = sres?.session?.user || null;
      const md = user?.user_metadata || {};

      let full_name =
        md.full_name ||
        md.name ||
        '';

      let avatar_url =
        md.avatar_url ||
        md.picture ||
        '';

      if (user?.id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (prof?.full_name) full_name = prof.full_name;
        if (prof?.avatar_url) avatar_url = prof.avatar_url;
      }

      if (mounted) {
        setProfile({
          full_name,
          avatar_url,
        });
      }
    }

    loadProfile();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      const user = session?.user || null;
      const md = user?.user_metadata || {};

      let full_name =
        md.full_name ||
        md.name ||
        '';

      let avatar_url =
        md.avatar_url ||
        md.picture ||
        '';

      if (user?.id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (prof?.full_name) full_name = prof.full_name;
        if (prof?.avatar_url) avatar_url = prof.avatar_url;
      }

      if (mounted) {
        setProfile({
          full_name,
          avatar_url,
        });
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
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
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 border-t bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 md:hidden transition-shadow ${
        scrolled ? 'shadow-[0_-6px_12px_rgba(0,0,0,0.06)]' : 'shadow-none'
      }`}
    >
      <ul className="mx-auto flex max-w-screen-md items-center justify-around px-1 py-1 text-xs">
        {items.map((item) => (
          <li key={item.href} className="flex-1 text-center">
            <NavItem
              {...item}
              active={pathname === item.href}
              profile={profile}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NavItem({ href, label, icon: Icon, avatar, profile, active }) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center justify-center rounded-md px-2 py-1 transition ${
        active ? 'text-gray-900' : 'text-gray-500 hover:text-gray-800'
      }`}
    >
      {avatar ? (
        <Avatar
          name={profile?.full_name || ''}
          src={profile?.avatar_url || null}
          size="xs"
          className={active ? 'ring-1 ring-black/10' : ''}
        />
      ) : (
        <Icon active={active} />
      )}
      <span className="mt-0.5 text-[10px] font-medium">{label}</span>
    </Link>
  );
}

/* Icons */
function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5Z"
        fill={active ? '#000' : '#888'}
      />
    </svg>
  );
}

function GroupsIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#000' : '#888'}>
      <path d="M7 7a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm7 2a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM4 18a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2H4v-2Zm10 2v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2H14Z" />
    </svg>
  );
}

function PostsIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#000' : '#888'}>
      <path d="M4 4h10l6 6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm10 0v6h6" />
    </svg>
  );
}

function DiscoverIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#000' : '#888'}>
      <path d="M11 4a7 7 0 1 1-4.95 2.05A6.97 6.97 0 0 1 11 4Zm0-2C5.48 2 1 6.48 1 12s4.48 10 10 10 10-4.48 10-10S16.52 2 11 2Zm4.24 6.76-3 6a1 1 0 0 1-.48.48l-6 3 3-6a1 1 0 0 1 .48-.48l6-3Z" />
    </svg>
  );
}