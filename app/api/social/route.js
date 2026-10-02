import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabase-server';
const reads = new Set(['connections','audience','outings','outing','notices']);
const writes = new Set(['request_connection','respond_connection','disconnect','create_outing','respond_outing','cancel_outing','read_notice']);
async function run(action,payload) {
 const s=createServerSupabase(); const {data:{user},error:authError}=await s.auth.getUser();
 const headers={'Cache-Control':'private, no-store'};
 if(authError || !user) return NextResponse.json({error:'Please sign in first.'},{status:401,headers});
 const {data,error}=await s.rpc('social_action',{action,payload});
 if(error) return NextResponse.json({error:error.code==='42501'?'This action is not available to your account.':error.code==='P0001'?error.message:'Could not complete this action. Please try again.'},{status:error.code==='42501'?403:error.code==='P0001'?400:503,headers});
 return NextResponse.json({data},{headers});
}
export async function GET(req) {
 const params=new URL(req.url).searchParams; const action=params.get('action');
 if(!reads.has(action)) return NextResponse.json({error:'Invalid request.'},{status:400});
 return run(action,{id:params.get('id')});
}
export async function POST(req) {
 if(req.headers.get('origin')!==new URL(req.url).origin) return NextResponse.json({error:'Invalid request.'},{status:403});
 try {const body=await req.text(); if(body.length>12000) throw new Error(); const {action,payload}=JSON.parse(body); if(!writes.has(action) || !payload || typeof payload!=='object' || Array.isArray(payload)) throw new Error(); return run(action,payload);}
 catch {return NextResponse.json({error:'Invalid request.'},{status:400});}
}
