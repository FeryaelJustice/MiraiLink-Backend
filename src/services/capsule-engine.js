import { createHash } from 'node:crypto';
import { AppError } from '../errors/AppError.js';

export function newCapsule(id, userIds) {
    return { id, userIds, status: 'active', progress: 0, level: 0, revision: 0, rulesVersion: 1,
        pendingSender: null, lastSpeaker: null, lastHashes: {}, resumeAccepted: [], revealRequestedBy: null,
        question: null, seenQuestionIds: [], completedQuestionIds: [] };
}
export function publicCapsule(state) {
    const snapshot = structuredClone(state);
    delete snapshot.pendingSender; delete snapshot.lastSpeaker; delete snapshot.lastHashes;
    return snapshot;
}
function advance(state, units) {
    state.progress = Math.min(8, state.progress + units);
    state.level = Math.floor(state.progress / 2);
    if (state.progress === 8) { state.status = 'revealed'; state.revealRequestedBy = null; }
}
export function creditMessage(previous, senderId, text) {
    if (previous.status !== 'active' || !previous.userIds.includes(senderId)) return previous;
    const normalized = text.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!normalized || normalized.startsWith('[gesture_roulette:')) return previous;
    const hash = createHash('sha256').update(normalized).digest('hex');
    if (previous.lastHashes[senderId] === hash) return previous;
    const state = structuredClone(previous);
    state.lastHashes[senderId] = hash;
    if (previous.lastSpeaker !== senderId) {
        if (state.pendingSender && state.pendingSender !== senderId) { advance(state, 1); state.pendingSender = null; }
        else state.pendingSender = senderId;
    }
    state.lastSpeaker = senderId;
    state.revision++;
    return state;
}
export function applyCapsuleAction(previous, actorId, action) {
    if (!previous.userIds.includes(actorId)) throw new AppError({ status: 403, code: 'CAPSULE_FORBIDDEN' });
    if (previous.revision !== action.expectedRevision) throw new AppError({ status: 409, code: 'CAPSULE_STATE_CHANGED' });
    if (previous.status === 'revealed') throw new AppError({ status: 409, code: 'CAPSULE_REVEALED' });
    const state = structuredClone(previous);
    const invalid = () => { throw new AppError({ status: 409, code: 'CAPSULE_INVALID_ACTION' }); };
    switch (action.type) {
    case 'pause': case 'leave':
        state.status = action.type === 'pause' ? 'paused' : 'left'; state.resumeAccepted = []; state.pendingSender = null; state.lastSpeaker = null; state.revealRequestedBy = null; break;
    case 'resume':
        if (state.status === 'active' || state.status === 'cancelled') invalid();
        state.resumeAccepted = [...new Set([...state.resumeAccepted, actorId])];
        if (state.resumeAccepted.length === 2) { state.status = 'active'; state.resumeAccepted = []; }
        break;
    case 'request_reveal': state.revealRequestedBy = actorId; break;
    case 'accept_reveal':
        if (!state.revealRequestedBy || state.revealRequestedBy === actorId) invalid();
        state.status = 'revealed'; state.level = 4; state.revealRequestedBy = null; break;
    case 'decline_reveal': case 'cancel_reveal': state.revealRequestedBy = null; break;
    case 'question':
        if (state.status !== 'active' || !action.question) invalid();
        state.question = action.question;
        state.seenQuestionIds = [...new Set([...state.seenQuestionIds, action.question.questionId])]; break;
    case 'answer':
        if (state.status !== 'active' || !state.question || state.question.instanceId !== action.missionId || state.question.answeredBy.includes(actorId)) invalid();
        state.question.answeredBy.push(actorId);
        if (state.question.answeredBy.length === 2) {
            if (!state.completedQuestionIds.includes(state.question.questionId)) { advance(state, 2); state.completedQuestionIds.push(state.question.questionId); }
            state.question.completed = true;
        }
        break;
    default: invalid();
    }
    state.revision++;
    return state;
}
