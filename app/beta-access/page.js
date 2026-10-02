import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '../../lib/supabase-server';
import { checkBetaAccess } from '../../lib/beta-access';

export const dynamic = 'force-dynamic';

export default async function BetaAccessPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const access = user ? await checkBetaAccess(supabase, process.env.LINKLEMON_BETA_GATE_ENABLED === 'true') : null;
  if (access?.allowed) redirect('/');
  return <main className="mx-auto max-w-md space-y-5 px-6 py-12">
    <p className="font-semibold text-green-800">LinkLemon</p>
    <h1 className="text-2xl font-bold">{access?.unavailable ? 'Please try again' : 'Welcome to our private beta'}</h1>
    <p>{access?.unavailable
      ? 'We could not check your beta access right now. Your account has not been removed.'
      : 'LinkLemon is currently available to a small group of invited testers. Sign in with the email address approved for beta access.'}</p>
    {user && <p className="break-all text-sm text-gray-600">Signed in as {user.email}</p>}
    {access?.unavailable && <Link href="/" className="block rounded-xl bg-yellow-300 px-4 py-3 text-center font-semibold">Try again</Link>}
    {user ? <form action="/api/signout" method="post"><button className="w-full rounded-xl border px-4 py-3">Sign out to use another account</button></form>
      : <Link href="/auth" className="block rounded-xl bg-yellow-300 px-4 py-3 text-center font-semibold">Sign in</Link>}
  </main>;
}
