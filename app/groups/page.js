'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '../../lib/supabaseClient';
import Avatar from '../components/Avatar';

const supabase = getSupabaseClient();

export default function MyGroupsPage() {
  const [sessionUser, setSessionUser] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [owned, setOwned] = useState([]);
  const [member, setMember] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!supabase) {
      setErr('Supabase is not configured.');
      setLoading(false);
      return;
    }

    let unsub = () => {};

    (async () => {
      const { data: sres, error: sErr } = await supabase.auth.getSession();
      if (sErr) setErr(sErr.message);

      const user = sres?.session?.user || null;
      setSessionUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      setMyProfile(profile || null);

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

    const safeOwned = ownedRows || [];
    setOwned(safeOwned);

    const { data: memRows, error: memErr } = await supabase
      .from('group_members')
      .select('group_id, role, status, created_at, group:groups(id, name, description, created_at)')
      .eq('user_id', userId);

    if (memErr) setErr(memErr.message);

    const memberGroups = (memRows || [])
      .map((r) => ({
        ...r.group,
        _membership: {
          role: r.role,
          status: r.status,
          joined_at: r.created_at,
        },
      }))
      .filter(Boolean)
      .filter((g) => !safeOwned.some((o) => o.id === g.id));

    setMember(memberGroups);
  }

  const isAuthed = useMemo(() => !!sessionUser, [sessionUser]);

  const allGroups = useMemo(() => {
    const ownedCards = owned.map((g) => ({
      ...g,
      roleLabel: 'Admin',
      colorClass: 'bg-[#F4C20D]',
    }));

    const memberCards = member.map((g, index) => ({
      ...g,
      roleLabel: normalizeRole(g?._membership?.role),
      colorClass: index % 3 === 0 ? 'bg-[#E11D35]' : index % 3 === 1 ? 'bg-[#F4C20D]' : 'bg-[#6B7280]',
    }));

    return [...ownedCards, ...memberCards];
  }, [owned, member]);

  if (!isAuthed && !loading) {
    return (
      <div className="min-h-screen bg-[#D7D2C9] px-4 py-5">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-black/20 bg-white/50 px-4 py-4 text-sm text-gray-900">
            You’re not signed in. <Link href="/auth" className="underline">Go to sign in</Link>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D7D2C9] px-4 py-5">
      <div className="mx-auto w-full max-w-md pb-24">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/account" aria-label="Go to account">
              <Avatar
                name={myProfile?.full_name || sessionUser?.email || ''}
                src={myProfile?.avatar_url || null}
                size="sm"
                bgClassName="bg-[var(--paper)]"
              />
            </Link>
            <h1 className="text-2xl font-semibold text-black">My Groups</h1>
          </div>

          <button
            type="button"
            aria-label="Open group filters"
            className="flex flex-col items-end gap-[4px]"
          >
            <span className="block h-[2px] w-6 rounded-full bg-black" />
            <span className="block h-[2px] w-4 rounded-full bg-black" />
            <span className="block h-[2px] w-2 rounded-full bg-black" />
          </button>
        </div>

        <Link
          href="/groups/new"
          className="flex overflow-hidden rounded-2xl border border-black/40 bg-[#E8E8E8]"
        >
          <div className="flex min-h-[62px] flex-1 items-center px-6">
            <span className="text-xl font-semibold text-black">Create Group</span>
          </div>
          <div className="flex w-[110px] items-center justify-center bg-[#6B6B6B]">
            <span className="text-[52px] font-light leading-none text-white">+</span>
          </div>
        </Link>

        <div className="my-4 h-px bg-black/30" />

        {err ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-3">
            <div className="h-[62px] animate-pulse rounded-2xl bg-white/40" />
            <div className="h-[62px] animate-pulse rounded-2xl bg-white/40" />
          </div>
        ) : allGroups.length === 0 ? (
          <div className="rounded-2xl border border-black/20 bg-white/40 px-4 py-4 text-sm text-black">
            No groups yet. Create your first one.
          </div>
        ) : (
          <div className="space-y-2.5">
            {allGroups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupCard({ group }) {
  const initials = getInitials(group?.name || 'Group');

  return (
    <Link
      href={`/groups/${group.id}`}
      className="flex overflow-hidden rounded-2xl border border-black/40 bg-[#E8E8E8]"
    >
      <div className="flex min-h-[62px] flex-1 flex-col justify-center px-4 py-3">
        <div className="text-[14px] font-semibold leading-tight text-black sm:text-[15px]">
          {group.name}
        </div>

        <div className="mt-2">
          <span className="inline-flex rounded-full bg-[#666666] px-2 py-[2px] text-[10px] font-semibold leading-none text-white">
            {group.roleLabel}
          </span>
        </div>
      </div>

      <div className={`flex w-[110px] items-center justify-center ${group.colorClass}`}>
        <span className="text-[34px] font-bold uppercase leading-none text-white">
          {initials}
        </span>
      </div>
    </Link>
  );
}

function normalizeRole(role) {
  if (!role) return 'Member';

  const value = String(role).toLowerCase();

  if (value === 'owner' || value === 'admin') return 'Admin';
  return 'Member';
}

function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return 'G';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}