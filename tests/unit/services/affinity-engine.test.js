import { describe,it,expect } from 'vitest';
import { adult,eligible,rankCandidate } from '../../../src/services/affinity-engine.js';
const now=new Date('2026-10-06T12:00:00Z');
const base={id:'a',is_verified:true,is_deleted:false,birthdate:'2000-01-01',avatar_url:'avatar',bio:'hello',enabled:true,
    observed_since:'2026-09-20',last_active_at:'2026-10-05',goals:['friendship'],interests:[{key:'anime:1'},{key:'game:1'}],
    residence_latitude:39.57,residence_longitude:2.65,search_radius_km:40,search_scope:'radius_residence'};
describe('Affinity eligibility and ranking',()=>{
    it('uses a complete seven day observation and outcome window',()=>{
        expect(eligible(base,now)).toBe(true);
        for(const extra of [{observed_since:'2026-10-01'},{last_like_at:'2026-10-03'},{last_active_at:null},{bio:''},{enabled:false}])expect(eligible({...base,...extra},now)).toBe(false);
    });
    it('requires adulthood and preserves capsule privacy',()=>{
        expect(adult({...base,birthdate:'2008-10-07'},now)).toBe(false);
        expect(adult({...base,birthdate:'2008-10-06'},now)).toBe(true);
        expect(eligible({...base,discovery_mode:'capsule'},now)).toBe(false);
    });
    it('scores only actual typed shared interests',()=>{
        const result=rankCandidate(base,{...base,id:'b',interests:[...base.interests,{key:'game:2'}]},now);
        expect(result.commonKeys).toEqual(['anime:1','game:1']);expect(result.score).toBeCloseTo(2/3);
        expect(rankCandidate(base,{...base,id:'b',interests:[{key:'anime:1'},{key:'game:2'}]},now)).toBeNull();
    });
    it('applies both directions of location, goals, activity and gender filters',()=>{
        for(const extra of [{last_active_at:null},{last_active_at:'bad'},{goals:['relationship']},{residence_latitude:0},{discovery_mode:'capsule'},{provider_verified:true,subscription_status:'active',expires_at:'2027-01-01',search_gender:'female'}])
            expect(rankCandidate({...base,gender:'male'},{...base,id:'b',...extra},now)).toBeNull();
        expect(rankCandidate({...base,goals:['marriage']},{...base,id:'b',goals:['relationship']},now)).not.toBeNull();
    });
});
