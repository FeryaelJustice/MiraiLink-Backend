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

async function runSeed() {
    const client = await pool.connect();
    try {
        console.log('🌱 Starting database seed with real bcrypt hashes...');

        const testUsers = [
            {
                id: '11111111-1111-1111-1111-111111111111',
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
            },
            {
                id: '22222222-2222-2222-2222-222222222222',
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
            },
            {
                id: '33333333-3333-3333-3333-333333333333',
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
            },
        ];

        await client.query('BEGIN');

        for (const user of testUsers) {
            const passwordHash = await bcrypt.hash(user.password, rounds);

            await client.query(
                `INSERT INTO users (
                    id, username, nickname, email, phone_number, password_hash, auth_provider,
                    is_verified, bio, gender, birthdate, residence_city, residence_region,
                    residence_country_code, residence_latitude, residence_longitude,
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
                    residence_city = EXCLUDED.residence_city,
                    residence_latitude = EXCLUDED.residence_latitude,
                    residence_longitude = EXCLUDED.residence_longitude`,
                [
                    user.id,
                    user.username,
                    user.email,
                    user.phoneNumber,
                    passwordHash,
                    user.authProvider,
                    user.isVerified,
                    user.bio,
                    user.gender,
                    user.birthdate,
                    user.residenceCity,
                    user.residenceRegion,
                    user.residenceCountryCode,
                    user.residenceLatitude,
                    user.residenceLongitude,
                    user.currentLatitude,
                    user.currentLongitude,
                ],
            );

            console.log(`✅ Seeded user: ${user.username} (password: "${user.password}")`);
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
