
import {NextResponse} from 'next/server';
import {validBearer,validDispatchProof} from '../../../../lib/push-dispatch-auth';
import {deliverPendingPush,consumeDispatchNonce} from '../../../../lib/push-delivery';
import {deliverPendingEmail} from '../../../../lib/email-delivery';
export const maxDuration=60;
export async function POST(req){
 const secret=process.env.PUSH_DISPATCH_SECRET;
 let authorized=validBearer(req.headers.get('authorization'),secret);
 if(!authorized){
  try{const raw=await req.text();if(raw.length>1000)throw new Error();const proof=JSON.parse(raw);if(validDispatchProof(proof,secret))authorized=await consumeDispatchNonce(proof.nonce);}catch{}
 }
 if(!authorized)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const results=await Promise.allSettled([deliverPendingPush(),deliverPendingEmail()]);if(results.some(r=>r.status==='rejected'))throw new Error('Delivery unavailable');return NextResponse.json({ok:true});}catch{return NextResponse.json({error:'Delivery temporarily unavailable'},{status:503});}
}
