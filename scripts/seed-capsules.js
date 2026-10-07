import fs from 'node:fs';
import pg from 'pg';
import { capsuleCatalog } from '../src/services/capsule-service.js';

if (!process.env.DB_URL && fs.existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.DB_URL) throw new Error('DB_URL required');

const pool = new pg.Pool({ connectionString: process.env.DB_URL });
const client = await pool.connect();

try {
    await client.query('BEGIN');
    const langMap = {};
    for (const code of ['es', 'en']) {
        const row = (await client.query('SELECT id FROM supported_languages WHERE code = $1', [code])).rows[0];
        if (row) langMap[code] = row.id;
    }

    for (const q of capsuleCatalog.questions) {
        await client.query(
            'INSERT INTO capsule_questions(id,category,catalog_version) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET category=EXCLUDED.category,catalog_version=EXCLUDED.catalog_version',
            [q.id, q.category, capsuleCatalog.version],
        );
        for (const [language, text] of [['es', q.textEs], ['en', q.textEn]]) {
            const langId = langMap[language] ?? null;
            await client.query(
                'INSERT INTO capsule_question_translations(question_id,language,language_id,text) VALUES($1,$2,$3,$4) ON CONFLICT(question_id,language) DO UPDATE SET text=EXCLUDED.text, language_id=COALESCE(EXCLUDED.language_id, capsule_question_translations.language_id)',
                [q.id, language, langId, text],
            );
        }
    }
    await client.query('COMMIT');
    console.log('Capsule catalog seeded: ' + capsuleCatalog.questions.length + ' questions with supported_languages references.');
} catch (error) {
    await client.query('ROLLBACK');
    throw error;
} finally {
    client.release();
    await pool.end();
}
