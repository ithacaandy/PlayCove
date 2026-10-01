import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { safeReturnPath } from '../../../../lib/auth-navigation';
export async function GET(req) {
 const url=new URL(req.url), next=safeReturnPath(url.searchParams.get('next'));
 const response=NextResponse.redirect(new URL(next,url.origin));
 const failure=() => NextResponse.redirect(new URL('/auth?error=google&next='+encodeURIComponent(next),url.origin));
 const code=url.searchParams.get('code');
 if(!code || url.searchParams.get('error')) return failure();
 try {
  const s=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{get(name){return req.cookies.get(name)?.value;},set(name,value,options){response.cookies.set({name,value,...options});},remove(name,options){response.cookies.set({name,value:'',...options,maxAge:0});}}});
  const {error}=await s.auth.exchangeCodeForSession(code);
  if(error) return failure();
  return response;
 } catch {return failure();}
}
