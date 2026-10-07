import { calculateDistanceKm,resolveUserCoordinates } from '../utils/geoSearch.js';
const WEEK=7*86400000;
export function adult(profile,now=new Date()) {
    if (!profile.birthdate) return false;
    const born=new Date(profile.birthdate); if(!Number.isFinite(born.getTime())) return false;
    const cutoff=new Date(now);cutoff.setUTCFullYear(cutoff.getUTCFullYear()-18);
    return born<=cutoff;
}
export function complete(profile,now=new Date()) {
    return (profile.discovery_mode ?? 'classic') === 'classic' && profile.is_verified && !profile.is_deleted && profile.enabled !== false && adult(profile,now)
        && Boolean(profile.avatar_url) && Boolean(profile.bio?.trim()) && profile.interests?.length>=2 && profile.goals?.length>0;
}
export function eligible(profile,now=new Date()) {
    return complete(profile,now) && Date.parse(profile.last_active_at)>=now.getTime()-WEEK
        && Date.parse(profile.observed_since)<=now.getTime()-WEEK
        && (!profile.last_like_at || Date.parse(profile.last_like_at)<=now.getTime()-WEEK)
        && (!profile.last_match_at || Date.parse(profile.last_match_at)<=now.getTime()-WEEK);
}
export function goalsCompatible(a,b) {
    const normalize=g=>g==='marriage'?'relationship':g;
    if(a.includes('not_sure')||b.includes('not_sure')) return true;
    return a.map(normalize).some(g=>b.map(normalize).includes(g));
}
function allows(a,b,now) {
    const plus=a.provider_verified && a.subscription_status==='active' && Date.parse(a.expires_at)>now.getTime();
    const premium=plus&&a.product_id==='mirailink_premium';
    if(plus && ['male','female'].includes(a.search_gender) && a.search_gender!==b.gender) return false;
    const scope=a.search_scope??'radius_residence';
    if(scope==='world') return premium;
    if(scope==='specific_country') return premium && Boolean(a.search_target_country_id) && a.search_target_country_id===b.residence_country_id;
    if(scope==='country') return Boolean(a.residence_country_id)&&a.residence_country_id===b.residence_country_id;
    const active=scope==='radius_active'||(scope==='radius'&&a.search_match_live_location);
    const origin=resolveUserCoordinates(a,active,now);const target=resolveUserCoordinates(b,active,now);
    if(!origin||!target) return false;
    const distance=calculateDistanceKm(origin.latitude,origin.longitude,target.latitude,target.longitude);
    return distance<=Math.min(a.search_radius_km??40,plus?800:250);
}
export function rankCandidate(a,b,now=new Date()) {
    if(a.id===b.id||!complete(b,now)||(!Number.isFinite(Date.parse(b.last_active_at)) || Date.parse(b.last_active_at)<now.getTime()-WEEK)||!goalsCompatible(a.goals,b.goals)||!allows(a,b,now)||!allows(b,a,now)) return null;
    const left=new Set(a.interests.map(i=>i.key));const right=new Set(b.interests.map(i=>i.key));
    const common=[...left].filter(k=>right.has(k));
    if(common.length<2) return null;
    return {targetId:b.id,commonKeys:common,score:common.length/new Set([...left,...right]).size,activity:b.last_active_at};
}
