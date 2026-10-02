export function pauseUntil(choice,custom,now=new Date()) {
 const end=new Date(now);
 if(choice==='today'){end.setHours(24,0,0,0);}
 else if(choice==='day')end.setTime(end.getTime()+86400000);
 else if(choice==='week')end.setTime(end.getTime()+7*86400000);
 else if(choice==='until')end.setTime(new Date(custom).getTime());
 else throw new Error('Choose a pause duration.');
 if(!Number.isFinite(end.getTime()) || end<=now || end.getTime()>now.getTime()+366*86400000)throw new Error('Choose a future time within the next year.');
 return end.toISOString();
}
export function pushState(settings,now=Date.now()){
 if(!settings?.enabled)return 'off';
 return settings.paused_until && new Date(settings.paused_until).getTime()>now?'paused':'on';
}
