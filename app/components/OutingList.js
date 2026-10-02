'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {social,outingTime} from '../../lib/social-client';
export default function OutingList(){const [items,setItems]=useState([]),[error,setError]=useState('');
 useEffect(()=>{const c=new AbortController();async function load(){try{setItems(await social('outings',undefined,c.signal));setError('');}catch(e){if(e.name!=='AbortError')setError('Quick outings could not load. Please reload to try again.');}}load();const timer=setInterval(load,60000);window.addEventListener('focus',load);return()=>{c.abort();clearInterval(timer);window.removeEventListener('focus',load);};},[]);
 if(error)return <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>;
 if(!items.length)return null;
 return <section className="mb-5"><h2 className="mb-3 font-semibold">Quick outings</h2><ul className="space-y-3">{items.map(o=><li key={o.id}><Link className="block rounded-2xl border bg-white p-4" href={'/outings/'+o.id}><h3 className="font-semibold">{o.place}</h3><p className="mt-1 text-sm">{o.is_owner?'You’re heading out':o.host+' is heading out'} · {o.going?'You’re coming':outingTime(o.starts_at)}</p><p className="mt-1 text-sm text-gray-600">{o.attendees.length} joining · Until {new Date(o.ends_at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</p></Link></li>)}</ul></section>;
}
