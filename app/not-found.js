// app/not-found.js
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-screen-md px-3 py-10">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-gray-600">The page you’re looking for doesn’t exist.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Home</Link>
        <Link href="/groups" className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">My Groups</Link>
        <Link href="/account" className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Account</Link>
      </div>
    </div>
  );
}
