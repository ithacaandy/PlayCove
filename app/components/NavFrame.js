'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import AccountAvatar from './AccountAvatar';
import BottomNav from './BottomNav';
import NotificationProvider from './NotificationProvider';
import NotificationSummary from './NotificationSummary';
export default function NavFrame({ children }) {
  const path = usePathname();
  if (path === '/beta-access') return <div className="min-h-screen">{children}</div>;
  const detailPage = /^\/events\/[^/]+$/.test(path || '');
  const hideNav = path?.startsWith('/auth');
  return <NotificationProvider><div className={hideNav ? "min-h-screen" : "min-h-screen app-frame"}>
    {!hideNav && !['/', '/groups', '/mine', '/discover', '/account', '/notifications', '/invite', '/event-invite'].includes(path) && <div className={detailPage ? "mx-auto flex max-w-2xl justify-start px-5 pt-5 sm:px-6" : "mx-auto flex max-w-md justify-start px-4 pt-5"}><AccountAvatar /></div>}
    {path === '/' && <div className="mx-auto w-full max-w-md px-4"><NotificationSummary /></div>}
    {path === '/groups' && <div className="mx-auto w-full max-w-md px-4"><NotificationSummary type="group" /></div>}
    {path === '/mine' && <div className="mx-auto w-full max-w-md px-4"><NotificationSummary type="event" /></div>}
    {children}
    {!hideNav && path !== '/feedback' && <div className="mx-auto max-w-md px-5 pb-4 pt-4 text-center"><Link href={'/feedback?from=' + encodeURIComponent(path || '/')} className="text-sm text-gray-600 underline">Report a problem</Link></div>}
    {!hideNav && <BottomNav />}
  </div></NotificationProvider>;
}