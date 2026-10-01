'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import NotificationSummary from '../components/NotificationSummary';
import AccountAvatar from '../components/AccountAvatar';
function Inbox() {
  const value = useSearchParams().get('type');
  const type = ['group','event'].includes(value) ? value : 'all';
  return <main className="mx-auto max-w-md px-4 py-6 pb-24"><div className="flex items-center gap-3"><AccountAvatar /><h1 className="text-xl font-semibold">Inbox</h1></div><nav aria-label="Notification filters" className="flex gap-4 mt-4 text-sm">{[['all','All'],['group','Groups'],['event','Events']].map(([key,label]) => <Link key={key} href={'/notifications'+(key==='all'?'':'?type='+key)} aria-current={type===key?'page':undefined} className={type===key?'font-semibold underline':'text-gray-600'}>{label}</Link>)}</nav><NotificationSummary type={type} inbox /></main>;
}
export default function NotificationsPage() { return <Suspense fallback={<p className="p-4">Loading inbox…</p>}><Inbox /></Suspense>; }