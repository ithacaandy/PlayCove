'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import EnablePushButton from '@/app/components/EnablePushButton';

const supabase = getSupabaseClient();

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // { id, full_name, city }
  const [avatarUrl, setAvatarUrl] = useState(null);
  const user = session?.user || null;

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      setSession(data?.session || null);

      const uid = data?.session?.user?.id;
      if (uid) {
        // load profile basics
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, full_name, city')
          .eq('id', uid)
          .single();
        setProfile(prof || null);

        // try to get avatar from user metadata (if you store it there)
        const metaUrl =
          data?.session?.user?.user_metadata?.avatar_url ||
          data?.session?.user?.user_metadata?.picture ||
          null;

        // or from storage (optional—comment out if unused)
        // const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(`public/${uid}.png`, 60);
        // const storageUrl = signed?.signedUrl || null;

        setAvatarUrl(metaUrl /* || storageUrl */);
      }
      setLoading(false);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    location.href = '/';
  }

  return (
    <div className="py-6">
      <h1 className="text-xl font-semibold">Account</h1>

      {loading ? (
        <div className="mt-4 animate-pulse space-y-3">
          <div className="h-16 w-full rounded bg-gray-200" />
        </div>
      ) : !user ? (
        <div className="mt-4 rounded-md border px-3 py-3 text-gray-700">
          You’re not signed in. Go to{' '}
          <Link href="/auth" className="underline">/auth</Link>.
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  width={64}
                  height={64}
                  className="h-16 w-16 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center text-gray-400">
                  <span className="text-sm">No avatar</span>
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-gray-500">Signed in as</div>
              <div className="font-medium">{user.email}</div>
              {profile?.full_name ? (
                <div className="text-sm text-gray-700">{profile.full_name}</div>
              ) : null}
              {profile?.city ? (
                <div className="text-sm text-gray-600">{profile.city}</div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={signOut}
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            >
              Sign out
            </button>

            {/* Enable Web Push */}
            <EnablePushButton />
          </div>

          <div className="mt-8 text-sm text-gray-500">
            Tip: For push to work, set <code className="rounded bg-gray-100 px-1">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> in your
            <code className="rounded bg-gray-100 px-1">.env.local</code> and ensure you added the route at{' '}
            <code className="rounded bg-gray-100 px-1">app/api/push/vapid/route.js</code>.
          </div>
        </>
      )}
    </div>
  );
}
