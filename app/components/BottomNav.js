'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import Avatar from './Avatar';
import { useNotifications } from './NotificationProvider';

const supabase = getSupabaseClient();

export default function BottomNav() {
  const pathname = usePathname();
  const { items: notifications } = useNotifications();
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

    let profileRefreshTimer;
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      clearTimeout(profileRefreshTimer);
      profileRefreshTimer = setTimeout(async () => {
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
      }, 0);
    });

    return () => {
      mounted = false;
      clearTimeout(profileRefreshTimer);
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
      { href: '/', label: 'LinkLemon', icon: HomeIcon },
      { href: '/discover', label: 'Discover', icon: DiscoverIcon },
      { href: '/groups', label: 'My Groups', icon: GroupsIcon },
      { href: '/mine', label: 'My Events', icon: PostsIcon },
      { href: '/notifications', label: 'Inbox', icon: InboxIcon },
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
              count={item.href === '/notifications' ? notifications.length : 0}
              active={pathname === item.href}
              profile={profile}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NavItem({ href, label, icon: Icon, avatar, profile, active, count }) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={count ? `${label}, ${count} pending notifications` : label}
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
      <span className="mt-0.5 text-[10px] font-medium">{label}{count > 0 && <span className="ml-1 rounded-full bg-red-600 px-1 text-white">{count > 99 ? '99+' : count}</span>}</span>
    </Link>
  );
}

/* User-supplied navigation artwork, kept in its original colors. */
function NavigationIcon({ name, active }) {
  return <span className={`flex h-9 w-10 items-center justify-center rounded-xl ${active ? 'bg-[var(--cream)] ring-1 ring-[var(--sunshine)]' : ''}`}>
    <Image src={`/brand/icons/${name}.png`} alt="" width={30} height={30} className="h-[30px] w-[30px] object-contain" />
  </span>;
}
function HomeIcon({ active }) { return <NavigationIcon name="apartment" active={active} />; }
function DiscoverIcon({ active }) { return <NavigationIcon name="compass" active={active} />; }
function GroupsIcon({ active }) { return <NavigationIcon name="networking" active={active} />; }
function PostsIcon({ active }) { return <NavigationIcon name="reservation" active={active} />; }
function InboxIcon({ active }) { return <NavigationIcon name="letter" active={active} />; }