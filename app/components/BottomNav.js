// app/components/BottomNav.js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function BottomNav() {
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    let unsub = () => {};

    async function init() {
      const { data: sres } = await supabase.auth.getSession();
      const u = sres?.session?.user || null;
      setUser(u);
      setAvatarUrl(resolveAvatarUrl(u));
    }
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const next = session?.user || null;
      setUser(next);
      setAvatarUrl(resolveAvatarUrl(next));
    });
    unsub = () => sub?.subscription?.unsubscribe();
    return () => unsub();
  }, []);

  const items = [
    { href: '/groups', label: 'My Groups', icon: GroupsIcon },
    { href: '/mine', label: 'My Posts', icon: PostsIcon },
    { href: '/new', label: 'New Post', icon: PlusIcon, action: true }, // yellow +
    { href: '/groups/discover', label: 'Discover', icon: DiscoverIcon },
    { href: '/account', label: 'Account', icon: null, avatar: true },
  ];

  const isActive = (href) => pathname === href || (href !== '/' && pathname?.startsWith(href));

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 z-40">
      <div className="mx-auto max-w-screen-sm">
        <ul className="grid grid-cols-5">
          {items.map(({ href, label, icon: Icon, action, avatar }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex flex-col items-center justify-center gap-1 py-2 ${action ? 'relative' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  aria-label={label}
                >
                  {avatar ? (
                    <AccountAvatar active={active} avatarUrl={avatarUrl} />
                  ) : action ? (
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-yellow-300 bg-yellow-300 hover:bg-yellow-400 transition -mt-5 shadow">
                      <Icon />
                    </span>
                  ) : (
                    <Icon active={active} />
                  )}
                  <span className={`text-[11px] ${active ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/* ---------- helpers & icons ---------- */
function resolveAvatarUrl(user) {
  if (!user) return null;
  const url = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  if (url) return url;
  const path = user.user_metadata?.avatar_path || user.user_metadata?.avatar;
  if (path && supabase) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl || null;
  }
  return null;
}

function AccountAvatar({ active, avatarUrl }) {
  return avatarUrl ? (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full ring-2 ${
        active ? 'ring-gray-900' : 'ring-transparent'
      } overflow-hidden`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarUrl}
        alt="Account avatar"
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
    </span>
  ) : (
    <AccountIcon active={active} />
  );
}

function GroupsIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm7 2a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM4 18a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2H4v-2Zm10 2v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2h-10Z"
        className={active ? 'fill-gray-900' : 'fill-gray-400'} />
    </svg>
  );
}

function PostsIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 4h10l6 6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm10 0v6h6"
        className={active ? 'fill-gray-900' : 'fill-gray-400'} />
    </svg>
  );
}

function DiscoverIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 4a7 7 0 1 1-4.95 2.05A6.97 6.97 0 0 1 11 4Zm0-2C5.48 2 1 6.48 1 12s4.48 10 10 10 10-4.48 10-10S16.52 2 11 2Zm4.24 6.76-3 6a1 1 0 0 1-.48.48l-6 3 3-6a1 1 0 0 1 .48-.48l6-3Z"
        className={active ? 'fill-gray-900' : 'fill-gray-400'} />
    </svg>
  );
}

function AccountIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14Z"
        className={active ? 'fill-gray-900' : 'fill-gray-400'} />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" className="fill-gray-900" />
    </svg>
  );
}
