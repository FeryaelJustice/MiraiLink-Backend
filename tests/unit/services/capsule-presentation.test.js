import {beforeEach,describe,it,expect,vi} from 'vitest';
const query=vi.fn();vi.mock('../../../src/models/db.js',()=>({default:{query}}));
const {presentCapsulePhotos}=await import('../../../src/middleware/capsulePresentation.middleware.js');
const req=capable=>({user:{id:'a'},get:()=>capable?'crystal-capsule-v1':undefined});
describe('Capsule photo projection',()=>{
    beforeEach(()=>query.mockReset());
    it('removes photos and avatars for an old client including nested summaries',async()=>{
        query.mockResolvedValue({rows:[{id:'b',mode:'classic',capsule_id:'capsule',snapshot:{status:'paused',level:1},revision:2}]});
        const body={destinatary:{id:'b',avatarUrl:'photo'},user:{id:'b',photos:[{url:'photo'}]}};
        await presentCapsulePhotos(body,req(false));expect(body.destinatary.avatarUrl).toBeNull();expect(body.user.photos).toEqual([]);expect(body.user.photoPresentation.veiled).toBe(true);
    });
    it('keeps compatible images with their veil policy and never veils own profile',async()=>{
        query.mockResolvedValue({rows:[{id:'b',mode:'capsule'}]});
        const body=[{id:'a',photos:[{url:'own'}]},{id:'b',photos:[{url:'other'}]}];
        await presentCapsulePhotos(body,req(true));expect(body[0]).not.toHaveProperty('photoPresentation');expect(body[1].photos).toHaveLength(1);expect(body[1].photoPresentation.level).toBe(0);
    });
    it('preserves a pre-existing classic match when its peer opts into capsule discovery',async()=>{
        query.mockResolvedValue({rows:[{id:'b',mode:'capsule',has_match:true}]});
        const user={id:'b',photos:[{url:'photo'}]};await presentCapsulePhotos(user,req(false));expect(user.photos).toHaveLength(1);expect(user.photoPresentation.veiled).toBe(false);
    });
    it('a revealed pair overrides the current capsule discovery mode',async()=>{
        query.mockResolvedValue({rows:[{id:'b',mode:'capsule',snapshot:{status:'revealed',level:4}}]});
        const user={id:'b',photos:[{url:'photo'}]};await presentCapsulePhotos(user,req(false));expect(user.photos).toHaveLength(1);expect(user.photoPresentation.veiled).toBe(false);
    });
});
