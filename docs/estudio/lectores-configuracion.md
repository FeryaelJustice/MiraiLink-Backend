# Índice de lectores de configuración

[Guía maestra](../guia-maestra.md) | [Semántica de configuración](configuracion.md).

Solo nombres y ubicaciones obtenidos de código versionado. No se han leído archivos privados. Este índice complementa la explicación de requisitos, fallback y errores del documento temático.

| Nombre | Fuentes lectoras |
| --- | --- |
| `APP_BASE_URL` | [src/utils/mailer.js](../../src/utils/mailer.js) |
| `DB_URL` | [scripts/import-geography.js](../../scripts/import-geography.js), [scripts/migrate-db.js](../../scripts/migrate-db.js), [scripts/reset-db.js](../../scripts/reset-db.js), [scripts/reset-interactions.js](../../scripts/reset-interactions.js), [scripts/seed.js](../../scripts/seed.js), [scripts/sync-catalog.js](../../scripts/sync-catalog.js), [src/models/db.js](../../src/models/db.js) |
| `EMAIL_HOST` | [src/utils/mailer.js](../../src/utils/mailer.js) |
| `EMAIL_PASSWORD` | [src/utils/mailer.js](../../src/utils/mailer.js) |
| `EMAIL_PORT` | [src/utils/mailer.js](../../src/utils/mailer.js) |
| `EMAIL_SECURE` | [src/utils/mailer.js](../../src/utils/mailer.js) |
| `EMAIL_USER` | [src/utils/mailer.js](../../src/utils/mailer.js) |
| `FIREBASE_SERVICE_ACCOUNT_FILE_NAME` | [src/config/firebaseAdmin.js](../../src/config/firebaseAdmin.js) |
| `GLOBAL_RATE_LIMIT_MAX` | [src/middleware/rateLimit.middleware.js](../../src/middleware/rateLimit.middleware.js) |
| `GLOBAL_RATE_LIMIT_WINDOW_MS` | [src/middleware/rateLimit.middleware.js](../../src/middleware/rateLimit.middleware.js) |
| `JWT_SECRET` | [src/middleware/auth.middleware.js](../../src/middleware/auth.middleware.js), [src/services/tokenService.js](../../src/services/tokenService.js) |
| `NODE_ENV` | [src/app.js](../../src/app.js) |
| `ORIGIN` | [src/app.js](../../src/app.js) |
| `ORIGIN_REGEX` | [src/app.js](../../src/app.js) |
| `PUBLIC_ORIGIN` | [src/utils/catalogLocalization.js](../../src/utils/catalogLocalization.js) |
| `RAWG_API_KEY` | [src/services/catalogSyncService.js](../../src/services/catalogSyncService.js), [src/services/rawgService.js](../../src/services/rawgService.js) |
| `SALT_ROUNDS` | [scripts/seed.js](../../scripts/seed.js), [src/controllers/auth.controller.js](../../src/controllers/auth.controller.js), [src/services/twoFactorService.js](../../src/services/twoFactorService.js) |
| `SECRET_2FA_IV` | [src/utils/cryptoUtils.js](../../src/utils/cryptoUtils.js) |
| `SECRET_2FA_KEY` | [src/utils/cryptoUtils.js](../../src/utils/cryptoUtils.js) |
| `UPLOAD_MAX_BYTES` | [src/middleware/photoUpload.middleware.js](../../src/middleware/photoUpload.middleware.js) |
| `UPLOAD_ROOT` | [src/utils/photoStorage.js](../../src/utils/photoStorage.js) |
