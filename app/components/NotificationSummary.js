'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useNotifications } from './NotificationProvider';
export default function NotificationSummary({ type = 'all', inbox = false }) {
  const [readError,setReadError]=useState('');
  const [reading,setReading]=useState(null);
  async function markRead(item) {
    setReading(item.id);setReadError('');
    try { const response=await fetch('/api/notifications/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.notificationId})});if(!response.ok) throw new Error('Could not mark notification read.');window.dispatchEvent(new Event('notifications-changed')); } catch(error) {setReadError(error.message);} finally {setReading(null);}
  }
  const { items, loading, error } = useNotifications();
  const filtered = items.filter(i => type === 'all' || i.type === type);
  const shown = inbox ? filtered : filtered.slice(0,3);
  if (!inbox && !filtered.length) return null;
  const title = inbox ? 'Inbox' : type === 'group' ? 'Group invitations' : type === 'event' ? 'Event notifications' : 'Notifications';
  return <section aria-label={title} className="mx-auto max-w-md rounded-xl border bg-white px-4 py-4 my-4">
    <div className="flex justify-between items-center gap-3"><h2 className="font-semibold">{title}{filtered.length ? ` (${filtered.length})` : ''}</h2>{!inbox && <Link href={'/notifications' + (type === 'all' ? '' : '?type=' + type)} className="text-sm underline">View all</Link>}</div>
    {loading ? <p role="status" className="mt-3 text-sm">Loading notifications…</p> : error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : !filtered.length ? <p className="mt-3 text-sm text-gray-600">{type === 'group' ? 'No pending group invitations.' : type === 'event' ? 'No event notifications.' : 'You’re all caught up.'}</p> : <ul className="mt-3 divide-y">{shown.map(item => <li key={item.id}><Link href={item.href} className="block py-3"><span className="block font-medium text-sm">{item.title}</span><span className="text-xs text-gray-600">{item.kind === 'cancelled' ? 'Event cancelled · View event' : item.type === 'event' ? 'Event invitation · View invitation' : 'Group invitation · View invitation'}</span></Link>{item.notificationId && <button disabled={reading===item.id} type="button" onClick={() => markRead(item)} className="mb-3 text-xs underline disabled:opacity-50">{reading===item.id ? 'Saving…' : 'Mark as read'}</button>}</li>)}</ul>}
    {readError && <p role="alert" className="mt-2 text-sm text-red-700">{readError}</p>}
  </section>;
}