process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-jwt-secret-at-least-32-characters-long';
process.env.DB_URL ??= 'postgres://postgres:postgres@127.0.0.1:5432/mirailink_test';
process.env.ORIGIN ??= 'http://localhost:5173';
process.env.SALT_ROUNDS ??= '4';
process.env.SECRET_2FA_KEY ??= '11'.repeat(32);
process.env.SECRET_2FA_IV ??= '22'.repeat(16);
