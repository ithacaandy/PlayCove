'use client';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

const supabase = getSupabaseClient();

export default function EnablePushButton() {
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.getRegistration().then(reg => {
      setOk(!!reg);
    });
  }, []);

  async function enablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push not supported on this browser.');
      return;
    }
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      // Ask server for VAPID public key
      const resp = await fetch('/api/push/vapid');
      const { publicKey } = await resp.json();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      const { endpoint, keys } = sub.toJSON();
      const { data: s } = await supabase.auth.getSession();
      const user_id = s?.session?.user?.id;
      if (!user_id) { alert('Please sign in.'); return; }

      await supabase.from('push_subscriptions').insert({
        user_id, endpoint, p256dh: keys.p256dh, auth: keys.auth
      }).select().single();

      setOk(true);
    } catch (e) {
      console.error(e);
      alert('Failed to enable push.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={enablePush}
      disabled={busy}
      className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
    >
      {busy ? 'Enabling…' : ok ? 'Push Enabled' : 'Enable Push'}
    </button>
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
