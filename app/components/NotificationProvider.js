'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
const Context = createContext({ items: [], loading: true, error: '' });
export function useNotifications() { return useContext(Context); }
export default function NotificationProvider({ children }) {
  const path = usePathname();
  const [state, setState] = useState({ items: [], loading: true, error: '' });
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    if (path.startsWith('/auth')) { setState({ items: [], loading: false, error: '' }); return; }
    async function refresh() {
      if (document.visibilityState === 'hidden') return;
      try {
        const response = await fetch('/api/notifications', { cache: 'no-store', signal: controller.signal });
        if (response.status === 401) { if (mounted) setState({ items: [], loading: false, error: '' }); return; }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load notifications.');
        const items = [
          ...(data.invitations || []).map(i => ({ id: 'group-' + i.invite_id, type: 'group', title: 'Invitation to ' + i.group_name, href: '/invite?token=' + encodeURIComponent(i.token), createdAt: i.created_at, expiresAt: i.expires_at })),
          ...(data.eventInvitations || []).map(i => ({ id: 'event-' + i.invite_id, type: 'event', title: 'Invitation to ' + i.event_title, href: '/event-invite?token=' + encodeURIComponent(i.token), createdAt: i.created_at, expiresAt: i.expires_at })),
          ...(data.eventNotices || []).map(i => ({id:'notice-' + i.id, notificationId:i.id, type:'event', title:i.event_title + ' was cancelled', href:'/events/' + i.event_id, createdAt:i.created_at, kind:'cancelled'})),
        ].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
        if (mounted) setState({ items, loading: false, error: '' });
      } catch (e) { if (mounted && e.name !== 'AbortError') setState({ items: [], loading: false, error: 'Could not load notifications. Please reload to try again.' }); }
    }
    refresh();
    const timer = setInterval(refresh,60000);
    window.addEventListener('notifications-changed',refresh); window.addEventListener('focus',refresh); document.addEventListener('visibilitychange',refresh);
    return () => { mounted=false; controller.abort(); clearInterval(timer); window.removeEventListener('notifications-changed',refresh); window.removeEventListener('focus',refresh); document.removeEventListener('visibilitychange',refresh); };
  },[path]);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}