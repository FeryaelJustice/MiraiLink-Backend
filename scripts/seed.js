import { seedUsers } from './seed-users.js';
import bcrypt from 'bcrypt';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables if not already present
if (!process.env.DB_URL) {
    const envPath = path.join(rootDir, '.env');
    if (fs.existsSync(envPath)) {
        process.loadEnvFile(envPath);
    }
}

if (!process.env.DB_URL) {
    console.error('Error: DB_URL environment variable is not defined.');
    process.exit(1);
}

const pool = new pg.Pool({
    connectionString: process.env.DB_URL,
});

const rounds = Number(process.env.SALT_ROUNDS ?? 12);
const DEFAULT_PROFILE_PHOTO_URL = 'img/profiles/Goku.webp';

async function runSeed() {
    const client = await pool.connect();
    try {
        console.log('🌱 Starting database seed with real bcrypt hashes...');

        // Corrige bases existentes sin invalidar recovery codes durante el seed.
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'recovery_codes' AND column_name = 'code'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'recovery_codes' AND column_name = 'code_hash'
                ) THEN
                    ALTER TABLE recovery_codes RENAME COLUMN code TO code_hash;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'recovery_codes' AND column_name = 'code_hash'
                ) THEN
                    ALTER TABLE recovery_codes ADD COLUMN code_hash TEXT;
                END IF;
            END $$;
        `);
        console.log('✅ Esquema de recovery codes verificado.');

        const testUsers = seedUsers;

        await client.query('BEGIN');

        for (const user of testUsers) {
            const passwordHash = await bcrypt.hash(user.password, rounds);
            // Reutilizar la fila existente cuando el username del seed ya está presente.
            // Evita duplicar identidades en bases creadas con seeds anteriores.
            const existingUser = await client.query(
                'SELECT id FROM users WHERE username = $1 LIMIT 1',
                [user.username],
            );
            const seedUserId = existingUser.rows[0]?.id ?? user.id;
            const residence = await client.query(
                `SELECT city.id AS city_id, city.region_id, city.country_id
                 FROM cities city
                 JOIN countries country ON country.id = city.country_id
                 WHERE country.iso_code = $1
                 ORDER BY (city.latitude - $2) * (city.latitude - $2) +
                          (city.longitude - $3) * (city.longitude - $3)
                 LIMIT 1`,
                [user.residenceCountryCode, user.residenceLatitude, user.residenceLongitude],
            );
            if (!residence.rows[0]) throw new Error(`Seed city not found for ${user.username}`);

            await client.query(
                `INSERT INTO users (
                    id, username, nickname, email, phone_number, password_hash, auth_provider,
                    is_verified, bio, gender, birthdate, residence_country_id, residence_region_id,
                    residence_city_id, residence_latitude, residence_longitude,
                    current_latitude, current_longitude
                ) VALUES (
                    $1, $2, $2, $3, $4, $5, $6,
                    $7, $8, $9, $10, $11, $12,
                    $13, $14, $15,
                    $16, $17
                )
                ON CONFLICT (id) DO UPDATE SET
                    password_hash = EXCLUDED.password_hash,
                    email = EXCLUDED.email,
                    username = EXCLUDED.username,
                    is_verified = EXCLUDED.is_verified,
                    bio = EXCLUDED.bio,
                    gender = EXCLUDED.gender,
                    birthdate = EXCLUDED.birthdate,
                    residence_country_id = EXCLUDED.residence_country_id,
                    residence_region_id = EXCLUDED.residence_region_id,
                    residence_city_id = EXCLUDED.residence_city_id,
                    residence_latitude = EXCLUDED.residence_latitude,
                    residence_longitude = EXCLUDED.residence_longitude,
                    current_latitude = EXCLUDED.current_latitude,
                    current_longitude = EXCLUDED.current_longitude`,
                [
                    seedUserId,
                    user.username,
                    user.email,
                    user.phoneNumber,
                    passwordHash,
                    user.authProvider,
                    user.isVerified,
                    user.bio,
                    user.gender,
                    user.birthdate,
                    residence.rows[0].country_id,
                    residence.rows[0].region_id,
                    residence.rows[0].city_id,
                    user.residenceLatitude,
                    user.residenceLongitude,
                    user.currentLatitude,
                    user.currentLongitude,
                ],
            );

            console.log(`✅ Seeded user: ${user.username}`);

            await client.query(
                `INSERT INTO user_photos (user_id, url, position)
                 VALUES ($1, $2, 1)
                 ON CONFLICT (user_id, position) DO UPDATE SET url = EXCLUDED.url`,
                [seedUserId, DEFAULT_PROFILE_PHOTO_URL],
            );

            for (const animeName of user.animes ?? []) {
                const anime = await client.query(
                    `SELECT t.anime_id AS id FROM anime_name_translations t
                     JOIN supported_languages l ON l.id = t.language_id
                     WHERE l.code = 'es' AND t.name = $1 LIMIT 1`,
                    [animeName],
                );
                if (anime.rowCount > 0) {
                    await client.query(
                        'INSERT INTO user_anime_interests (user_id, anime_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [seedUserId, anime.rows[0].id],
                    );
                }
            }

            for (const gameName of user.games ?? []) {
                const game = await client.query(
                    `SELECT t.game_id AS id FROM game_name_translations t
                     JOIN supported_languages l ON l.id = t.language_id
                     WHERE l.code = 'es' AND t.name = $1 LIMIT 1`,
                    [gameName],
                );
                if (game.rowCount > 0) {
                    await client.query(
                        'INSERT INTO user_game_interests (user_id, game_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [seedUserId, game.rows[0].id],
                    );
                }
            }

            for (const goalCode of user.relationshipGoals ?? []) {
                const goal = await client.query(
                    'SELECT id FROM relationship_goals WHERE code = $1 LIMIT 1',
                    [goalCode],
                );
                if (goal.rowCount > 0) {
                    await client.query(
                        'INSERT INTO user_relationship_goals (user_id, goal_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [seedUserId, goal.rows[0].id],
                    );
                }
            }

            for (const langCode of user.spokenLanguages ?? []) {
                const lang = await client.query(
                    'SELECT id FROM spoken_languages WHERE code = $1 LIMIT 1',
                    [langCode],
                );
                if (lang.rowCount > 0) {
                    await client.query(
                        'INSERT INTO user_spoken_languages (user_id, language_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [seedUserId, lang.rows[0].id],
                    );
                }
            }

            for (const promptItem of user.prompts ?? []) {
                const prompt = await client.query(
                    'SELECT id FROM profile_prompts WHERE code = $1 LIMIT 1',
                    [promptItem.code],
                );
                if (prompt.rowCount > 0) {
                    await client.query(
                        `INSERT INTO user_profile_prompts (user_id, prompt_id, answer)
                         VALUES ($1, $2, $3)
                         ON CONFLICT (user_id, prompt_id) DO UPDATE SET answer = EXCLUDED.answer`,
                        [seedUserId, prompt.rows[0].id, promptItem.answer],
                    );
                }
            }
        }

        // Precargar configuración de versión Android
        await client.query(
            `INSERT INTO app_versions (platform, min_supported_version_code, latest_version_code, message, play_store_url)
             VALUES ('android', 1, 33, 'Actualización recomendada', 'https://play.google.com/store/apps/details?id=com.feryaeljustice.mirailink')
             ON CONFLICT (platform) DO UPDATE SET
                 min_supported_version_code = EXCLUDED.min_supported_version_code,
                 latest_version_code = EXCLUDED.latest_version_code`,
        );
        console.log('✅ Seeded app_versions for platform android');

        await client.query('COMMIT');
        console.log('✨ Seed completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error seeding database:', error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

runSeed();
