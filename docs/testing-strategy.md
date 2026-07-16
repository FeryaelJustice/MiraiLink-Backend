# Testing

## Estado actual

Vitest ejecuta 29 casos descubiertos: 28 se ejecutan sin servicios externos y uno verifica PostgreSQL cuando `REQUIRE_DATABASE_TESTS=true`. Supertest carga `createApp()` sin abrir puerto. ESLint, cobertura V8 y el contrato OpenAPI forman parte de CI.

## Suites

| Suite | Qué demuestra |
| --- | --- |
| `app.test.js` | Factory importable, headers y 404 JSON |
| `auth.middleware.test.js` | Blacklist persistente y ausencia de filtrado JWT |
| `auth.routes.test.js` | Login con 2FA entrega challenge, no access token |
| `env.test.js` | Variables válidas, ausentes y malformadas |
| `user.dto.test.js` | Campos sensibles fuera del DTO público |
| `chatMember.test.js` | Un no miembro no accede al chat |
| `error.test.js` | Envelope operacional y 500 genérico |
| `validate.test.js` | Parsing y detalles Zod |
| `tokenService.test.js` | Purpose y expiración del challenge |
| `twoFactorService.test.js` | Hash y consumo de recovery codes |
| `cryptoUtils.test.js` | Nonce aleatorio, decrypt y detección de manipulación |
| `imageValidation.test.js` | Firmas JPEG, PNG, WebP y spoofing |
| `check-openapi-routes.test.js` | Descubrimiento y cobertura de rutas API |
| `schema.integration.test.js` | Esquema, blacklist expiry y recovery hashes |

## Comandos

```powershell
npm test
npm run test:unit
npm run test:integration
npm run test:coverage
npm run check:routes
```

Con PostgreSQL desechable:

```powershell
$env:REQUIRE_DATABASE_TESTS='true'
$env:DB_URL='postgres://postgres:postgres@localhost:5432/mirailink_test'
npm run test:database
```

El test de base aplica `db.sql` y la migración 002. Usa una base vacía y descartable porque crea objetos en el schema público.

## Cobertura

Los umbrales globales actuales son 60 por ciento statements, 45 branches, 50 functions y 60 lines sobre middleware, services, utils, validation y DTO. Son una barrera de regresión inicial, no una declaración de cobertura exhaustiva.

## CI

GitHub Actions usa Node 22, `npm ci` y PostgreSQL 16. Ejecuta lint, cobertura, test de base obligatorio, contrato y audit de dependencias de producción. No despliega.

## Vacíos prioritarios

- Flujos HTTP completos de registro, reset, verificación y consumo 2FA.
- Multipart real usando directorios temporales y fallos de filesystem.
- Transacciones de chat y fotos ante errores PostgreSQL.
- Feed, matches y perfiles con fixtures reales y assertions de privacidad HTTP.
- SMTP, Firebase y notification fallback.
- Concurrencia de chat privado, likes y posiciones de fotos.
- Readiness, timeouts y cierre del proceso.

Ningún test debe apuntar a `src/assets` ni a una base compartida de desarrollo.
