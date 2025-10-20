// app/account/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '../../lib/supabaseClient';

const supabase = getSupabaseClient();

function resolveAvatarUrl(user) {
  if (!user) return null;
  const url = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  if (url) return url;
  const path = user.user_metadata?.avatar_path || user.user_metadata?.avatar;
  if (path && supabase) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl || null;
  }
  return null;
}

export default function AccountPage() {
  const [sessionUser, setSessionUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');

  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!supabase) {
      setStatus({ type: 'error', msg: 'Supabase is not configured.' });
      setLoading(false);
      return;
    }

    let unsub = () => {};

    async function init() {
      const { data: sres, error: sErr } = await supabase.auth.getSession();
      if (sErr) console.warn('getSession error:', sErr?.message);
      let user = sres?.session?.user || null;

      if (!user) {
        const { data: ures, error: uErr } = await supabase.auth.getUser();
        if (uErr) console.warn('getUser error:', uErr?.message);
        user = ures?.user || null;
      }

      setSessionUser(user);
      setAvatarUrl(resolveAvatarUrl(user));
      setName(user?.user_metadata?.name || user?.user_metadata?.full_name || '');
      setLocation(user?.user_metadata?.location || '');
      setBio(user?.user_metadata?.bio || '');

      const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
        const u = session?.user || null;
        setSessionUser(u);
        setAvatarUrl(resolveAvatarUrl(u));
        setName(u?.user_metadata?.name || u?.user_metadata?.full_name || '');
        setLocation(u?.user_metadata?.location || '');
        setBio(u?.user_metadata?.bio || '');
      });
      unsub = () => sub?.subscription?.unsubscribe();

      setLoading(false);
    }

    init();
    return () => unsub();
  }, []);

  const isAuthed = useMemo(() => !!sessionUser, [sessionUser]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!supabase || !isAuthed) return;

    setStatus({ type: 'info', msg: 'Saving profile…' });
    const { error } = await supabase.auth.updateUser({
      data: {
        name: name || '',
        full_name: name || '',
        location: location || '',
        bio: bio || '',
      },
    });

    if (error) {
      setStatus({ type: 'error', msg: `Could not save: ${error.message}` });
    } else {
      setStatus({ type: 'success', msg: 'Profile updated.' });
      const { data: sres } = await supabase.auth.getSession();
      const user = sres?.session?.user || null;
      setSessionUser(user);
      setAvatarUrl(resolveAvatarUrl(user));
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file || !supabase || !isAuthed) return;

    setAvatarUploading(true);
    setStatus({ type: 'info', msg: 'Uploading avatar…' });

    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const filename = `avatar_${Date.now()}.${ext}`;
      const path = `${sessionUser.id}/${filename}`;

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = pub?.publicUrl || null;

      const { error: metaErr } = await supabase.auth.updateUser({
        data: { avatar_path: path, avatar_url: publicUrl || undefined },
      });
      if (metaErr) throw metaErr;

      const { data: sres } = await supabase.auth.getSession();
      const user = sres?.session?.user || null;
      setSessionUser(user);
      setAvatarUrl(resolveAvatarUrl(user));

      setStatus({ type: 'success', msg: 'Avatar updated.' });
    } catch (err) {
      setStatus({ type: 'error', msg: `Avatar upload failed: ${err.message}` });
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setStatus({ type: 'success', msg: 'Signed out.' });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-screen-md px-3 py-8">
        <h1 className="text-xl font-semibold">Account</h1>
        <p className="mt-4 text-gray-600">Loading…</p>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="mx-auto max-w-screen-md px-3 py-8">
        <h1 className="text-xl font-semibold">Account</h1>
        <p className="mt-4 text-gray-600">You’re not signed in.</p>
        <div className="mt-6">
          <Link href="/auth" className="inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
            Go to /auth
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-md px-3 py-8">
      <h1 className="text-xl font-semibold">Account</h1>

      {status?.msg ? (
        <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${
          status.type === 'error' ? 'border-red-200 bg-red-50 text-red-700'
          : status.type === 'success' ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
          {status.msg}
        </div>
      ) : null}

      <section className="mt-6 flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full ring-2 ring-gray-200">
          <img src={avatarUrl || '/avatar-placeholder.svg'} alt="Avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={avatarUploading} />
            {avatarUploading ? 'Uploading…' : 'Change photo'}
          </label>
        </div>
      </section>

      <form onSubmit={handleSaveProfile} className="mt-8 grid gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Display name</label>
          <input type="text" className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none ring-0 focus:border-gray-900" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <input type="text" className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none ring-0 focus:border-gray-900" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Bio</label>
          <textarea rows={4} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none ring-0 focus:border-gray-900" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell other parents a bit about your kid(s) or interests." />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="inline-flex items-center rounded-md bg-yellow-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-yellow-400">Save changes</button>
          <button type="button" onClick={handleSignOut} className="inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Sign out</button>
        </div>
      </form>
    </div>
  );
}
