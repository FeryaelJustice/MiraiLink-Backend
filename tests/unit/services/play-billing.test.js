import { describe,it,expect,vi } from 'vitest';
const query=vi.fn();
vi.mock('../../../src/models/db.js',()=>({ default:{ connect:async()=>({ query,release:vi.fn() }) } }));
const { parsePlayPurchase,verifyAndSavePurchase,accountHash }=await import('../../../src/services/play-billing.js');
const user='00000000-0000-4000-8000-000000000001';
const purchase=()=>({ subscriptionState:'SUBSCRIPTION_STATE_ACTIVE',acknowledgementState:'ACKNOWLEDGEMENT_STATE_PENDING',externalAccountIdentifiers:{obfuscatedExternalAccountId:accountHash(user)},lineItems:[{productId:'mirailink_plus',expiryTime:new Date(Date.now()+86400000).toISOString(),offerDetails:{basePlanId:'weekly-autorenew'}}] });
describe('Google Play authority',()=>{
    it.each(['SUBSCRIPTION_STATE_PENDING','SUBSCRIPTION_STATE_ON_HOLD','SUBSCRIPTION_STATE_EXPIRED'])('denies %s',state=>{
        expect(parsePlayPurchase({...purchase(),subscriptionState:state}).status).toBe('expired');
    });
    it('preserves access during grace and canceled paid term',()=>{
        expect(parsePlayPurchase({...purchase(),subscriptionState:'SUBSCRIPTION_STATE_CANCELED'}).status).toBe('active');
        expect(parsePlayPurchase({...purchase(),subscriptionState:'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'}).status).toBe('active');
    });
    it('does not accept product mismatch or expired purchase',()=>{
        expect(()=>parsePlayPurchase(purchase(),'mirailink_premium')).toThrow();
        const p=purchase();p.lineItems[0].expiryTime='2020-01-01T00:00:00Z';
        expect(parsePlayPurchase(p).status).toBe('expired');
    });
    it('rejects a token already attached to someone else without saving',async()=>{
        query.mockReset();query.mockImplementation(async sql=>({rows:sql.startsWith('SELECT user_id')?[{user_id:'someone-else'}]:[]}));
        await expect(verifyAndSavePurchase(user,'token',null,{queryPurchase:async()=>purchase()})).rejects.toMatchObject({code:'PURCHASE_ALREADY_BOUND'});
        expect(query.mock.calls.some(([sql])=>sql.includes('INSERT INTO user_subscriptions'))).toBe(false);
    });
    it('stores provider expiry and acknowledges only after commit, including repeat verification',async()=>{
        query.mockReset();query.mockResolvedValue({rows:[]});const p=purchase();
        query.mockImplementation(async sql=>({rows:sql.includes('RETURNING *')?[{expires_at:p.lineItems[0].expiryTime}]:[]}));
        const acknowledge=vi.fn(async()=>{expect(query.mock.calls.at(-1)[0]).toBe('COMMIT');});
        await verifyAndSavePurchase(user,'token','mirailink_plus',{queryPurchase:async()=>p,acknowledge});
        const values=query.mock.calls.find(([sql])=>sql.includes('INSERT INTO user_subscriptions'))[1];
        expect(values[7]).toBe(p.lineItems[0].expiryTime);expect(acknowledge).toHaveBeenCalledOnce();
    });
});
