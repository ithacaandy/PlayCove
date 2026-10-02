import test from 'node:test';
import assert from 'node:assert/strict';
import {pauseUntil,pushState} from '../lib/push-preferences.js';
test('today ends at next local midnight, rather than 24 hours later',()=>{const now=new Date(2026,9,2,14,30);const end=new Date(pauseUntil('today',null,now));assert.equal(end.getHours(),0);assert.equal(end.getDate(),3);});
test('day and week represent exact durations',()=>{const now=new Date('2026-10-02T18:00:00Z');assert.equal(new Date(pauseUntil('day',null,now))-now,86400000);assert.equal(new Date(pauseUntil('week',null,now))-now,7*86400000);});
test('custom pause rejects past, invalid and excessively distant times',()=>{const now=new Date('2026-10-02T18:00:00Z');for(const value of ['bad','2026-10-01','2030-01-01'])assert.throws(()=>pauseUntil('until',value,now));});
test('pause expiry never opts an off account into alerts',()=>{const now=Date.now();assert.equal(pushState({enabled:false,paused_until:new Date(now+1000).toISOString()},now),'off');assert.equal(pushState({enabled:true,paused_until:new Date(now+1000).toISOString()},now),'paused');assert.equal(pushState({enabled:true,paused_until:new Date(now-1000).toISOString()},now),'on');});
