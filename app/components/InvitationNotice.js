'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
export default function InvitationNotice() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    if (pathname.startsWith('/auth')) return;
    let mounted = true;
    const controller = new AbortController();
    async function refresh() {
      if (document.visibilityState === 'hidden') return;
      try {
        const response = await fetch('/api/notifications', { cache: 'no-store', signal: controller.signal });
        const result = response.ok ? await response.json() : null;
        if (mounted) setCount(result?.invitations?.length || 0);
      } catch { /* Retry on focus or next poll without interrupting the current page. */ }
    }
    refresh();
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { mounted = false; controller.abort(); clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [pathname]);
  if (!count || pathname === '/notifications') return null;
  return <aside aria-label="Invitation notifications" className="border-b bg-yellow-50 px-4 py-3">
    <Link href="/notifications" className="mx-auto block max-w-md text-sm font-medium underline">You have {count} pending group {count === 1 ? 'invitation' : 'invitations'}. View invitations</Link>
  </aside>;
}