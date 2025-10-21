import { NextResponse } from 'next/server';

export async function GET() {
  // Later: set these in .env and return only the public key.
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  if (!publicKey) return NextResponse.json({ error: 'No VAPID public key' }, { status: 500 });
  return NextResponse.json({ publicKey });
}
