import { AppError } from '../errors/AppError.js';

export function newCapsule(id, userIds) {
    return {
        id,
        userIds,
        status: 'active',
        progress: 0,
        level: 0,
        revision: 0,
        rulesVersion: 2,
        resumeAccepted: [],
        revealRequestedBy: null,
        question: null,
        seenQuestionIds: [],
        completedQuestionIds: [],
        completedQuestions: [],
    };
}

export function publicCapsule(state, forUserId = null, preferredLocale = null) {
    const snapshot = structuredClone(state);
    delete snapshot.pendingSender;
    delete snapshot.lastSpeaker;
    delete snapshot.lastHashes;
    if (snapshot.question) {
        if (forUserId && snapshot.question.authorId !== forUserId && !snapshot.question.completed) {
            snapshot.question.authorAnswer = null;
        }
        if (preferredLocale && !snapshot.question.isCustom && typeof snapshot.question.text === 'object') {
            snapshot.question.localizedText = snapshot.question.text[preferredLocale]
                || snapshot.question.text.es
                || snapshot.question.text.en
                || Object.values(snapshot.question.text)[0];
        }
    }
    if (snapshot.completedQuestions && preferredLocale) {
        for (const q of snapshot.completedQuestions) {
            if (!q.isCustom && typeof q.text === 'object') {
                q.localizedText = q.text[preferredLocale]
                    || q.text.es
                    || q.text.en
                    || Object.values(q.text)[0];
            }
        }
    }
    return snapshot;
}

function advance(state, units) {
    state.progress = Math.min(4, state.progress + units);
    state.level = state.progress;
    if (state.progress === 4) {
        state.status = 'revealed';
        state.revealRequestedBy = null;
    }
}

export function creditMessage(previous) {
    // En v2, los mensajes de chat convencionales ya no otorgan puntos ni progreso a la cápsula.
    return previous;
}

export function applyCapsuleAction(previous, actorId, action) {
    if (!previous.userIds.includes(actorId)) {
        throw new AppError({ status: 403, code: 'CAPSULE_FORBIDDEN' });
    }
    if (previous.revision !== action.expectedRevision) {
        throw new AppError({ status: 409, code: 'CAPSULE_STATE_CHANGED' });
    }
    if (previous.status === 'revealed') {
        throw new AppError({ status: 409, code: 'CAPSULE_REVEALED' });
    }

    const state = structuredClone(previous);
    const invalid = () => {
        throw new AppError({ status: 409, code: 'CAPSULE_INVALID_ACTION' });
    };

    switch (action.type) {
    case 'pause':
    case 'leave':
        state.status = action.type === 'pause' ? 'paused' : 'left';
        state.resumeAccepted = [];
        state.revealRequestedBy = null;
        break;

    case 'resume':
        if (state.status === 'active' || state.status === 'cancelled') invalid();
        state.resumeAccepted = [...new Set([...state.resumeAccepted, actorId])];
        if (state.resumeAccepted.length === 2) {
            state.status = 'active';
            state.resumeAccepted = [];
        }
        break;

    case 'request_reveal':
        state.revealRequestedBy = actorId;
        break;

    case 'accept_reveal':
        if (!state.revealRequestedBy || state.revealRequestedBy === actorId) invalid();
        state.status = 'revealed';
        state.progress = 4;
        state.level = 4;
        state.revealRequestedBy = null;
        break;

    case 'decline_reveal':
    case 'cancel_reveal':
        state.revealRequestedBy = null;
        break;

    case 'question': {
        if (state.status !== 'active') invalid();
        if (state.question !== null) {
            throw new AppError({ status: 400, code: 'TURN_BUSY', message: 'An active question is already pending an answer' });
        }
        const answer = (action.answer || '').trim();
        if (!answer || answer.length > 300) {
            throw new AppError({ status: 400, code: 'INVALID_INPUT', message: 'Answer is required and must not exceed 300 characters' });
        }

        const isCustom = Boolean(action.isCustom);
        const questionLang = action.questionLanguage || action.language || 'es';
        const questionLangId = action.questionLanguageId || null;
        const authorLang = action.authorLanguage || action.language || 'es';
        const authorLangId = action.authorLanguageId || null;
        let questionData;

        if (isCustom) {
            const customText = (action.customQuestion || action.text || '').trim();
            if (!customText || customText.length > 120) {
                throw new AppError({ status: 400, code: 'INVALID_INPUT', message: 'Custom question must be between 1 and 120 characters' });
            }
            const instanceId = action.instanceId || action.question?.instanceId || action.actionId;
            questionData = {
                instanceId,
                questionId: action.questionId || `custom_${instanceId}`,
                category: action.category,
                isCustom: true,
                text: customText,
                questionLanguage: questionLang,
                questionLanguageId: questionLangId,
                authorId: actorId,
                authorAnswer: answer,
                authorLanguage: authorLang,
                authorLanguageId: authorLangId,
                answeredBy: [actorId],
                completed: false,
                createdAt: new Date().toISOString(),
            };
        } else {
            const catalogQuestion = action.catalogQuestion || action.question;
            if (!catalogQuestion) invalid();
            const instanceId = action.instanceId || catalogQuestion.instanceId || action.actionId;
            const qId = catalogQuestion.id || catalogQuestion.questionId;
            const textResolved = action.questionText
                || catalogQuestion.text
                || (catalogQuestion.textEs ? { es: catalogQuestion.textEs, en: catalogQuestion.textEn } : qId);
            questionData = {
                instanceId,
                questionId: qId,
                category: action.category || catalogQuestion.category,
                isCustom: false,
                text: textResolved,
                questionLanguage: questionLang,
                questionLanguageId: questionLangId,
                authorId: actorId,
                authorAnswer: answer,
                authorLanguage: authorLang,
                authorLanguageId: authorLangId,
                answeredBy: [actorId],
                completed: false,
                createdAt: new Date().toISOString(),
            };
            state.seenQuestionIds = [...new Set([...(state.seenQuestionIds || []), qId])];
        }

        state.question = questionData;
        break;
    }

    case 'answer': {
        if (state.status !== 'active' || !state.question) invalid();
        if (state.question.instanceId !== action.missionId) invalid();
        if (state.question.answeredBy.includes(actorId) || state.question.authorId === actorId) invalid();

        const peerAnswer = (action.answer ?? action.text ?? '').trim();
        if (!peerAnswer || peerAnswer.length > 300) {
            throw new AppError({ status: 400, code: 'INVALID_INPUT', message: 'Answer is required and must not exceed 300 characters' });
        }

        const peerLang = action.peerLanguage || action.language || 'es';
        const peerLangId = action.peerLanguageId || null;

        state.question.answeredBy.push(actorId);

        // Se otorga exactamente 1 punto bilateral al responder la misma pregunta ambos usuarios
        advance(state, 1);

        if (!state.completedQuestionIds) state.completedQuestionIds = [];
        if (!state.completedQuestionIds.includes(state.question.questionId)) {
            state.completedQuestionIds.push(state.question.questionId);
        }

        const completedRecord = {
            questionId: state.question.questionId,
            instanceId: state.question.instanceId,
            category: state.question.category,
            isCustom: state.question.isCustom,
            text: state.question.text,
            questionLanguage: state.question.questionLanguage,
            questionLanguageId: state.question.questionLanguageId,
            authorId: state.question.authorId,
            authorAnswer: state.question.authorAnswer,
            authorLanguage: state.question.authorLanguage,
            authorLanguageId: state.question.authorLanguageId,
            peerAnswer,
            peerLanguage: peerLang,
            peerLanguageId: peerLangId,
            completedAt: new Date().toISOString(),
        };

        if (!state.completedQuestions) state.completedQuestions = [];
        state.completedQuestions.push(completedRecord);

        // Desocupar la pregunta activa para habilitar el siguiente turno
        state.question = null;
        break;
    }

    default:
        invalid();
    }

    state.revision++;
    return state;
}
