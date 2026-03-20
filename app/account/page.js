'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import EnablePushButton from '@/app/components/EnablePushButton';
import Avatar from '@/app/components/Avatar';

const supabase = getSupabaseClient();

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [error, setError] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [profileVisible, setProfileVisible] = useState(true);

  const fileInputRef = useRef(null);
  const user = session?.user || null;

  useEffect(() => {
    if (!supabase) return;

    (async () => {
      setLoading(true);
      setError('');

      const { data: sessionData } = await supabase.auth.getSession();
      const currentSession = sessionData?.session || null;
      setSession(currentSession);

      const uid = currentSession?.user?.id;

      if (uid) {
        const { data: prof, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, city, kid_ages, avatar_url')
          .eq('id', uid)
          .maybeSingle();

        if (profileError) {
          setError(profileError.message || 'Could not load profile.');
        }

        setProfile(prof || null);

        const metaUrl =
          currentSession?.user?.user_metadata?.avatar_url ||
          currentSession?.user?.user_metadata?.picture ||
          null;

        setAvatarUrl(prof?.avatar_url || metaUrl || null);
      }

      setLoading(false);
    })();
  }, []);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    setError('');

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
      setAvatarUrl(cacheBustedUrl);

      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          avatar_url: publicUrl,
        },
        { onConflict: 'id' }
      );

      if (profileError) throw profileError;

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
    if (!uploadingAvatar) {
      fileInputRef.current?.click();
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    location.href = '/';
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
        <div className="mx-auto w-full max-w-md pb-24">
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
        <div className="mx-auto w-full max-w-md pb-24">
          <div className="rounded-2xl border border-black/20 bg-white/60 px-4 py-4 text-sm text-gray-900">
            You’re not signed in. <Link href="/auth" className="underline">Go to sign in</Link>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8E8E8] px-4 py-5">
      <div className="mx-auto w-full max-w-md pb-24">
        <div className="mb-10 flex items-center gap-5 pt-8">
          <button
            type="button"
            onClick={openFilePicker}
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
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-5 px-6">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[14px] text-black">Enable Push Notifications</span>
            <EnablePushButton />
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-[14px] text-black">Enable Email Notifications</span>
            <button
              type="button"
              onClick={() => setEmailNotifications((v) => !v)}
              aria-pressed={emailNotifications}
              className={`relative h-6 w-10 rounded-full border transition ${
                emailNotifications
                  ? 'border-[#B38F00] bg-[#F4C20D]'
                  : 'border-black/30 bg-[#D9D9D9]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full transition ${
                  emailNotifications
                    ? 'left-[18px] bg-[#F6C74E]'
                    : 'left-0.5 bg-[#666666]'
                }`}
              />
            </button>
          </div>

          <div>
            <Link
              href="/account/notifications"
              className="text-[14px] text-[#2563EB] underline"
            >
              Notification Settings
            </Link>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-[14px] text-black">Profile Visibility</span>
            <button
              type="button"
              onClick={() => setProfileVisible((v) => !v)}
              aria-pressed={profileVisible}
              className={`relative h-6 w-10 rounded-full border transition ${
                profileVisible
                  ? 'border-[#B38F00] bg-[#F4C20D]'
                  : 'border-black/30 bg-[#D9D9D9]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full transition ${
                  profileVisible
                    ? 'left-[18px] bg-[#F6C74E]'
                    : 'left-0.5 bg-[#666666]'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-24 px-10">
          <button
            type="button"
            onClick={signOut}
            className="w-full rounded-full bg-[#111111] px-4 py-3 text-base font-medium text-white"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}