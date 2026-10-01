'use client';
import { usePathname } from 'next/navigation';
import AccountAvatar from './AccountAvatar';
import BottomNav from './BottomNav';
import NotificationProvider from './NotificationProvider';
import NotificationSummary from './NotificationSummary';
export default function NavFrame({ children }) {
  const path = usePathname();
  const hideNav = path?.startsWith('/auth');
  return <NotificationProvider><div className="min-h-screen">
    {!hideNav && !['/', '/groups', '/mine', '/discover', '/account', '/notifications', '/invite', '/event-invite'].includes(path) && <div className="mx-auto flex max-w-md justify-start px-4 pt-3"><AccountAvatar /></div>}
    {path === '/' && <div className="px-4"><NotificationSummary /></div>}
    {path === '/groups' && <div className="px-4"><NotificationSummary type="group" /></div>}
    {path === '/mine' && <div className="px-4"><NotificationSummary type="event" /></div>}
    {children}
    {!hideNav && <BottomNav />}
  </div></NotificationProvider>;
}