'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import EnablePushButton from '@/app/components/EnablePushButton';
import Avatar from '@/app/components/Avatar';
import { parseKidAges } from '@/lib/profile';

const supabase = getSupabaseClient();

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileReady, setProfileReady] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ full_name: '', city: '', kid_ages: '' });


  const fileInputRef = useRef(null);
  const user = session?.user || null;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const currentSession = sessionData?.session || null;
        if (!mounted) return;
        setSession(currentSession);
        const uid = currentSession?.user?.id;
        if (uid) {
          const { data: prof, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, city, kid_ages, avatar_url')
            .eq('id', uid)
            .maybeSingle();
          if (profileError) throw profileError;
          if (!mounted) return;
          setProfile(prof || null);
          setProfileReady(true);
          setAvatarUrl(prof?.avatar_url || currentSession.user.user_metadata?.avatar_url ||
            currentSession.user.user_metadata?.picture || null);
        }
      } catch (e) {
        if (mounted) setError(e.message || 'Could not load your profile. Please reload and try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  function editProfile() {
    setForm({
      full_name: profile?.full_name || '',
      city: profile?.city || '',
      kid_ages: Array.isArray(profile?.kid_ages) ? profile.kid_ages.join(', ') : '',
    });
    setError('');
    setMessage('');
    setEditing(true);
  }

  async function saveProfile(e) {
    e.preventDefault();
    if (!user || saving || !profileReady || uploadingAvatar) return;
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const payload = {
        id: user.id,
        full_name: form.full_name.trim() || null,
        city: form.city.trim() || null,
        kid_ages: parseKidAges(form.kid_ages),
      };
      const { data, error: saveError } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select('id, full_name, city, kid_ages, avatar_url')
        .single();
      if (saveError) throw saveError;
      setProfile(data);
      setEditing(false);
      setMessage('Profile saved.');
    } catch (e) {
      setError(e.message || 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file || !user || saving || !profileReady) return;

    setUploadingAvatar(true);
    setError('');
    setMessage('');

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please choose an image file.');
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) {
        throw new Error('Could not get avatar URL.');
      }

      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          avatar_url: publicUrl,
        },
        { onConflict: 'id' }
      );

      if (profileError) throw profileError;
      setAvatarUrl(cacheBustedUrl);
      setMessage('Avatar updated.');

      setProfile((prev) => ({
        ...(prev || {}),
        avatar_url: publicUrl,
      }));
    } catch (e) {
      setError(e.message || 'Could not upload avatar.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function openFilePicker() {
    if (!uploadingAvatar && !saving && profileReady) {
      fileInputRef.current?.click();
    }
  }

  async function handleSignOut(e) {
    e.preventDefault();
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError('');
    try {
      const response = await fetch('/api/signout', {
        method: 'POST', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok || !result.signedOut) throw new Error(result.error || 'Could not sign out. Please try again.');
      setSession(null);
      setProfile(null);
      window.location.replace('/auth');
    } catch (error) {
      setSignOutError(error.name === 'TimeoutError' || error.name === 'AbortError'
        ? 'Sign-out took too long. Reload this page to check your session before trying again.'
        : error.message || 'Could not sign out. Please try again.');
      setSigningOut(false);
    }
  }
  const displayName =
    profile?.full_name?.trim() || user?.email?.split('@')[0] || 'You';

  const cityLabel = profile?.city?.trim() || 'Add city';

  const kidAgeLabel = useMemo(() => {
    const ages = Array.isArray(profile?.kid_ages)
      ? profile.kid_ages.filter((v) => Number.isFinite(Number(v))).map(Number)
      : [];

    if (!ages.length) return 'Add kid ages';

    const min = Math.min(...ages);
    const max = Math.max(...ages);

    if (min === max) return `${min}YO`;
    return `${min}-${max}YO`;
  }, [profile?.kid_ages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E8E8E8] px-4 py-5">
        <div className="mx-auto w-full max-w-md">
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-2xl bg-white/50" />
            <div className="h-40 animate-pulse rounded-2xl bg-white/50" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#E8E8E8] px-4 py-5">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-black/20 bg-white/60 px-4 py-4 text-sm text-gray-900">
            You’re not signed in. <Link href="/auth" className="underline">Go to sign in</Link>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8E8E8] px-4 py-5">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10 flex items-center gap-5 pt-8">
          <button
            type="button"
            onClick={openFilePicker}
            disabled={uploadingAvatar || saving || !profileReady}
            className="shrink-0 rounded-full"
            aria-label={uploadingAvatar ? 'Uploading avatar' : 'Update avatar'}
          >
            <Avatar
              name={displayName}
              src={avatarUrl}
              size="xl"
              className="h-[88px] w-[88px] border border-black/30 text-[44px] font-bold"
              bgClassName="bg-white"
            />
          </button>

          <div className="min-w-0">
            <div className="truncate text-[18px] font-semibold text-black">
              {displayName}
            </div>
            <div className="mt-1 text-[14px] text-black/85">
              {cityLabel}
            </div>
            <div className="mt-1 text-[14px] text-black/85">
              {kidAgeLabel}
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />

        {error ? (
          <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <p role="status" className="mb-4 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">
            {message}
          </p>
        ) : null}

        {editing ? (
          <form onSubmit={saveProfile} className="mb-8 rounded-2xl border border-black/20 bg-white p-4">
            <h1 className="mb-4 text-lg font-semibold">Edit profile</h1>
            <fieldset disabled={saving} className="grid gap-4">
              <label className="grid gap-1 text-sm">
                Full name
                <input value={form.full_name} maxLength={100} autoComplete="name"
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="rounded-lg border border-black/30 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                City
                <input value={form.city} maxLength={120} autoComplete="address-level2"
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                  className="rounded-lg border border-black/30 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                Kid ages
                <input value={form.kid_ages} aria-describedby="kid-ages-help" maxLength={100}
                  onChange={(e) => setForm((prev) => ({ ...prev, kid_ages: e.target.value }))}
                  className="rounded-lg border border-black/30 px-3 py-2" />
                <span id="kid-ages-help" className="text-xs text-gray-600">Ages 0–18, separated by commas. For example: 3, 7. Leave blank to omit.</span>
              </label>
              <div className="flex gap-3">
                <button type="submit" className="rounded-full bg-black px-4 py-2 text-sm text-white">
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
                <button type="button" onClick={() => { setEditing(false); setError(''); }}
                  className="rounded-full border border-black/30 px-4 py-2 text-sm">Cancel</button>
              </div>
            </fieldset>
          </form>
        ) : (
          <button type="button" onClick={editProfile} disabled={uploadingAvatar || !profileReady}
            className="mb-8 rounded-full border border-black/30 bg-white px-4 py-2 text-sm disabled:opacity-50">
            Edit profile
          </button>
        )}

        <div className="space-y-5 px-6">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[14px] text-black">Enable Push Notifications</span>
            <EnablePushButton />
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-[14px] text-black">Email notifications</span>
            <Link href="/notification-settings" className="text-xs text-black underline underline-offset-2">Manage email</Link>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[14px] text-black">Profile visibility settings</span>
            <span className="text-xs text-gray-600">Coming soon</span>
          </div>
        </div>

        <form action="/api/signout" method="post" onSubmit={handleSignOut} className="mt-24 px-10">
          {signOutError && <p role="alert" className="mb-3 text-sm text-red-700">{signOutError}</p>}
          <button
            type="submit"
            disabled={signingOut}
            className="w-full rounded-full bg-[#111111] px-4 py-3 text-base font-medium text-white"
          >
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </form>
      </div>
    </div>
  );
}