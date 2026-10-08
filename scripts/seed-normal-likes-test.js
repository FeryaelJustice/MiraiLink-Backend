import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

if (!process.env.DB_URL) {
    const envPath = path.join(rootDir, '.env');
    if (fs.existsSync(envPath)) {
        process.loadEnvFile(envPath);
    }
}

if (!process.env.DB_URL) {
    console.error('❌ Error: DB_URL no esta definida.');
    process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DB_URL });

async function seedNormalLikesTest() {
    const client = await pool.connect();
    try {
        console.log('❤️ Generando likes de modo normal (sección Personas que te han dado like)...');
        await client.query('BEGIN');

        const usersRes = await client.query(`
            SELECT id, username, gender FROM users 
            WHERE is_deleted = FALSE AND is_verified = TRUE 
            ORDER BY created_at ASC
        `);

        if (usersRes.rows.length < 2) {
            console.log('⚠️ Se necesitan al menos 2 usuarios en la base de datos.');
            await client.query('ROLLBACK');
            return;
        }

        let totalNormalLikes = 0;

        for (const user of usersRes.rows) {
            // Buscar otros usuarios con los que no haya interacciones previas ni afinidades activas
            const candidates = await client.query(`
                SELECT u.id FROM users u
                WHERE u.id <> $1 AND u.is_deleted = FALSE AND u.is_verified = TRUE
                  AND NOT EXISTS (SELECT 1 FROM likes WHERE from_user_id=$1 AND to_user_id=u.id)
                  AND NOT EXISTS (SELECT 1 FROM likes WHERE from_user_id=u.id AND to_user_id=$1)
                  AND NOT EXISTS (SELECT 1 FROM dislikes WHERE (from_user_id=$1 AND to_user_id=u.id) OR (from_user_id=u.id AND to_user_id=$1))
                  AND NOT EXISTS (SELECT 1 FROM user_blocks WHERE (user_id=$1 AND target_id=u.id) OR (user_id=u.id AND target_id=$1))
                  AND NOT EXISTS (SELECT 1 FROM reports WHERE (reported_by=$1 AND reported_user=u.id) OR (reported_by=u.id AND reported_user=$1))
                  AND NOT EXISTS (SELECT 1 FROM matches WHERE user1_id=LEAST($1::uuid,u.id) AND user2_id=GREATEST($1::uuid,u.id))
                  AND NOT EXISTS (SELECT 1 FROM affinity_requests WHERE ((from_user_id=$1 AND to_user_id=u.id) OR (from_user_id=u.id AND to_user_id=$1)) AND state IN ('pending','accepted'))
                  AND NOT EXISTS (SELECT 1 FROM affinity_recommendations WHERE user_id=$1 AND target_id=u.id AND state='available')
                LIMIT 2
            `, [user.id]);

            for (const cand of candidates.rows) {
                const insRes = await client.query(`
                    INSERT INTO likes(from_user_id, to_user_id, origin, discovery_mode, created_at)
                    VALUES($1, $2, 'discovery', 'classic', NOW())
                    ON CONFLICT DO NOTHING RETURNING id
                `, [cand.id, user.id]);
                if (insRes.rowCount > 0) totalNormalLikes++;
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Likes de modo normal generados: ${totalNormalLikes}`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error generando likes normales:', error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

seedNormalLikesTest();
