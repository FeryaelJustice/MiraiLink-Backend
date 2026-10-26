import db from '../models/db.js';
import { removePhotoFile } from '../utils/photoStorage.js';

/** Enqueue inside the same transaction that removes references. */
export async function queuePhotoRemoval(client, urls) {
    for (const url of new Set(urls)) {
        await client.query(`INSERT INTO photo_cleanup_jobs(url) VALUES ($1)
            ON CONFLICT(url) DO UPDATE SET next_attempt_at=NOW()`, [url]);
    }
}

export async function drainPhotoCleanup(limit = 20) {
    const client = await db.connect();
    let removed = 0;
    try {
        await client.query('BEGIN');
        const jobs = await client.query(`SELECT url FROM photo_cleanup_jobs WHERE next_attempt_at<=NOW()
            ORDER BY next_attempt_at LIMIT $1 FOR UPDATE SKIP LOCKED`, [limit]);
        for (const { url } of jobs.rows) {
            const used = await client.query('SELECT 1 FROM user_photos WHERE url=$1 LIMIT 1', [url]);
            if (used.rows.length) {
                await client.query('DELETE FROM photo_cleanup_jobs WHERE url=$1', [url]);
                continue;
            }
            try {
                await removePhotoFile(url, undefined, client);
                await client.query('DELETE FROM photo_cleanup_jobs WHERE url=$1', [url]);
                removed += 1;
            } catch {
                await client.query(`UPDATE photo_cleanup_jobs SET attempts=attempts+1,error_code='PHOTO_CLEANUP_FAILED',
                    next_attempt_at=NOW()+INTERVAL '1 hour' WHERE url=$1`, [url]);
            }
        }
        await client.query('COMMIT');
        return removed;
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally { client.release(); }
}

/** Cleanup must never turn a successful SQL commit into an upload rollback. */
export async function tryPhotoCleanup() {
    try { await drainPhotoCleanup(); }
    catch { console.warn('[PhotoStorage] PHOTO_CLEANUP_PENDING'); }
}
