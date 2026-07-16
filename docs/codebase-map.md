# Mapa del código

## Raíz

| Archivo | Responsabilidad |
| --- | --- |
| `README.md` | Único índice de documentación y onboarding |
| `AGENTS.md` | Reglas operativas para contribuidores y agentes |
| `package.json` | Dependencias, Node 22 y scripts |
| `package-lock.json` | Resolución reproducible |
| `.env.example` | Contrato de configuración sin secretos reales |
| `eslint.config.js` | Lint plano de ESLint 10 |
| `vitest.config.js` | Suites, cobertura y exclusiones |
| `.github/workflows/ci.yml` | CI de checks, sin CD |
| `scripts/check-openapi-routes.js` | Compara las 43 rutas activas con OpenAPI |

## Runtime

| Ruta | Contenido |
| --- | --- |
| `src/server.js` | Proceso HTTP, entorno, timeouts y señales |
| `src/app.js` | Factory Express, middleware global y mounts |
| `src/config/env.js` | Parser Zod de variables |
| `src/config/firebaseAdmin.js` | Firebase lazy y reset para tests |
| `src/models/db.js` | `pg.Pool` compartido |
| `src/errors/AppError.js` | Error operacional estable |

## Capas HTTP

- `src/routes`: once routers y 43 operaciones.
- `src/validation`: schemas de auth, chat, social, user y campos comunes.
- `src/middleware`: Bearer, autorización de chat, errores, rate limit, multipart, request id y parsing Zod.
- `src/controllers`: nueve controladores activos para app, auth, catálogo, chat, feedback, match, foto, reporte, swipe y usuario.

## Servicios y utilidades

- `src/services/tokenService.js`: access tokens, challenges y expiración.
- `src/services/twoFactorService.js`: TOTP y recovery codes.
- `src/services/notificationService.js`: token FCM y push.
- `src/utils/cryptoUtils.js`: AES-GCM y lectura heredada AES-CBC.
- `src/utils/imageValidation.js`: detección por firma.
- `src/utils/photoStorage.js`: staging, finalización y limpieza.
- `src/utils/mailer.js`: envío SMTP lazy.
- `src/dto/user.dto.js`: allowlist pública.
- `src/consts/photosConsts.js`: rutas lógicas de fotos.

## Datos

- `src/database/db.sql`: esquema base histórico de 21 tablas y un enum.
- `src/database/migrations/002_security_hardening.sql`: estado seguro requerido para instalaciones nuevas y existentes.
- `src/database/db_inserts.sql`: datos de desarrollo, no de producción.

## Tests

| Carpeta | Alcance |
| --- | --- |
| `tests/unit/config` | Parser de entorno |
| `tests/unit/dto` | Privacidad de usuarios |
| `tests/unit/middleware` | Chat member, errores y validación |
| `tests/unit/services` | Tokens y 2FA |
| `tests/unit/utils` | AES-GCM e imágenes |
| `tests/unit/scripts` | Contrato de rutas |
| `tests/integration` | App, JWT y login 2FA |
| `tests/database` | Esquema y migración sobre PostgreSQL real |

## Contenido no fuente

`src/public` contiene una página estática. `src/assets` contiene media de runtime y no debe leerse, listarse, documentarse ni modificarse.
