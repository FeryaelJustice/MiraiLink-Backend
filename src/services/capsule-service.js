import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import db from '../models/db.js';
import { ensureContact } from './affinity-service.js';
import { AppError } from '../errors/AppError.js';
import { newCapsule, creditMessage, applyCapsuleAction, publicCapsule } from './capsule-engine.js';

export const capsuleCatalog = JSON.parse(readFileSync(new URL('../catalogs/crystal-capsule.json', import.meta.url), 'utf8'));
export const capsulesEnabled = () => process.env.CRYSTAL_CAPSULE_ENABLED === 'true';

export function requireCapsulesEnabled(req) {
    if (!capsulesEnabled() || !req.get('X-MiraiLink-Capabilities')?.split(',').includes('crystal-capsule-v1')) {
        throw new AppError({ status: 409, code: 'CAPSULE_UNAVAILABLE' });
    }
}

export async function resolveLanguage(client, preferredCode = 'es') {
    const code = String(preferredCode || 'es').trim().toLowerCase().split('-')[0];
    try {
        let result = await client.query('SELECT id, code, english_name FROM supported_languages WHERE code = $1', [code]);
        if (!result.rows[0]) {
            result = await client.query('SELECT id, code, english_name FROM supported_languages WHERE code = $1', ['es']);
        }
        return result.rows[0] ?? { id: null, code: 'es', english_name: 'Spanish' };
    } catch {
        return { id: null, code: code || 'es', english_name: 'Unknown' };
    }
}

export async function getCapsuleConfig(locale = 'es') {
    const client = await db.connect();
    try {
        const lang = await resolveLanguage(client, locale);
        const questionsRes = await client.query(`
            SELECT q.id, q.category,
                   COALESCE(t_req.text, t_es.text, '') AS text,
                   COALESCE(
                       jsonb_object_agg(sl.code, t.text) FILTER (WHERE sl.code IS NOT NULL AND t.text IS NOT NULL),
                       '{}'::jsonb
                   ) AS translations
            FROM capsule_questions q
            JOIN supported_languages fallback_lang ON fallback_lang.code = 'es'
            LEFT JOIN supported_languages req_lang ON req_lang.code = $1
            LEFT JOIN capsule_question_translations t_req ON t_req.question_id = q.id AND (t_req.language_id = req_lang.id OR t_req.language = req_lang.code)
            LEFT JOIN capsule_question_translations t_es ON t_es.question_id = q.id AND (t_es.language_id = fallback_lang.id OR t_es.language = fallback_lang.code)
            LEFT JOIN capsule_question_translations t ON t.question_id = q.id
            LEFT JOIN supported_languages sl ON (sl.id = t.language_id OR sl.code = t.language)
            GROUP BY q.id, q.category, t_req.text, t_es.text
            ORDER BY q.id ASC
        `, [lang.code]);

        let questions = questionsRes.rows;
        if (!questions.length) {
            questions = capsuleCatalog.questions.map(q => ({
                id: q.id,
                category: q.category,
                text: lang.code === 'en' ? q.textEn : q.textEs,
                translations: { es: q.textEs, en: q.textEn },
            }));
        }

        return {
            enabled: capsulesEnabled(),
            rulesVersion: 2,
            catalogVersion: capsuleCatalog.version,
            language: lang.code,
            languageId: lang.id,
            questions,
        };
    } catch {
        return {
            enabled: capsulesEnabled(),
            rulesVersion: 2,
            catalogVersion: capsuleCatalog.version,
            language: locale,
            languageId: null,
            questions: capsuleCatalog.questions.map(q => ({
                id: q.id,
                category: q.category,
                text: locale === 'en' ? q.textEn : q.textEs,
                translations: { es: q.textEs, en: q.textEn },
            })),
        };
    } finally {
        client.release();
    }
}

export async function capsuleTransaction(work) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function saveCapsule(client, state, type, category = null) {
    await client.query(
        'UPDATE capsule_sessions SET snapshot=$2, status=$3, progress=$4, revision=$5, updated_at=NOW() WHERE id=$1',
        [state.id, state, state.status, state.progress, state.revision],
    );
    await client.query(
        'UPDATE capsule_participants SET paused=$2, resume_accepted=(user_id=ANY($3::uuid[])) WHERE capsule_id=$1',
        [state.id, state.status !== 'active' && state.status !== 'revealed', state.resumeAccepted],
    );
    await client.query(
        'INSERT INTO capsule_events(capsule_id,revision,type,level,category) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        [state.id, state.revision, type, state.level, category],
    );
}

export async function getPairCapsule(userId, peerId, client = db, lock = false) {
    const pair = [userId, peerId].sort();
    const result = await client.query(
        'SELECT * FROM capsule_sessions WHERE user1_id=$1 AND user2_id=$2' + (lock ? ' FOR UPDATE' : ''),
        pair,
    );
    return result.rows[0] ?? null;
}

export async function createMatchCapsule(client, userIds, matchId) {
    const existing = await getPairCapsule(...userIds, client, true);
    if (existing) {
        const state = existing.snapshot;
        if (state.status === 'cancelled') {
            state.status = 'paused';
            state.resumeAccepted = [];
            state.revision++;
        }
        await client.query('UPDATE capsule_sessions SET match_id=$2 WHERE id=$1', [state.id, matchId]);
        await saveCapsule(client, state, 'relinked');
        return;
    }
    const state = newCapsule(randomUUID(), userIds);
    await client.query(
        'INSERT INTO capsule_sessions(id,user1_id,user2_id,match_id,status,snapshot) VALUES($1,$2,$3,$4,$5,$6)',
        [state.id, ...userIds, matchId, state.status, state],
    );
    for (const userId of userIds) {
        await client.query('INSERT INTO capsule_participants(capsule_id,user_id) VALUES($1,$2)', [state.id, userId]);
    }
    await saveCapsule(client, state, 'created');
}

export async function creditChatMessage(client, senderId, peerId, text, chatId) {
    const row = await getPairCapsule(senderId, peerId, client, true);
    if (!row || !row.match_id) return;
    const state = creditMessage(row.snapshot, senderId, text);
    await client.query('UPDATE capsule_sessions SET chat_id=$2 WHERE id=$1', [row.id, chatId]);
    if (state !== row.snapshot) {
        await saveCapsule(client, state, state.level > row.snapshot.level ? 'level' : 'exchange');
    }
}

export async function cancelMatchCapsule(client, userId, peerId) {
    const row = await getPairCapsule(userId, peerId, client, true);
    if (!row || row.status === 'revealed') return;
    const state = {
        ...row.snapshot,
        status: 'cancelled',
        pendingSender: null,
        resumeAccepted: [],
        revealRequestedBy: null,
        revision: row.revision + 1,
    };
    await saveCapsule(client, state, 'cancelled');
}
export async function executeCapsuleAction(userId, capsuleId, action) {
    return capsuleTransaction(async client=>{
        const row=(await client.query('SELECT * FROM capsule_sessions WHERE id=$1 FOR UPDATE',[capsuleId])).rows[0];
        if(!row) throw new AppError({status:404,code:'CAPSULE_NOT_FOUND'});
        if(!row.snapshot.userIds.includes(userId)) throw new AppError({status:403,code:'CAPSULE_FORBIDDEN'});
        await ensureContact(client,userId,row.snapshot.userIds.find(id=>id!==userId));
        const saved=(await client.query('SELECT response FROM capsule_actions WHERE capsule_id=$1 AND actor_id=$2 AND action_id=$3',[capsuleId,userId,action.actionId])).rows[0];
        if(saved) return saved.response;
        if(!row.match_id && !['request_reveal','accept_reveal','decline_reveal','cancel_reveal'].includes(action.type)) throw new AppError({status:409,code:'CAPSULE_CANCELLED'});
        let state=row.snapshot;
        let message=null;
        if(action.type==='question') {
            if(!capsulesEnabled()) throw new AppError({status:409,code:'CAPSULE_UNAVAILABLE'});
            const pool=capsuleCatalog.questions.filter(q=>q.category===action.category);
            const question=pool.find(q=>!state.seenQuestionIds.includes(q.id)) ?? pool[0];
            action={...action,question:{...question,questionId:question.id,instanceId:randomUUID(),answeredBy:[],completed:false}};
        }

        const userLang = await resolveLanguage(client, action.language || preferredLocale);
        let state = row.snapshot;

        if (action.type === 'question') {
            if (!capsulesEnabled()) throw new AppError({ status: 409, code: 'CAPSULE_UNAVAILABLE' });
            if (state.question !== null) {
                throw new AppError({ status: 400, code: 'TURN_BUSY', message: 'An active question is already pending an answer' });
            }
            let catalogQuestion = null;
            if (!action.isCustom) {
                const pool = capsuleCatalog.questions.filter(q => q.category === action.category);
                if (action.questionId) {
                    catalogQuestion = pool.find(q => q.id === action.questionId) ?? pool.find(q => !state.seenQuestionIds?.includes(q.id)) ?? pool[0];
                } else {
                    catalogQuestion = pool.find(q => !state.seenQuestionIds?.includes(q.id)) ?? pool[0];
                }
            }
            action = {
                ...action,
                catalogQuestion,
                instanceId: randomUUID(),
                questionLanguage: userLang.code,
                questionLanguageId: userLang.id,
                authorLanguage: userLang.code,
                authorLanguageId: userLang.id,
            };
        }

        if (action.type === 'answer') {
            action = {
                ...action,
                peerLanguage: userLang.code,
                peerLanguageId: userLang.id,
            };
        }

        try {
            state = applyCapsuleAction(state, userId, action);
        } catch (error) {
            if (error.code === 'CAPSULE_STATE_CHANGED') {
                error.details = { capsule: publicCapsule(row.snapshot, userId, userLang.code) };
            }
            throw error;
        }

        if (action.type === 'question') {
            await client.query(
                'INSERT INTO capsule_missions(id,capsule_id,question_id,is_custom,custom_text,language_id) VALUES($1,$2,$3,$4,$5,$6)',
                [
                    state.question.instanceId,
                    capsuleId,
                    state.question.isCustom ? null : state.question.questionId,
                    state.question.isCustom,
                    state.question.isCustom ? state.question.text : null,
                    userLang.id,
                ],
            );
            await client.query(
                'INSERT INTO capsule_answers(mission_id,user_id,answer_text,language_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
                [state.question.instanceId, userId, action.answer, userLang.id],
            );
        }

        if (action.type === 'answer') {
            const answerText = action.answer ?? action.text;
            await client.query(
                'INSERT INTO capsule_answers(mission_id,user_id,answer_text,language_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
                [action.missionId, userId, answerText, userLang.id],
            );
            await client.query('UPDATE capsule_missions SET completed=TRUE WHERE id=$1', [action.missionId]);
        }

        await saveCapsule(client, state, action.type, action.category ?? null);
        const response = JSON.parse(JSON.stringify({ capsule: publicCapsule(state, userId, userLang.code), message: null }));
        await client.query('INSERT INTO capsule_actions(capsule_id,actor_id,action_id,response) VALUES($1,$2,$3,$4)', [capsuleId, userId, action.actionId, response]);
        return response;
    });
}
