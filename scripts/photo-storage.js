import fs from 'node:fs';
import { parseArgs } from 'node:util';

if (fs.existsSync('.env')) process.loadEnvFile('.env');
const { positionals, values } = parseArgs({ allowPositionals: true, options: {
    target: { type: 'string' }, root: { type: 'string' }, manifest: { type: 'string' },
    'writes-stopped': { type: 'boolean' }, help: { type: 'boolean' },
} });
if (values.help || !positionals.length) {
    console.log('photo-storage plan|prepare --target cloudinary|local --root ABSOLUTE_DIRECTORY --manifest ABSOLUTE_JSON');
    console.log('photo-storage apply|rollback --manifest ABSOLUTE_JSON [--root ABSOLUTE_DIRECTORY] --writes-stopped');
    console.log('photo-storage cleanup');
    process.exit(0);
}
if (!process.env.DB_URL) throw new Error('DB_URL required');
// Dynamic import after .env loading, including workers and migration commands.
const { default: pool } = await import('../src/models/db.js');
const { preparePhotoMigration, applyPhotoMigration, loadManifest } = await import('../src/services/photo-migration.js');
try {
    const mode = positionals[0];
    if (mode === 'cleanup') {
        const { drainPhotoCleanup } = await import('../src/services/photo-cleanup.js');
        console.log(JSON.stringify({ removed: await drainPhotoCleanup(100) }));
    } else if (['plan', 'prepare'].includes(mode)) {
        if (!values.manifest) throw new Error('Manifest path required');
        const result = await preparePhotoMigration(pool, { target: values.target, root: values.root, manifestPath: values.manifest, dryRun: mode === 'plan' });
        console.log(JSON.stringify({ mode, photos: result.photos, rows: result.rows, errors: result.errors }));
        if (result.errors) process.exitCode = 1;
    } else if (['apply', 'rollback'].includes(mode)) {
        if (!values['writes-stopped']) throw new Error('Stop API and workers, then pass --writes-stopped');
        const manifest = await loadManifest(values.manifest);
        await applyPhotoMigration(pool, manifest, { rollback: mode === 'rollback', root: values.root || manifest.root });
        console.log(JSON.stringify({ mode, status: 'complete', entries: manifest.entries.length }));
    } else throw new Error('Unknown photo migration mode');
} catch {
    console.error('PHOTO_STORAGE_COMMAND_FAILED: check configuration, sources, manifest and stopped writes. No credentials logged.');
    process.exitCode = 1;
} finally { await pool.end(); }
