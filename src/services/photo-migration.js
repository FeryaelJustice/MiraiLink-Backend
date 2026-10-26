import fs from 'node:fs/promises';
import { resolve, dirname, sep, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { localPhotoPath, photoDigest, stagePhoto, recordPhoto } from '../utils/photoStorage.js';
import { detectImageType } from '../utils/imageValidation.js';

const forbidden = resolve(fileURLToPath(new URL('../assets', import.meta.url)));
const maxBytes = () => Number(process.env.UPLOAD_MAX_BYTES || 5 * 1024 * 1024);

function within(path, root) {
    return path === root || path.startsWith(root + sep);
}

/** Never resolve or enumerate the protected asset tree. Existing ancestors must be real. */
export async function externalRoot(path) {
    if (!path || !isAbsolute(path)) throw new Error('An absolute external root is required');
    const absolute = resolve(path);
    if (within(absolute, forbidden) || within(forbidden, absolute)) throw new Error('Protected asset tree is excluded');
    const real = await fs.realpath(absolute);
    if (within(real, forbidden) || within(forbidden, real)) throw new Error('Protected asset tree is excluded');
    return real;
}

export async function confinedPath(root, target, { create = false } = {}) {
    const normalized = resolve(target);
    if (!within(normalized, root) || normalized === root) throw new Error('Path escapes root');
    const parts = normalized.slice(root.length + 1).split(sep);
    let current = root;
    for (const [index, part] of parts.entries()) {
        current = resolve(current, part);
        const last = index === parts.length - 1;
        try {
            const info = await fs.lstat(current);
            if (info.isSymbolicLink() || (!last && !info.isDirectory())) throw new Error('Symlinks and non-directories are not allowed');
        } catch (error) {
            if (error.code !== 'ENOENT' || !create) throw error;
            if (!last) await fs.mkdir(current);
        }
    }
    return normalized;
}

async function readImage(path) {
    const stat = await fs.stat(path);
    if (stat.size > maxBytes() || !stat.isFile()) throw new Error('Photo exceeds limit or is not a file');
    const buffer = await fs.readFile(path);
    if (!detectImageType(buffer)) throw new Error('Invalid image signature');
    return buffer;
}

/** Only the configured Cloudinary image origin; redirects and arbitrary URLs are forbidden. */
export async function downloadPhoto(photo, fetcher = fetch) {
    const url = new URL(photo.url);
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.port || url.username || url.password
        || url.search || url.hash || !process.env.CLOUDINARY_CLOUD_NAME
        || photo.cloud_name !== process.env.CLOUDINARY_CLOUD_NAME
        || !url.pathname.startsWith(`/${photo.cloud_name}/image/upload/`)
        || photo.resource_type !== 'image' || photo.delivery_type !== 'upload') throw new Error('Untrusted photo URL');
    const response = await fetcher(url.href, { redirect: 'error', signal: AbortSignal.timeout(20_000) });
    if (!response.ok || !response.body || Number(response.headers.get('content-length') || 0) > maxBytes()) throw new Error('Photo download failed or exceeds limit');
    const parts = [];
    let bytes = 0;
    for await (const part of response.body) {
        bytes += part.length;
        if (bytes > maxBytes()) throw new Error('Photo download exceeds limit');
        parts.push(part);
    }
    const buffer = Buffer.concat(parts);
    if (!detectImageType(buffer)) throw new Error('Invalid downloaded image');
    return buffer;
}

async function snapshot(pool) {
    return (await pool.query(`SELECT p.id,p.user_id,p.url,p.position,o.provider,o.cloud_name,o.public_id,
        o.asset_id,o.resource_type,o.delivery_type,o.sha256,o.bytes
        FROM user_photos p LEFT JOIN photo_storage_objects o ON o.url=p.url ORDER BY p.id`)).rows;
}

function validateManifest(manifest) {
    if (manifest.version !== 1 || !['cloudinary', 'local'].includes(manifest.target) || !Array.isArray(manifest.entries)) throw new Error('Invalid migration manifest');
    const ids = new Set();
    for (const item of manifest.entries) {
        if (!item || typeof item.oldUrl !== 'string' || !Array.isArray(item.rows) || !item.rows.length) throw new Error('Invalid manifest entry');
        for (const row of item.rows) {
            if (!/^[0-9a-f-]{36}$/i.test(row.id) || !/^[0-9a-f-]{36}$/i.test(row.user_id) || ids.has(row.id)) throw new Error('Invalid or duplicate photo ID');
            ids.add(row.id);
        }
        if (item.photo && (!/^[a-f0-9]{64}$/.test(item.sha256) || !Number.isInteger(item.bytes) || item.bytes <= 0 || item.bytes > maxBytes())) throw new Error('Invalid manifest integrity');
    }
}

export async function saveManifest(path, manifest) {
    const absolute = resolve(path);
    if (within(absolute, forbidden)) throw new Error('Protected asset tree is excluded');
    const parent = await externalRoot(dirname(absolute));
    await confinedPath(parent, absolute, { create: true });
    const temporary = `${absolute}.${randomUUID()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    await fs.rename(temporary, absolute);
}

export async function loadManifest(path) {
    const absolute = resolve(path);
    if (within(absolute, forbidden)) throw new Error('Protected asset tree is excluded');
    const parent = await externalRoot(dirname(absolute));
    await confinedPath(parent, absolute);
    if ((await fs.stat(absolute)).size > 20 * 1024 * 1024) throw new Error('Manifest too large');
    const manifest = JSON.parse(await fs.readFile(absolute, 'utf8'));
    validateManifest(manifest);
    return manifest;
}

/** Dry-run only reads references; prepare explicitly writes files or uploads and saves progress. */
export async function preparePhotoMigration(pool, { target, root, manifestPath, dryRun = true }) {
    if (!['cloudinary', 'local'].includes(target)) throw new Error('Expected target cloudinary or local');
    const directory = await externalRoot(root);
    let manifest;
    try { manifest = await loadManifest(manifestPath); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (manifest && (manifest.target !== target || manifest.root !== directory)) throw new Error('Manifest target/root mismatch');
    const rows = await snapshot(pool);
    if (!manifest) {
        const groups = new Map();
        for (const row of rows) {
            if ((target === 'cloudinary' && row.provider === 'cloudinary') || (target === 'local' && !/^https?:/i.test(row.url))) continue;
            if (!groups.has(row.url)) groups.set(row.url, { oldUrl: row.url, source: row, rows: [] });
            groups.get(row.url).rows.push({ id: row.id, user_id: row.user_id, position: row.position });
        }
        manifest = { version: 1, target, root: directory, createdAt: new Date().toISOString(), entries: [...groups.values()] };
    }
    let errors = 0;
    for (const entry of manifest.entries) {
        try {
            if (entry.photo) {
                const buffer = target === 'local'
                    ? await readImage(await confinedPath(directory, localPhotoPath(entry.photo.url, directory)))
                    : await downloadPhoto(entry.photo);
                if (photoDigest(buffer) !== entry.sha256) throw new Error('Prepared photo integrity mismatch');
                delete entry.error;
                continue;
            }
            let buffer;
            if (target === 'cloudinary') {
                buffer = await readImage(await confinedPath(directory, localPhotoPath(entry.oldUrl, directory)));
            } else {
                if (entry.source.provider !== 'cloudinary') throw new Error('Unregistered remote photo');
                buffer = await downloadPhoto(entry.source);
                if (entry.source.sha256 && entry.source.sha256 !== photoDigest(buffer)) throw new Error('Source integrity mismatch');
            }
            if (!dryRun) {
                const detectedType = detectImageType(buffer);
                if (target === 'cloudinary') {
                    if ((process.env.PHOTO_STORAGE_PROVIDER || 'cloudinary') !== 'cloudinary') throw new Error('Select cloudinary provider to import');
                    entry.photo = await stagePhoto('legacy', { buffer, detectedType }, undefined, pool);
                    if (photoDigest(await downloadPhoto(entry.photo)) !== photoDigest(buffer)) throw new Error('Uploaded original integrity mismatch');
                    await pool.query(`UPDATE photo_cleanup_jobs SET next_attempt_at=NOW()+INTERVAL '7 days' WHERE url=$1`, [entry.photo.plannedUrl]);
                } else {
                    const filename = `${randomUUID()}${detectedType.extension}`;
                    const url = `assets/img/profiles/migrated/${filename}`;
                    const path = await confinedPath(directory, localPhotoPath(url, directory), { create: true });
                    await fs.writeFile(path, buffer, { flag: 'wx', mode: 0o600 });
                    if (photoDigest(await readImage(path)) !== photoDigest(buffer)) throw new Error('Written photo integrity mismatch');
                    entry.photo = { url, provider: 'local' };
                }
                entry.sha256 = photoDigest(buffer);
                entry.bytes = buffer.length;
            }
            delete entry.error;
        } catch {
            if (!entry.sha256) delete entry.photo;
            entry.error = 'PHOTO_MIGRATION_SOURCE_OR_TRANSFER_FAILED';
            errors += 1;
        }
        if (!dryRun) await saveManifest(manifestPath, manifest);
    }
    if (!dryRun) await saveManifest(manifestPath, manifest);
    return { manifest, errors, photos: manifest.entries.length, rows: manifest.entries.reduce((sum, item) => sum + item.rows.length, 0) };
}

/** Caller stops writes for the cutover. No source files or cloud objects are deleted. */
export async function applyPhotoMigration(pool, manifest, { rollback = false, root = manifest.root } = {}) {
    validateManifest(manifest);
    const directory = await externalRoot(root);
    for (const entry of manifest.entries) {
        if (entry.error || !entry.photo) throw new Error('Manifest is incomplete; resolve missing photos before applying');
        const buffer = manifest.target === 'local'
            ? await readImage(await confinedPath(directory, localPhotoPath(entry.photo.url, directory)))
            : await downloadPhoto(entry.photo);
        if (photoDigest(buffer) !== entry.sha256 || buffer.length !== entry.bytes) throw new Error('Target integrity mismatch');
        if (rollback) {
            // The old provider must still be usable before restoring its references.
            if (/^https?:/i.test(entry.oldUrl)) await downloadPhoto(entry.source);
            else await readImage(await confinedPath(directory, localPhotoPath(entry.oldUrl, directory)));
        }
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Prevent concurrent profile writes during the full reference switch.
        await client.query('LOCK TABLE user_photos IN SHARE ROW EXCLUSIVE MODE');
        const listed = new Set(manifest.entries.flatMap(entry => entry.rows.map(row => row.id)));
        const live = await snapshot(client);
        if (!rollback && live.some(row => !listed.has(row.id) && (manifest.target === 'local'
            ? /^https?:/i.test(row.url) : row.provider !== 'cloudinary'))) {
            throw new Error('New photo references appeared; prepare a new migration');
        }
        for (const entry of manifest.entries) {
            const expected = rollback ? entry.photo.url : entry.oldUrl;
            const targetUrl = rollback ? entry.oldUrl : entry.photo.url;
            if (!rollback) await recordPhoto({ ...entry.photo, sha256: entry.sha256, bytes: entry.bytes }, client);
            for (const row of entry.rows) {
                const current = (await client.query('SELECT url,user_id FROM user_photos WHERE id=$1 FOR UPDATE', [row.id])).rows[0];
                if (!current || current.user_id !== row.user_id || ![expected, targetUrl].includes(current.url)) throw new Error('Photo references changed; refusing partial migration');
                if (current.url === expected) await client.query('UPDATE user_photos SET url=$1 WHERE id=$2 AND url=$3', [targetUrl, row.id, expected]);
            }
            // Keep both providers for a safe rollback; no destructive cleanup at cutover.
            await client.query('DELETE FROM photo_cleanup_jobs WHERE url=ANY($1::text[])', [[entry.oldUrl, entry.photo.url, entry.photo.plannedUrl].filter(Boolean)]);
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally { client.release(); }
}
