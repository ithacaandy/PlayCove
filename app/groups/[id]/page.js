'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { canManageGroup, isActiveMembership } from '../../../lib/group-membership';

const supabase = getSupabaseClient();

export default function GroupDetailsPage() {
  const { id } = useParams();
  const [me, setMe] = useState(null);
  const [group, setGroup] = useState(null);
  const [membership, setMembership] = useState(null);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [err, setErr] = useState(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const isOwner = !!me && group?.owner_id === me.id;
  const canManage = canManageGroup(group, me?.id, membership);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const user = sessionData?.session?.user || null;
        const [groupResult, eventResult, memberResult, ownResult] = await Promise.all([
          supabase.from('groups').select('id, name, description, owner_id, created_at, is_discoverable').eq('id', id).maybeSingle(),
          supabase.from('events').select('id, title, date_iso, start_time').eq('group_id', id)
            .order('date_iso', { ascending: true }).order('start_time', { ascending: true }),
          supabase.from('group_members').select('user_id, role, status').eq('group_id', id),
          user ? supabase.from('group_members').select('role, status').eq('group_id', id).eq('user_id', user.id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        if (groupResult.error) throw groupResult.error;
        if (!groupResult.data) throw new Error('Group not found or unavailable.');
        if (ownResult.error) throw ownResult.error;
        const accepted = (memberResult.data || []).filter(isActiveMembership);
        const profilesMap = {};
        if (accepted.length) {
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, city').in('id', accepted.map((m) => m.user_id));
          (profiles || []).forEach((profile) => { profilesMap[profile.id] = profile; });
        }
        if (!mounted) return;
        setMe(user);
        setGroup(groupResult.data);
        setMembership(ownResult.data);
        setMembers(accepted.map((m) => ({ ...m, profile: profilesMap[m.user_id] || null })));
        setEvents(eventResult.data || []);
        setNotice(eventResult.error || memberResult.error ? 'Some events or members could not be loaded. Please reload to try again.' : '');
        setErr(null);
      } catch (e) {
        if (mounted) setErr(e.message || 'Could not load this group.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  async function requestToJoin() {
    if (requesting) return;
    setRequesting(true);
    setNotice('');
    try {
      const response = await fetch('/api/groups/request?group=' + encodeURIComponent(id), {
        method: 'POST', headers: { Accept: 'application/json' },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not request membership.');
      setMembership({ role: 'member', status: result.status });
      setNotice(result.status === 'active' ? 'You are already a member.' : 'Request sent. The group owner will review it.');
    } catch (e) {
      setNotice(e.message || 'Could not request membership. Please try again.');
    } finally {
      setRequesting(false);
    }
  }

  if (loading) return <p role="status" className="p-4">Loading group…</p>;
  if (err) return <div className="mx-auto max-w-md px-4 py-6"><p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{err}</p><Link href="/groups" className="mt-4 inline-block underline">Back to My Groups</Link></div>;

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-xl font-semibold">{group.name}</h1>
      {group.description ? <p className="mt-2 whitespace-pre-wrap text-gray-700">{group.description}</p> : null}
      <p className="mt-2 text-sm text-gray-500">
        Created {new Date(group.created_at).toLocaleDateString()}{group.is_discoverable ? ' · Discoverable' : ''}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {isOwner && <Link href={'/groups/' + id + '/edit'} className="rounded-lg border px-3 py-2 text-sm">Edit group</Link>}
        {canManage && <Link href={'/groups/' + id + '/members'} className="rounded-lg border px-3 py-2 text-sm">Manage members</Link>}
        {me && !isOwner && (isActiveMembership(membership) ? (
          <p className="text-sm text-gray-600">You’re a member.</p>
        ) : membership?.status === 'pending' ? (
          <p role="status" className="text-sm text-gray-600">Your join request is pending approval.</p>
        ) : group.is_discoverable && (!membership || membership.status === 'rejected') ? (
          <button type="button" disabled={requesting} onClick={requestToJoin}
            className="rounded-lg bg-yellow-300 px-4 py-2 text-sm disabled:opacity-60">
            {requesting ? 'Sending…' : 'Request to join'}
          </button>
        ) : <p className="text-sm text-gray-600">Contact the owner for an invitation.</p>)}
      </div>
      {notice && <p role="status" className="mt-4 rounded-lg border bg-white p-3 text-sm">{notice}</p>}
      <section className="mt-8">
        <h2 className="font-semibold">Events</h2>
        {events.length ? <ul className="mt-3 grid gap-2">
          {events.map((event) => <li key={event.id} className="rounded-lg border">
            <Link href={'/events/' + event.id} className="block p-3">
              <div className="font-medium">{event.title}</div>
              <div className="mt-1 text-sm text-gray-600">{event.date_iso} · {event.start_time?.slice(0, 5)}</div>
            </Link>
          </li>)}
        </ul> : <p className="mt-2 text-gray-600">No events yet.</p>}
        {canManage && <Link href={'/new?group=' + id} className="mt-3 inline-block rounded-lg border px-3 py-2 text-sm">New Event</Link>}
      </section>
      <section className="mt-8">
        <h2 className="font-semibold">Members</h2>
        {members.length ? <ul className="mt-3 grid gap-2">
          {members.map((member) => <li key={member.user_id} className="flex justify-between rounded-lg border p-3">
            <div><p className="font-medium">{member.profile?.full_name || 'Group member'}</p>
              {member.profile?.city && <p className="text-sm text-gray-600">{member.profile.city}</p>}</div>
            <span className="text-xs uppercase text-gray-500">{member.role}</span>
          </li>)}
        </ul> : <p className="mt-2 text-gray-600">No members to display.</p>}
      </section>
    </div>
  );
}