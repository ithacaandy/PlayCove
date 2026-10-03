'use client';
import {useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
export default function EmailUnsubscribe(){
 const token=useSearchParams().get('token');const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');
 async function unsubscribe(){setBusy(true);setError('');try{const r=await fetch('/api/email/unsubscribe?token='+encodeURIComponent(token || ''),{method:'POST',signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok)throw new Error(d.error);setDone(true);}catch(e){setError(e.message || 'Please try again.');}finally{setBusy(false);}}
 return <main className="mx-auto max-w-md p-4"><h1 className="text-2xl font-semibold">{done?'Email notifications turned off':'Unsubscribe from email notifications'}</h1><p className="mt-3 text-gray-600">{done?'You can turn email back on in notification settings. Your inbox and device alerts keep their current settings.':'Turn off all LinkLemon notification emails. Your inbox and device alerts keep their current settings.'}</p>{!done && <button disabled={busy || !/^[0-9a-f]{64}$/.test(token || '')} onClick={unsubscribe} className="mt-5 rounded-xl bg-yellow-300 px-5 py-3 font-semibold disabled:opacity-50">{busy?'Please wait…':'Unsubscribe'}</button>}{error && <p role="alert" className="mt-3 text-red-700">{error}</p>}<Link href="/notification-settings" className="mt-5 block underline">Notification settings</Link></main>;
}
