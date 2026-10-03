import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';
function date(value) { return value ? new Date(value).toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' }) : '—'; }
export default async function BetaDashboard() {
  const client = await createServerSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/auth');
  const { data: admin, error: adminError } = await client.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (adminError || !admin) redirect('/');
  const { data, error } = await client.rpc('beta_tester_dashboard');
  const testers = data || [];
  const completed = testers.filter(tester => tester.completedAt).length;
  return <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
    <Link href="/admin" className="text-sm underline">Back to moderation</Link>
    <h1 className="text-2xl font-semibold">Beta tester progress</h1>
    <p className="text-sm text-gray-600">Private to existing admins. Tracks Welcome completion, saved mission actions, and feedback—not every click. Dates use Eastern Time.</p>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">Tester progress could not load. Refresh to try again.</p> : <>
      <div className="grid grid-cols-3 gap-3">{[['Testers', testers.length], ['Welcome completed', testers.filter(t => t.welcomeCompletedAt).length], ['Mission completed', completed]].map(([label, count]) => <div key={label} className="rounded-xl border bg-white p-3"><p className="text-sm">{label}</p><p className="text-xl font-semibold">{count}</p></div>)}</div>
      <section className="space-y-4"><h2 className="font-semibold">Mission: Let your group know you’re heading out</h2>
        {testers.map(tester => <article key={tester.email} className="rounded-2xl border bg-white p-4">
          <h3 className="font-semibold">{tester.name}</h3><p className="text-sm text-gray-600">{tester.email}</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="font-medium">Welcome</dt><dd>{tester.welcomeCompletedAt ? 'Completed · ' + date(tester.welcomeCompletedAt) : tester.welcomeStep == null ? tester.userId ? 'Not started' : 'Not signed up' : 'Step ' + (tester.welcomeStep + 1) + ' of 5'}</dd></div><div><dt className="font-medium">Mission</dt><dd>{tester.completedAt ? 'Completed · ' + date(tester.completedAt) : tester.deferredAt ? 'Saved for later' : tester.startedAt ? 'Started · ' + date(tester.startedAt) : tester.assignedAt ? 'Assigned · ' + date(tester.assignedAt) : 'Locked until Welcome is complete'}</dd></div><div><dt className="font-medium">Group outings shared for this mission</dt><dd>{tester.outingsShared}</dd></div><div><dt className="font-medium">Last setup or mission activity</dt><dd>{date(tester.lastActivityAt)}</dd></div></dl>
          {tester.feedback.length > 0 && <div className="mt-4 space-y-2 border-t pt-3"><h4 className="font-medium">Mission feedback</h4>{tester.feedback.map((item, i) => <div key={i} className="rounded-xl bg-gray-50 p-3 text-sm"><p className="font-medium">{item.rating === 'easy' ? 'Easy to use' : item.rating === 'blocked' ? 'Couldn’t finish' : 'Confusing or slow'} · {date(item.createdAt)}</p>{item.message && <p className="mt-1 whitespace-pre-wrap">{item.message}</p>}</div>)}</div>}
        </article>)}
      </section>
    </>}
  </main>;
}
