import {describe,it,expect,vi} from 'vitest';
import {likeWithMode,verifySwipeMode} from '../../../src/services/capsule-matching.js';
describe('Capsule match isolation',()=>{
    it('rejects a candidate whose mode changed before the swipe',async()=>{
        const client={query:vi.fn().mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[{user_id:'a',discovery_mode:'capsule'},{user_id:'b',discovery_mode:'classic'}]})};
        await expect(verifySwipeMode(client,'a','b','capsule')).rejects.toMatchObject({code:'CAPSULE_MODE_CHANGED'});
    });
    it('does not reinterpret a reciprocal like from another mode',async()=>{
        const client={query:vi.fn().mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[{discovery_mode:'capsule'}]})};
        await expect(likeWithMode(client,'a','b','classic',vi.fn())).rejects.toMatchObject({code:'CAPSULE_LIKE_MODE_CONFLICT'});
        expect(client.query.mock.calls.some(([s])=>s.includes('INSERT'))).toBe(false);
    });
    it('creates a capsule only for a reciprocal capsule pair',async()=>{
        const pair=[{user_id:'a',discovery_mode:'capsule'},{user_id:'b',discovery_mode:'capsule'}];
        const client={query:vi.fn().mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:pair}).mockResolvedValueOnce({rows:[{discovery_mode:'capsule'}]}).mockResolvedValueOnce({rows:[{discovery_mode:'capsule'}]}).mockResolvedValueOnce({rows:[{id:'match'}]})};
        const create=vi.fn();expect(await likeWithMode(client,'b','a','capsule',create)).toBe(true);
        expect(create).toHaveBeenCalledWith(client,['a','b'],'match');
    });
});
