# MiraiLink Backend

API de MiraiLink construida con Node.js 22, Express 5 y PostgreSQL. Incluye autenticación con 2FA, perfiles, descubrimiento, matches, chats, catálogos, reportes, feedback, fotos y notificaciones push.

## Estado

El backend dispone de tests Vitest y Supertest, lint, cobertura, contrato OpenAPI comprobado, migración de seguridad y CI sin despliegue. Los proveedores SMTP y Firebase se inicializan bajo demanda. `src/assets` no se lee, inventaría ni modifica durante mantenimiento o tests.

## Inicio rápido

```powershell
npm ci
Copy-Item .env.example .env
psql -U postgres -d mirailink -f src/database/db.sql
npm run dev
```

Para una instalación existente, aplica después `src/database/migrations/002_security_hardening.sql`. La migración invalida recovery codes antiguos porque ahora solo se guardan hashes bcrypt.

Firebase es opcional. Configura `FIREBASE_SERVICE_ACCOUNT_FILE_NAME` solo si se enviarán notificaciones. En producción, usa `UPLOAD_ROOT` fuera del checkout.

## Comandos

| Comando | Función |
| --- | --- |
| `npm run dev` | Servidor con nodemon y `.env` |
| `npm start` | Arranque de producción |
| `npm run lint` | Análisis ESLint |
| `npm test` | Suite completa |
| `npm run test:coverage` | Tests y umbrales de cobertura |
| `npm run test:database` | Esquema PostgreSQL, activo con `REQUIRE_DATABASE_TESTS=true` |
| `npm run check:routes` | Rutas Express contra OpenAPI |
| `npm run check` | Lint, cobertura y contrato |

## Seguridad relevante para clientes

- Login con 2FA responde `requires2FA`, `challengeToken` y `expiresIn`; el JWT final se obtiene en `POST /api/auth/2fa/loginVerifyLastStep` con `challengeToken` y `code`.
- `POST /api/auth/2fa/status` requiere Bearer y siempre consulta al usuario autenticado.
- Verificación de cuenta ya no acepta `userId`; queda ligada al Bearer actual.
- Se retiraron `/api/user/byToken`, `/api/user/byEmailPassword` y `/api/user/public/delete-account`.
- Feed, matches, perfiles públicos e historial de chat no exponen email, teléfono, hashes o secretos.
- Fotos admiten JPEG, PNG y WebP reales, máximo 5 MiB por archivo y cuatro archivos.
- Los errores comunes usan `code`, `message`, `requestId` y, solo para validación, `details`.

## Documentación

- [Índice](docs/README.md)
- [Guía de API segura](docs/api-hardening-addendum.md)
- [OpenAPI](docs/openapi.yaml)
- [Remediación de seguridad](docs/security-remediation.md)
- [Arquitectura](docs/architecture.md)
- [Testing](docs/testing-strategy.md)
- [Despliegue VPS futuro](docs/future-vps-deployment.md)

## Licencia

ISC.
