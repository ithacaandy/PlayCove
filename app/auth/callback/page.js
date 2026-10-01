import { redirect } from 'next/navigation';
import { safeReturnPath } from '../../../lib/auth-navigation';
export default function Callback({searchParams}) {
 const params=new URLSearchParams();
 for(const key of ['code','error']) if(typeof searchParams[key]==='string') params.set(key,searchParams[key]);
 params.set('next',safeReturnPath(searchParams.next));
 redirect('/api/auth/callback?'+params.toString());
}
