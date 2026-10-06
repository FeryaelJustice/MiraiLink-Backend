import { describe,it,expect } from 'vitest';
import {newCapsule,creditMessage,applyCapsuleAction,publicCapsule} from '../../../src/services/capsule-engine.js';
const start=()=>newCapsule('capsule',['a','b']);
describe('Crystal capsule rules',()=>{
    it('collapses a burst even across the boundary of a completed exchange',()=>{
        let s=start(); for(const [i,sender] of ['a','b','b','a'].entries()) s=creditMessage(s,sender,'turn '+i);
        expect(s.progress).toBe(1); expect(publicCapsule(s)).not.toHaveProperty('lastSpeaker');
    });
    it('requires both speakers and collapses a unilateral burst',()=>{
        let s=start(); for(let i=0;i<20;i++) s=creditMessage(s,'a','text '+i);
        expect(s.progress).toBe(0); s=creditMessage(s,'b','reply');expect(s.progress).toBe(1);
    });
    it('ignores retries, identical text and gesture cards',()=>{
        let s=creditMessage(start(),'a','hello');expect(creditMessage(s,'a',' HELLO ')).toBe(s);
        expect(creditMessage(s,'b','[GESTURE_ROULETTE:INVITE]')).toBe(s);
    });
    it('reveals after eight exchanges without exceeding the cap',()=>{
        let s=start();for(let i=0;i<8;i++){s=creditMessage(s,'a','a'+i);s=creditMessage(s,'b','b'+i);}
        expect(s).toMatchObject({progress:8,level:4,status:'revealed'});expect(creditMessage(s,'a','more')).toBe(s);
    });
    it('requires the other participant to accept revelation',()=>{
        let s=applyCapsuleAction(start(),'a',{type:'request_reveal',expectedRevision:0});
        expect(()=>applyCapsuleAction(s,'a',{type:'accept_reveal',expectedRevision:s.revision})).toThrow();
        expect(applyCapsuleAction(s,'b',{type:'accept_reveal',expectedRevision:s.revision}).status).toBe('revealed');
    });
    it('pauses without revealing and requires both to resume',()=>{
        let s=applyCapsuleAction(start(),'a',{type:'pause',expectedRevision:0});
        expect(creditMessage(s,'b','reply')).toBe(s);
        s=applyCapsuleAction(s,'a',{type:'resume',expectedRevision:s.revision});expect(s.status).toBe('paused');
        s=applyCapsuleAction(s,'b',{type:'resume',expectedRevision:s.revision});expect(s.status).toBe('active');
    });
    it('credits a bilateral mission only once, including repeated question instances',()=>{
        let s=start(); const question={questionId:'q01',instanceId:'one',answeredBy:[]};
        const act=(who,action)=>{s=applyCapsuleAction(s,who,{...action,expectedRevision:s.revision});};
        act('a',{type:'question',question});act('a',{type:'answer',missionId:'one'});expect(s.progress).toBe(0);
        act('b',{type:'answer',missionId:'one'});expect(s.progress).toBe(2);
        act('a',{type:'question',question:{...question,instanceId:'two'}});
        act('a',{type:'answer',missionId:'two'});act('b',{type:'answer',missionId:'two'});expect(s.progress).toBe(2);
    });
    it('rejects strangers and stale revisions and excludes internal message state',()=>{
        expect(()=>applyCapsuleAction(start(),'c',{type:'pause',expectedRevision:0})).toThrow();
        expect(()=>applyCapsuleAction(start(),'a',{type:'pause',expectedRevision:9})).toThrow();
        expect(publicCapsule(start())).not.toHaveProperty('lastHashes');
    });
});
