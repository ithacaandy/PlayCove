import {pushReady} from '../../../../lib/push-delivery';
import {NextResponse} from 'next/server';
import {createServerSupabase} from '../../../../lib/supabase-server';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 try {const s=createServerSupabase();const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:'Please sign in.'},{status:401,headers});
 const {data,error}=await s.from('notification_preferences').select('enabled,paused_until').eq('user_id',user.id).maybeSingle();if(error)throw error;
 const availability=await s.rpc('push_available');if(availability.error)throw availability.error;
 return NextResponse.json({settings:data || {enabled:false,paused_until:null},deliveryReady:pushReady() && availability.data===true},{headers});
 }catch{return NextResponse.json({error:'Notification settings could not load.'},{status:503,headers});}
}
export async function POST(req){
 if(req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Invalid request.'},{status:403,headers});
 try {const s=createServerSupabase();const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:'Please sign in.'},{status:401,headers});
 const raw=await req.text();if(raw.length>1000)return NextResponse.json({error:'Invalid request.'},{status:400,headers});
 const input=JSON.parse(raw);let update={updated_at:new Date().toISOString()};
 if(input.action==='off'){update.enabled=false;update.paused_until=null;}
 else if(input.action==='resume')update.paused_until=null;
 else if(input.action==='pause'){const end=new Date(input.until);if(!Number.isFinite(end.getTime()) || end.getTime()<=Date.now() || end.getTime()>Date.now()+366*86400000)return NextResponse.json({error:'Choose a future pause end time within the next year.'},{status:400,headers});update.paused_until=end.toISOString();}
 else return NextResponse.json({error:'Invalid action.'},{status:400,headers});
 const {data:existing,error:readError}=await s.from('notification_preferences').select('user_id').eq('user_id',user.id).maybeSingle();if(readError)throw readError;
 const result=existing?await s.from('notification_preferences').update(update).eq('user_id',user.id).select('enabled,paused_until').single():await s.from('notification_preferences').insert({...update,user_id:user.id}).select('enabled,paused_until').single();if(result.error)throw result.error;
 return NextResponse.json({settings:result.data},{headers});
 }catch{return NextResponse.json({error:'Could not save notification settings.'},{status:503,headers});}
}
