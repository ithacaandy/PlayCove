import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
export async function POST(req){
 const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
 try{
  const token=new URL(req.url).searchParams.get('token');
  if(!/^[0-9a-f]{64}$/.test(token || ''))return NextResponse.json({error:'This unsubscribe link is invalid.'},{status:400,headers});
  if(!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:'Please try again later.'},{status:503,headers});
  const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(10000)})}});const {error}=await s.rpc('email_unsubscribe',{token_value:token});
  if(error)return NextResponse.json({error:'Please try again later.'},{status:503,headers});
  return NextResponse.json({ok:true},{headers});
 }catch{return NextResponse.json({error:'Please try again later.'},{status:503,headers});}
}
