'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import EnablePushButton from '@/app/components/EnablePushButton';
import Avatar from '@/app/components/Avatar';

const supabase = getSupabaseClient();

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [session, setSession] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    city: '',
    kid_ages: '',
  });

  const fileInputRef = useRef(null);
  const user = session?.user || null;

  useEffect(() => {
    if (!supabase) return;

    (async () => {
      setLoading(true);
      setError('');
      setMessage('');

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

        setForm({
          full_name: prof?.full_name || '',
          city: prof?.city || '',
          kid_ages: Array.isArray(prof?.kid_ages) ? prof.kid_ages.join(', ') : '',
        });

        const metaUrl =
          currentSession?.user?.user_metadata?.avatar_url ||
          currentSession?.user?.user_metadata?.picture ||
          null;

        setAvatarUrl(prof?.avatar_url || metaUrl || null);
      }

      setLoading(false);
    })();
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function parseKidAges(input) {
    return input
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => Number(v))
      .filter((v) => Number.isInteger(v) && v >= 0 && v <= 18);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const kidAges = parseKidAges(form.kid_ages);

      const { error: upsertError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          full_name: form.full_name.trim() || null,
          city: form.city.trim() || null,
          kid_ages: kidAges,
          avatar_url: avatarUrl || null,
        },
        { onConflict: 'id' }
      );

      if (upsertError) throw upsertError;

      setMessage('Profile saved.');
    } catch (e) {
      setError(e.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

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
      setAvatarUrl(cacheBustedUrl);

      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          avatar_url: publicUrl,
        },
        { onConflict: 'id' }
      );

      if (profileError) throw profileError;

      setMessage('Avatar updated.');
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

  return (
    <div className="py-6">
      <h1 className="text-xl font-semibold text-gray-900">Account</h1>

      {loading ? (
        <div className="mt-4 animate-pulse space-y-3">
          <div className="h-24 w-full rounded-xl bg-gray-200" />
          <div className="h-48 w-full rounded-xl bg-gray-200" />
        </div>
      ) : !user ? (
        <div className="mt-4 rounded-xl border border-black/10 bg-white px-4 py-4 text-gray-700">
          You’re not signed in. Go to{' '}
          <Link href="/auth" className="underline">
            /auth
          </Link>
          .
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-visible">
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="relative h-16 w-16 overflow-hidden rounded-full transition hover:scale-[1.03] active:scale-[0.98]"
                  aria-label="Upload avatar"
                  title="Upload avatar"
                >
                  <Avatar
                    name={form.full_name}
                    src={avatarUrl}
                    size="md"
                  />
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                      Uploading
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={openFilePicker}
                  aria-label="Upload avatar"
                  className="absolute -bottom-1 -right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white bg-black text-white shadow"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M9 4.5a1 1 0 0 1 .8-.4h4.4a1 1 0 0 1 .8.4l1 1.3h2a2 2 0 0 1 2 2v8.9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.8a2 2 0 0 1 2-2h2l1-1.3Zm3 11.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z" />
                  </svg>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />

              <div>
                <div className="text-sm text-gray-500">Signed in as</div>
                <div className="font-medium text-gray-900">{user.email}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {uploadingAvatar ? 'Uploading avatar…' : 'Tap photo to update'}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Profile</h2>

            <form onSubmit={handleSave} className="mt-4 grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm text-gray-900">Full name</span>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => updateField('full_name', e.target.value)}
                  className="rounded-lg border border-black/10 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm text-gray-900">City</span>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="rounded-lg border border-black/10 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm text-gray-900">Kid ages</span>
                <input
                  type="text"
                  value={form.kid_ages}
                  onChange={(e) => updateField('kid_ages', e.target.value)}
                  className="rounded-lg border border-black/10 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </label>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              {message && (
                <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Settings</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                onClick={signOut}
                className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-gray-50"
              >
                Sign out
              </button>

              <EnablePushButton />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}