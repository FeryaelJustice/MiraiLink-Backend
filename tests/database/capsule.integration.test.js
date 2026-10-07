import fs from 'node:fs/promises';
import pg from 'pg';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

const suite = process.env.REQUIRE_CAPSULE_DATABASE_TESTS === 'true' ? describe : describe.skip;

suite('Crystal Capsule PostgreSQL transaction contract', () => {
    let db, service, matching, a, b, c, id;

    beforeAll(async () => {
        const baseline = await fs.readFile('src/database/db.sql', 'utf8');
        db = new pg.Pool({ connectionString: process.env.DB_URL });
        await db.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
        await db.query(baseline);
        const files = (await fs.readdir('src/database/migrations')).filter(f => f.endsWith('.sql')).sort();
        for (const file of files) await db.query(await fs.readFile('src/database/migrations/' + file, 'utf8'));
        service = await import('../../src/services/capsule-service.js');
        matching = await import('../../src/services/capsule-matching.js');
        a = randomUUID();
        b = randomUUID();
        c = randomUUID();
        for (const [index, user] of [a, b, c].entries()) {
            await db.query("INSERT INTO users(id,username,auth_provider) VALUES($1,$2,'email')", [user, 'capsule' + index]);
        }
        await db.query("INSERT INTO user_search_preferences(user_id,discovery_mode) VALUES($1,'capsule'),($2,'capsule')", [a, b]);
        for (const q of service.capsuleCatalog.questions) {
            await db.query('INSERT INTO capsule_questions(id,category) VALUES($1,$2) ON CONFLICT DO NOTHING', [q.id, q.category]);
        }
        process.env.CRYSTAL_CAPSULE_ENABLED = 'true';
    }, 30000);

    afterAll(async () => {
        await db?.end();
        const shared = await import('../../src/models/db.js');
        await shared.default.end();
    });

    it('preserves seeded users and classic defaults on repeated additive migration', async () => {
        await db.query(await fs.readFile('src/database/migrations/014_crystal_capsule.sql', 'utf8'));
        await db.query(await fs.readFile('src/database/migrations/015_crystal_capsule_v2.sql', 'utf8'));
        expect((await db.query('SELECT COUNT(*)::int n FROM users')).rows[0].n).toBe(3);
    });

    it('filters category discovery by mutual mode before pagination', async () => {
        const { getCategoryFeedUsers } = await import('../../src/services/explore.service.js');
        const category = randomUUID();
        await db.query("INSERT INTO explore_categories(id,code,section_group,icon_key,filter_type) VALUES($1,'capsule-mode-test','gaming','controller','all')", [category]);
        const capsuleFeed = await getCategoryFeedUsers(a, category, { limit: 20 });
        expect(capsuleFeed.map(user => user.id)).toContain(b);
        expect(capsuleFeed.map(user => user.id)).not.toContain(c);
        const classicFeed = await getCategoryFeedUsers(c, category, { limit: 20 });
        expect(classicFeed).toHaveLength(0);
    });

    it('serializes simultaneous reciprocal likes into one match and one session', async () => {
        await Promise.all([
            service.capsuleTransaction(client => matching.likeWithMode(client, a, b, 'capsule', service.createMatchCapsule)),
            service.capsuleTransaction(client => matching.likeWithMode(client, b, a, 'capsule', service.createMatchCapsule)),
        ]);
        expect((await db.query('SELECT COUNT(*)::int n FROM matches')).rows[0].n).toBe(1);
        const row = (await db.query('SELECT * FROM capsule_sessions')).rows[0];
        id = row.id;
        expect(row.progress).toBe(0);
        await db.query("INSERT INTO chats(type,created_by) VALUES('private',$1)", [a]);
        const chat = (await db.query('SELECT id FROM chats')).rows[0].id;
        await db.query('UPDATE capsule_sessions SET chat_id=$2 WHERE id=$1', [id, chat]);
    });

    it('rejects strangers and stale revisions and replays confirmed actions with bilateral progress', async () => {
        const initial = (await db.query('SELECT snapshot FROM capsule_sessions WHERE id=$1', [id])).rows[0].snapshot;
        await expect(service.executeCapsuleAction(c, id, { actionId: randomUUID(), expectedRevision: initial.revision, type: 'pause' })).rejects.toMatchObject({ status: 403 });
        await expect(service.executeCapsuleAction(a, id, { actionId: randomUUID(), expectedRevision: 999, type: 'pause' })).rejects.toMatchObject({ code: 'CAPSULE_STATE_CHANGED', details: { capsule: { id } } });

        const question = await service.executeCapsuleAction(a, id, {
            actionId: randomUUID(),
            expectedRevision: initial.revision,
            type: 'question',
            category: 'gaming',
            answer: 'Co-op adventures',
        });
        const action = {
            actionId: randomUUID(),
            expectedRevision: question.capsule.revision,
            type: 'answer',
            missionId: question.capsule.question.instanceId,
            answer: 'Shared stories',
        };
        const complete = await service.executeCapsuleAction(b, id, action);
        expect(await service.executeCapsuleAction(b, id, action)).toEqual(complete);
        expect(complete.capsule.progress).toBe(1);
        expect(complete.capsule.completedQuestions).toHaveLength(1);
        expect((await db.query('SELECT COUNT(*)::int n FROM capsule_answers')).rows[0].n).toBe(2);
    });

    it('pauses credit, preserves undo progress, resumes jointly and reveals irreversibly', async () => {
        let state = (await db.query('SELECT snapshot FROM capsule_sessions WHERE id=$1', [id])).rows[0].snapshot;
        await service.executeCapsuleAction(a, id, { actionId: randomUUID(), expectedRevision: state.revision, type: 'pause' });
        let result;
        const chatId = (await db.query('SELECT chat_id FROM capsule_sessions WHERE id=$1', [id])).rows[0].chat_id;
        await service.capsuleTransaction(client => service.creditChatMessage(client, a, b, 'while paused', chatId));
        await service.capsuleTransaction(client => service.cancelMatchCapsule(client, a, b));
        state = (await db.query('SELECT snapshot FROM capsule_sessions WHERE id=$1', [id])).rows[0].snapshot;
        expect(state.status).toBe('cancelled');
        expect(state.progress).toBe(1);
        const match = (await db.query('SELECT id FROM matches')).rows[0].id;
        await service.capsuleTransaction(client => service.createMatchCapsule(client, [a, b].sort(), match));
        state = (await db.query('SELECT snapshot FROM capsule_sessions WHERE id=$1', [id])).rows[0].snapshot;
        result = await service.executeCapsuleAction(a, id, { actionId: randomUUID(), expectedRevision: state.revision, type: 'resume' });
        expect(result.capsule.status).toBe('paused');
        result = await service.executeCapsuleAction(b, id, { actionId: randomUUID(), expectedRevision: result.capsule.revision, type: 'resume' });
        expect(result.capsule.status).toBe('active');
        result = await service.executeCapsuleAction(a, id, { actionId: randomUUID(), expectedRevision: result.capsule.revision, type: 'request_reveal' });
        result = await service.executeCapsuleAction(b, id, { actionId: randomUUID(), expectedRevision: result.capsule.revision, type: 'accept_reveal' });
        expect(result.capsule.status).toBe('revealed');
        await expect(service.executeCapsuleAction(a, id, { actionId: randomUUID(), expectedRevision: result.capsule.revision, type: 'pause' })).rejects.toMatchObject({ code: 'CAPSULE_REVEALED' });
    });

    it('runs two authenticated accounts through the HTTP discovery, chat and mission contracts', async () => {
        const { createApp } = await import('../../src/app.js');
        const uploadRoot = await fs.mkdtemp(join(tmpdir(), 'crystal-http-'));
        try {
            const app = createApp({ uploadRoot, enableRateLimits: false });
            const d = randomUUID(), e = randomUUID();
            for (const [index, user] of [d, e].entries()) {
                await db.query("INSERT INTO users(id,username,auth_provider,is_verified) VALUES($1,$2,'email',TRUE)", [user, 'capsulehttp' + index]);
                await db.query("INSERT INTO user_search_preferences(user_id,discovery_mode) VALUES($1,'capsule')", [user]);
            }
            const token = user => jwt.sign({ id: user, purpose: 'access' }, process.env.JWT_SECRET, { expiresIn: '10m' });
            const headers = user => ({ 'Authorization': 'Bearer ' + token(user), 'X-MiraiLink-Capabilities': 'crystal-capsule-v1' });
            const get = (user, url) => request(app).get('/api' + url).set(headers(user));
            const post = (user, url, body) => request(app).post('/api' + url).set(headers(user)).send(body);

            expect((await get(d, '/capsules/config')).body.enabled).toBe(true);
            expect((await post(d, '/swipe/like', { toUserId: e, discoveryMode: 'capsule' })).status).toBe(200);
            expect((await post(e, '/swipe/like', { toUserId: d, discoveryMode: 'capsule' })).status).toBe(200);
            expect((await post(d, '/chats/private', { otherUserId: e })).status).toBe(201);
            let history = await get(d, '/chats/history/' + e + '?include_capsule=true');
            expect(history.status).toBe(200);
            expect(history.body.capsule.progress).toBe(0);
            const capsuleId = history.body.capsule.id;

            await db.query("INSERT INTO user_photos(user_id,url,position) VALUES($1,'/test-placeholder.jpg',1)", [e]);
            const photos = await get(d, '/user/photos?userId=' + e);
            expect(photos.body[0].photoPresentation.veiled).toBe(true);
            const legacyPhotos = await request(app).get('/api/user/photos?userId=' + e).set('Authorization', 'Bearer ' + token(d));
            expect(legacyPhotos.body).toEqual([]);

            // Chat bloqueado mientras la cápsula no está revelada
            const clientMessageId = randomUUID();
            const locked = await post(d, '/chats/send', { toUserId: e, text: 'Our first co-op adventure', clientMessageId });
            expect(locked.status).toBe(403);
            expect(locked.body.code).toBe('CAPSULE_CHAT_LOCKED');

            const question = await post(d, '/capsules/' + capsuleId + '/actions', {
                actionId: randomUUID(),
                expectedRevision: history.body.capsule.revision,
                type: 'question',
                category: 'anime',
                answer: 'Frieren',
            });
            expect(question.status).toBe(200);

            const second = await post(e, '/capsules/' + capsuleId + '/actions', {
                actionId: randomUUID(),
                expectedRevision: question.body.capsule.revision,
                type: 'answer',
                missionId: question.body.capsule.question.instanceId,
                answer: 'Steins Gate',
            });
            expect(second.status).toBe(200);
            expect(second.body.capsule.progress).toBe(1);
            expect(second.body.capsule.completedQuestions).toHaveLength(1);

            history = await get(d, '/chats/history/' + e + '?include_capsule=true');
            expect(history.body.messages).toHaveLength(0);
            expect(history.body.capsule.progress).toBe(1);
        } finally {
            await fs.rm(uploadRoot, { recursive: true, force: true });
        }
    });
});
