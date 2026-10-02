'use client';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname} from 'next/navigation';

import {useNotifications} from './NotificationProvider';
const items=[{href:'/',label:'Home',icon:'apartment'},{href:'/discover',label:'Discover',icon:'compass'},{href:'/heading-out',label:'Heading out',action:true},{href:'/groups',label:'Groups',icon:'networking'},{href:'/mine',label:'Events',icon:'reservation'}];
export default function BottomNav(){
 const pathname=usePathname();const {items:notifications}=useNotifications();
 return <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] backdrop-blur" style={{paddingBottom:'env(safe-area-inset-bottom)'}}><ul className="mx-auto grid max-w-screen-md grid-cols-5 items-center px-1 py-2">{items.map(item=>{
 const active=item.href==='/'?['/','/notifications','/connections'].includes(pathname):pathname===item.href || pathname.startsWith(item.href+'/');
 const count=item.href==='/'?notifications.length:0;
 return <li key={item.href}><Link href={item.href} prefetch={false} aria-current={active?'page':undefined} aria-label={count?`Home, ${count} pending notifications`:item.label} className={`flex min-h-14 flex-col items-center justify-center rounded-xl px-1 text-center ${active?'text-gray-900':'text-gray-600'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}>
 <span className={`relative flex items-center justify-center rounded-xl ${item.action?'h-11 w-12 bg-yellow-300 shadow-sm':'h-9 w-10'} ${active?'ring-2 ring-yellow-400':''}`}>{item.action?<Image src="/brand/icons/check-in.png" alt="" width={34} height={34} className="h-[34px] w-[34px] object-contain"/>:<Image src={`/brand/icons/${item.icon}.png`} alt="" width={30} height={30} className="h-[30px] w-[30px] object-contain"/>}{count>0 && <span aria-hidden="true" className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">{count>99?'99+':count}</span>}</span>
 <span className={`mt-1 whitespace-nowrap text-[10px] ${item.action || active?'font-semibold':'font-medium'}`}>{item.label}</span></Link></li>;
 })}</ul></nav>;
}
