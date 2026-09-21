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

        const testUsers = [
            {
                id: '11111111-1111-4111-8111-111111111111',
                username: 'kirito',
                email: 'kirito@example.com',
                password: 'PasswordSegura123!',
                phoneNumber: '+34611111222',
                authProvider: 'email',
                isVerified: true,
                bio: 'Fan del mundo SAO.',
                gender: 'male',
                birthdate: '1997-07-10',
                residenceCity: 'Palma',
                residenceRegion: 'Islas Baleares',
                residenceCountryCode: 'ES',
                residenceLatitude: 39.5696,
                residenceLongitude: 2.6502,
                currentLatitude: 39.5696,
                currentLongitude: 2.6502,
                animes: ['Sword Art Online', 'Frieren: Beyond Journey\'s End'],
                games: ['The Legend of Zelda: Tears of the Kingdom', 'Elden Ring'],
            },
            {
                id: '22222222-2222-4222-8222-222222222222',
                username: 'asuna',
                email: 'asuna@example.com',
                password: 'PasswordSegura123!',
                phoneNumber: '+34633334444',
                authProvider: 'google',
                isVerified: true,
                bio: 'Me encantan los MMOs.',
                gender: 'female',
                birthdate: '1998-03-15',
                residenceCity: 'Inca',
                residenceRegion: 'Islas Baleares',
                residenceCountryCode: 'ES',
                residenceLatitude: 39.7211,
                residenceLongitude: 2.9110,
                currentLatitude: 39.7211,
                currentLongitude: 2.9110,
                animes: ['Kaguya-sama: Love is War', 'Haikyuu!!'],
                games: ['Genshin Impact', 'Animal Crossing: New Horizons'],
            },
            {
                id: '33333333-3333-4333-8333-333333333333',
                username: 'feryael',
                email: 'test@mirailink.xyz',
                password: 'PasswordSegura123!',
                phoneNumber: '+34655556666',
                authProvider: 'email',
                isVerified: true,
                bio: 'Testing MiraiLink user.',
                gender: 'other',
                birthdate: '1999-01-01',
                residenceCity: 'Madrid',
                residenceRegion: 'Madrid',
                residenceCountryCode: 'ES',
                residenceLatitude: 40.4168,
                residenceLongitude: -3.7038,
                currentLatitude: 40.4168,
                currentLongitude: -3.7038,
                animes: ['Jujutsu Kaisen', 'Chainsaw Man'],
                games: ['VALORANT', 'Stardew Valley'],
            },
            {
                id: '44444444-4444-4444-8444-444444444444',
                username: 'nora_barcelona',
                email: 'nora.barcelona@example.com',
                password: 'PasswordSegura123!',
                phoneNumber: '+34677778888',
                authProvider: 'email',
                isVerified: true,
                bio: 'Cosplay, manga clásico y cafeterías frikis. Siempre buscando una buena charla sobre historias que dejan huella.',
                gender: 'female',
                birthdate: '2001-04-10',
                residenceCity: 'Barcelona',
                residenceRegion: 'Cataluña',
                residenceCountryCode: 'ES',
                residenceLatitude: 41.3874,
                residenceLongitude: 2.1686,
                currentLatitude: 41.3874,
                currentLongitude: 2.1686,
                animes: ['Frieren: Beyond Journey\'s End', 'Steins;Gate'],
                games: ['Persona 5 Royal'],
            },
            {
                id: '55555555-5555-4555-8555-555555555555',
                username: 'marc_valencia',
                email: 'marc.valencia@example.com',
                password: 'PasswordSegura123!',
                phoneNumber: '+34688889999',
                authProvider: 'email',
                isVerified: true,
                bio: 'Desarrollo juegos indie, dibujo pixel art y me pierdo con gusto en un buen RPG cooperativo.',
                gender: 'male',
                birthdate: '1998-09-21',
                residenceCity: 'Valencia',
                residenceRegion: 'Comunidad Valenciana',
                residenceCountryCode: 'ES',
                residenceLatitude: 39.4699,
                residenceLongitude: -0.3763,
                currentLatitude: 39.4699,
                currentLongitude: -0.3763,
                animes: ['Psycho-Pass', 'Fullmetal Alchemist: Brotherhood'],
                games: ['Monster Hunter: World', 'The Legend of Zelda: Tears of the Kingdom'],
            },
            {
                id: '66666666-6666-4666-8666-666666666666',
                username: 'claire_paris',
                email: 'claire.paris@example.com',
                password: 'PasswordSegura123!',
                phoneNumber: '+33611112222',
                authProvider: 'email',
                isVerified: true,
                bio: 'Estudio japonés, colecciono figuras y disfruto los RPG narrativos y las películas de animación.',
                gender: 'female',
                birthdate: '2002-07-09',
                residenceCity: 'París',
                residenceRegion: 'Île-de-France',
                residenceCountryCode: 'FR',
                residenceLatitude: 48.8566,
                residenceLongitude: 2.3522,
                currentLatitude: 48.8566,
                currentLongitude: 2.3522,
                animes: ['Violet Evergarden', 'Samurai Champloo'],
                games: ['Final Fantasy XIV Online'],
            },
            {
                id: '77777777-7777-4777-8777-777777777777',
                username: 'yuki_tokyo',
                email: 'yuki.tokyo@example.com',
                password: 'PasswordSegura123!',
                phoneNumber: '+819011112222',
                authProvider: 'email',
                isVerified: true,
                bio: 'Ilustración digital, Studio Ghibli y ramen. Me encantan las conversaciones tranquilas sobre mundos imaginarios.',
                gender: 'female',
                birthdate: '2000-01-18',
                residenceCity: 'Tokio',
                residenceRegion: 'Kanto',
                residenceCountryCode: 'JP',
                residenceLatitude: 35.6762,
                residenceLongitude: 139.6503,
                currentLatitude: 35.6762,
                currentLongitude: 139.6503,
                animes: ['One Piece', 'Haikyuu!!'],
                games: ['Pokémon GO', 'Animal Crossing: New Horizons'],
            },
            {
                id: '88888888-8888-4888-8888-888888888888',
                username: 'isha_mumbai',
                email: 'isha.mumbai@example.com',
                password: 'PasswordSegura123!',
                phoneNumber: '+919811112222',
                authProvider: 'email',
                isVerified: true,
                bio: 'Product designer, fan de One Piece y Stardew Valley. Me encantan las conversaciones que empiezan hablando de anime y terminan hablando de todo.',
                gender: 'female',
                birthdate: '1999-04-22',
                residenceCity: 'Mumbai',
                residenceRegion: 'Maharashtra',
                residenceCountryCode: 'IN',
                residenceLatitude: 19.0760,
                residenceLongitude: 72.8777,
                currentLatitude: 19.0760,
                currentLongitude: 72.8777,
                animes: ['One Piece', 'Haikyuu!!'],
                games: ['Stardew Valley', 'The Sims 4'],
            },
            {
                id: '99999999-9999-4999-8999-999999999999',
                username: 'leo_newyork',
                email: 'leo.newyork@example.com',
                password: 'PasswordSegura123!',
                phoneNumber: '+12125551234',
                authProvider: 'email',
                isVerified: true,
                bio: 'Fotografía, cómics y speedruns de indies. Busco recomendaciones de roguelikes y bandas sonoras épicas.',
                gender: 'other',
                birthdate: '2001-12-03',
                residenceCity: 'Nueva York',
                residenceRegion: 'New York',
                residenceCountryCode: 'US',
                residenceLatitude: 40.7128,
                residenceLongitude: -74.0060,
                currentLatitude: 40.7128,
                currentLongitude: -74.0060,
                animes: ['Mob Psycho 100', 'Cowboy Bebop'],
                games: ['Stardew Valley', 'Genshin Impact'],
            },
        ];

        await client.query('BEGIN');

        for (const user of testUsers) {
            const passwordHash = await bcrypt.hash(user.password, rounds);
            // Reuse an existing row when the seed username already exists.
            // This keeps the seed idempotent across databases created by older seeds.
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
        }

        // Ensure app version is seeded
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
