import { describe, it, expect } from 'vitest';
import { newCapsule, creditMessage, applyCapsuleAction, publicCapsule } from '../../../src/services/capsule-engine.js';

const start = () => newCapsule('capsule', ['a', 'b']);

describe('Crystal capsule v2 state machine rules', () => {
    it('regular chat messages do not grant progress or advance capsule level', () => {
        let s = start();
        for (let i = 0; i < 10; i++) {
            s = creditMessage(s, 'a', 'hello ' + i);
            s = creditMessage(s, 'b', 'reply ' + i);
        }
        expect(s.progress).toBe(0);
        expect(s.level).toBe(0);
        expect(s.status).toBe('active');
    });

    it('requires author answer when proposing a question and rejects missing/overlength answer', () => {
        const s = start();
        const catalogQuestion = { id: 'q01', category: 'anime', textEs: '¿Anime favorito?', textEn: 'Favorite anime?' };

        expect(() => applyCapsuleAction(s, 'a', {
            type: 'question',
            category: 'anime',
            catalogQuestion,
            answer: '',
            expectedRevision: 0,
        })).toThrow();

        expect(() => applyCapsuleAction(s, 'a', {
            type: 'question',
            category: 'anime',
            catalogQuestion,
            answer: 'x'.repeat(301),
            expectedRevision: 0,
        })).toThrow();
    });

    it('allows custom questions with length up to 120 chars and rejects invalid custom questions', () => {
        const s = start();

        expect(() => applyCapsuleAction(s, 'a', {
            type: 'question',
            category: 'anime',
            isCustom: true,
            customQuestion: '',
            answer: 'Mi respuesta',
            expectedRevision: 0,
        })).toThrow();

        expect(() => applyCapsuleAction(s, 'a', {
            type: 'question',
            category: 'anime',
            isCustom: true,
            customQuestion: 'c'.repeat(121),
            answer: 'Mi respuesta',
            expectedRevision: 0,
        })).toThrow();

        const customState = applyCapsuleAction(s, 'a', {
            type: 'question',
            category: 'anime',
            isCustom: true,
            customQuestion: '¿Cuál es tu anime de la infancia?',
            answer: 'Dragon Ball Z',
            expectedRevision: 0,
        });

        expect(customState.question.isCustom).toBe(true);
        expect(customState.question.text).toBe('¿Cuál es tu anime de la infancia?');
        expect(customState.question.authorAnswer).toBe('Dragon Ball Z');
    });

    it('enforces a single active question turn and returns TURN_BUSY (400) if another question is attempted', () => {
        let s = start();
        const catalogQuestion = { id: 'q01', category: 'anime', textEs: '¿Anime favorito?', textEn: 'Favorite anime?' };

        s = applyCapsuleAction(s, 'a', {
            type: 'question',
            category: 'anime',
            catalogQuestion,
            answer: 'Steins;Gate',
            expectedRevision: 0,
        });

        expect(s.question).not.toBeNull();

        // Intento de proponer pregunta mientras hay una activa pendiente
        try {
            applyCapsuleAction(s, 'b', {
                type: 'question',
                category: 'anime',
                catalogQuestion: { id: 'q02', category: 'anime', textEs: '¿Otro anime?', textEn: 'Another anime?' },
                answer: 'Frieren',
                expectedRevision: s.revision,
            });
            expect.fail('Should have thrown TURN_BUSY');
        } catch (error) {
            expect(error.status).toBe(400);
            expect(error.code).toBe('TURN_BUSY');
        }
    });

    it('prevents author from answering their own active question', () => {
        let s = start();
        const catalogQuestion = { id: 'q01', category: 'anime', textEs: '¿Anime favorito?', textEn: 'Favorite anime?' };

        s = applyCapsuleAction(s, 'a', {
            type: 'question',
            category: 'anime',
            catalogQuestion,
            answer: 'Steins;Gate',
            expectedRevision: 0,
        });

        expect(() => applyCapsuleAction(s, 'a', {
            type: 'answer',
            missionId: s.question.instanceId,
            answer: 'Otra respuesta',
            expectedRevision: s.revision,
        })).toThrow();
    });

    it('awards exactly 1 point on bilateral completion, archives into completedQuestions and frees question slot', () => {
        let s = start();
        const catalogQuestion = { id: 'q01', category: 'anime', textEs: '¿Anime favorito?', textEn: 'Favorite anime?' };

        s = applyCapsuleAction(s, 'a', {
            type: 'question',
            category: 'anime',
            catalogQuestion,
            answer: 'Steins;Gate',
            expectedRevision: 0,
        });

        const missionId = s.question.instanceId;

        // Peer answers
        s = applyCapsuleAction(s, 'b', {
            type: 'answer',
            missionId,
            answer: 'Frieren: Beyond Journey\'s End',
            expectedRevision: s.revision,
        });

        expect(s.progress).toBe(1);
        expect(s.level).toBe(1);
        expect(s.question).toBeNull();
        expect(s.completedQuestions).toHaveLength(1);

        const archived = s.completedQuestions[0];
        expect(archived.questionId).toBe('q01');
        expect(archived.authorId).toBe('a');
        expect(archived.authorAnswer).toBe('Steins;Gate');
        expect(archived.peerAnswer).toBe('Frieren: Beyond Journey\'s End');
        expect(archived.completedAt).toBeDefined();
    });

    it('automatically transitions to revealed status upon reaching 4 shared points', () => {
        let s = start();
        for (let i = 1; i <= 4; i++) {
            const q = { id: 'q0' + i, category: 'gaming', textEs: 'Pregunta ' + i, textEn: 'Question ' + i };
            s = applyCapsuleAction(s, 'a', {
                type: 'question',
                category: 'gaming',
                catalogQuestion: q,
                answer: 'Respuesta A ' + i,
                expectedRevision: s.revision,
            });
            s = applyCapsuleAction(s, 'b', {
                type: 'answer',
                missionId: s.question.instanceId,
                answer: 'Respuesta B ' + i,
                expectedRevision: s.revision,
            });
            expect(s.progress).toBe(i);
            expect(s.level).toBe(i);
        }

        expect(s.progress).toBe(4);
        expect(s.level).toBe(4);
        expect(s.status).toBe('revealed');
        expect(s.completedQuestions).toHaveLength(4);

        // Acciones posteriores deben ser rechazadas con CAPSULE_REVEALED
        expect(() => applyCapsuleAction(s, 'a', {
            type: 'pause',
            expectedRevision: s.revision,
        })).toThrow();
    });

    it('masks active authorAnswer from peer in publicCapsule, but exposes both once completed', () => {
        let s = start();
        const catalogQuestion = { id: 'q01', category: 'anime', textEs: '¿Anime favorito?', textEn: 'Favorite anime?' };

        s = applyCapsuleAction(s, 'a', {
            type: 'question',
            category: 'anime',
            catalogQuestion,
            answer: 'Secreto de autor',
            expectedRevision: 0,
        });

        // Peer consulta el snapshot: no debe ver la respuesta del autor aún
        const forPeer = publicCapsule(s, 'b');
        expect(forPeer.question.authorAnswer).toBeNull();

        // El autor sí ve su propia respuesta
        const forAuthor = publicCapsule(s, 'a');
        expect(forAuthor.question.authorAnswer).toBe('Secreto de autor');

        // Al contestar el peer:
        s = applyCapsuleAction(s, 'b', {
            type: 'answer',
            missionId: s.question.instanceId,
            answer: 'Respuesta peer',
            expectedRevision: s.revision,
        });

        const completedForPeer = publicCapsule(s, 'b');
        expect(completedForPeer.question).toBeNull();
        expect(completedForPeer.completedQuestions[0].authorAnswer).toBe('Secreto de autor');
        expect(completedForPeer.completedQuestions[0].peerAnswer).toBe('Respuesta peer');
    });

    it('rejects strangers, stale revisions, and supports pause and resume lifecycle', () => {
        let s = start();
        expect(() => applyCapsuleAction(s, 'stranger', { type: 'pause', expectedRevision: 0 })).toThrow();
        expect(() => applyCapsuleAction(s, 'a', { type: 'pause', expectedRevision: 999 })).toThrow();

        s = applyCapsuleAction(s, 'a', { type: 'pause', expectedRevision: 0 });
        expect(s.status).toBe('paused');

        s = applyCapsuleAction(s, 'a', { type: 'resume', expectedRevision: s.revision });
        expect(s.status).toBe('paused');

        s = applyCapsuleAction(s, 'b', { type: 'resume', expectedRevision: s.revision });
        expect(s.status).toBe('active');
    });

    it('records language codes, language IDs, and resolves localizedText in publicCapsule for any language', () => {
        let s = start();
        const catalogQuestion = {
            id: 'q01',
            category: 'anime',
            text: { es: '¿Anime favorito?', en: 'Favorite anime?', ja: '好きなアニメは？' },
        };

        const langIdA = '11111111-1111-4111-8111-111111111111';
        const langIdB = '22222222-2222-4222-8222-222222222222';

        s = applyCapsuleAction(s, 'a', {
            type: 'question',
            category: 'anime',
            catalogQuestion,
            answer: 'Dragon Ball',
            questionLanguage: 'es',
            questionLanguageId: langIdA,
            authorLanguage: 'es',
            authorLanguageId: langIdA,
            expectedRevision: 0,
        });

        expect(s.question.questionLanguage).toBe('es');
        expect(s.question.questionLanguageId).toBe(langIdA);
        expect(s.question.authorLanguage).toBe('es');
        expect(s.question.authorLanguageId).toBe(langIdA);

        // Cliente solicitando en japonés
        const snapshotJa = publicCapsule(s, 'b', 'ja');
        expect(snapshotJa.question.localizedText).toBe('好きなアニメは？');

        // Cliente solicitando en inglés
        const snapshotEn = publicCapsule(s, 'b', 'en');
        expect(snapshotEn.question.localizedText).toBe('Favorite anime?');

        // Peer responde en inglés
        s = applyCapsuleAction(s, 'b', {
            type: 'answer',
            missionId: s.question.instanceId,
            answer: 'Attack on Titan',
            peerLanguage: 'en',
            peerLanguageId: langIdB,
            expectedRevision: s.revision,
        });

        expect(s.completedQuestions).toHaveLength(1);
        const completed = s.completedQuestions[0];
        expect(completed.questionId).toBe('q01');
        expect(completed.questionLanguage).toBe('es');
        expect(completed.questionLanguageId).toBe(langIdA);
        expect(completed.authorLanguage).toBe('es');
        expect(completed.authorLanguageId).toBe(langIdA);
        expect(completed.peerAnswer).toBe('Attack on Titan');
        expect(completed.peerLanguage).toBe('en');
        expect(completed.peerLanguageId).toBe(langIdB);

        // Verificación de localizedText en completedQuestions
        const completedSnapshotJa = publicCapsule(s, 'a', 'ja');
        expect(completedSnapshotJa.completedQuestions[0].localizedText).toBe('好きなアニメは？');
    });
});
