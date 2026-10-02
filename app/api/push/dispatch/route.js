
import {timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {deliverPendingPush} from '../../../../lib/push-delivery';
export const maxDuration=60;
export async function POST(req){
 const secret=process.env.PUSH_DISPATCH_SECRET;
 const supplied=req.headers.get('authorization') || '';
 const expected=secret?'Bearer '+secret:'';
 if(!expected || supplied.length!==expected.length || !timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{await deliverPendingPush();return NextResponse.json({ok:true});}catch{return NextResponse.json({error:'Delivery temporarily unavailable'},{status:503});}
}
