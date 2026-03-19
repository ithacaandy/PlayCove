// app/groups/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '../../lib/supabaseClient';

const supabase = getSupabaseClient();

export default function MyGroupsPage() {
  const [sessionUser, setSessionUser] = useState(null);
  const [owned, setOwned] = useState([]);
  const [member, setMember] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!supabase) { setErr('Supabase is not configured.'); setLoading(false); return; }
    let unsub = () => {};

    (async () => {
      const { data: sres, error: sErr } = await supabase.auth.getSession();
      if (sErr) setErr(sErr.message);
      const user = sres?.session?.user || null;
      setSessionUser(user);
      if (!user) { setLoading(false); return; }

      await refresh(user.id);

      const { data: sub1 } = supabase
        .channel('groups-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => refresh(user.id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => refresh(user.id))
        .subscribe();
      unsub = () => sub1?.unsubscribe();

      setLoading(false);
    })();

    return () => unsub();
  }, []);

  async function refresh(userId) {
    const { data: ownedRows, error: ownedErr } = await supabase
      .from('groups')
      .select('id, name, description, is_discoverable, created_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (ownedErr) setErr(ownedErr.message);
    setOwned(ownedRows || []);

    const { data: memRows, error: memErr } = await supabase
      .from('group_members')
      .select('group_id, role, status, created_at, group:groups(id, name, description, created_at)')
      .eq('user_id', userId);
    if (memErr) setErr(memErr.message);
    const memberGroups = (memRows || [])
      .map(r => ({ ...r.group, _membership: { role: r.role, status: r.status, joined_at: r.created_at } }))
      .filter(Boolean)
      .filter(g => !(ownedRows || []).some(o => o.id === g.id));
    setMember(memberGroups);
  }

  const isAuthed = useMemo(() => !!sessionUser, [sessionUser]);

  if (!isAuthed) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-semibold">My Groups</h1>
        <p className="mt-3 text-gray-600">You’re not signed in.</p>
        <div className="mt-6">
          <Link href="/auth" className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Go to /auth</Link>
        </div>
      </div>
    );
  }

  if (loading) return <Skeleton />;

  return (
    <div className="py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Groups</h1>
        <Link
          href="/groups/new"
          className="rounded-full border border-yellow-300 bg-yellow-300 px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-yellow-400"
        >
          New Group
        </Link>
      </div>

      {err ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      ) : null}

      <section className="mt-6">
        <h2 className="text-base font-medium">Groups you own</h2>
        {owned.length === 0 ? (
          <Empty text="You don’t own any groups yet." />
        ) : (
          <ul className="mt-3 grid gap-3">
            {owned.map(g => (
              <li key={g.id} className="rounded-lg border hover:shadow-sm transition">
                <Link href={`/groups/${g.id}`} className="block p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{g.name}</div>
                      {g.description ? <div className="text-sm text-gray-600 line-clamp-2">{g.description}</div> : null}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(g.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-base font-medium">Groups you’ve joined</h2>
        {member.length === 0 ? (
          <Empty text="You haven’t joined any groups yet." />
        ) : (
          <ul className="mt-3 grid gap-3">
            {member.map(g => (
              <li key={g.id} className="rounded-lg border hover:shadow-sm transition">
                <Link href={`/groups/${g.id}`} className="block p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{g.name}</div>
                      {g.description ? <div className="text-sm text-gray-600 line-clamp-2">{g.description}</div> : null}
                      {g._membership ? (
                        <div className="mt-1 text-xs text-gray-500">
                          Role: {g._membership.role} · Status: {g._membership.status}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(g.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Empty({ text }) {
  return <p className="mt-3 text-gray-600">{text}</p>;
}

function Skeleton() {
  return (
    <div className="py-6 animate-pulse">
      <div className="h-5 w-32 rounded bg-gray-200" />
      <div className="mt-4 h-16 w-full rounded bg-gray-200" />
      <div className="mt-3 h-16 w-full rounded bg-gray-200" />
    </div>
  );
}