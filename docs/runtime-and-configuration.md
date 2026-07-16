# Runtime y configuración

## Versiones

- Node.js: 22 o superior, declarado en `engines`.
- PostgreSQL: 16 en CI.
- Módulos: ESM mediante `type: module`.

Los scripts usan `cross-env` y `node --env-file`, por lo que funcionan en Windows, Linux y macOS.

## Variables

| Variable | Obligatoria | Validación y uso |
| --- | --- | --- |
| `NODE_ENV` | No | `development`, `test` o `production`; default development |
| `PORT` | No | Entero 1-65535; default 3000 |
| `DB_URL` | Sí | URL que comienza por `postgres`; pool y tests de base |
| `JWT_SECRET` | Sí | Mínimo 32 caracteres; HS256 access y challenge |
| `ORIGIN` | Sí | Lista separada por comas de origins HTTP/HTTPS exactos |
| `SALT_ROUNDS` | No | Entero 4-15; default 12 |
| `UPLOAD_MAX_BYTES` | No | 1 KiB-20 MiB; default 5 MiB |
| `UPLOAD_ROOT` | No | Directorio persistente de perfiles fuera del checkout en producción |
| `SECRET_2FA_KEY` | Sí | 64 caracteres hex, 32 bytes para AES-256-GCM |
| `SECRET_2FA_IV` | Solo legado | 32 hex, necesario para descifrar secretos AES-CBC antiguos |
| `EMAIL_HOST` | Para correo | Host SMTP; default `smtp.hostinger.com` en la utilidad |
| `EMAIL_PORT` | No | 1-65535; default 587 |
| `EMAIL_SECURE` | No | String `true` o `false` |
| `EMAIL_USER` | Para correo | Usuario y remitente |
| `EMAIL_PASSWORD` | Para correo | Secreto SMTP |
| `FIREBASE_SERVICE_ACCOUNT_FILE_NAME` | Para push | Ruta al JSON de service account |
| `REQUIRE_DATABASE_TESTS` | En CI | `true` obliga a ejecutar el test PostgreSQL |

`parseEnv()` falla antes de escuchar si la configuración estructural es inválida. SMTP y Firebase pueden estar ausentes hasta que se invoque su función.

## Arranque

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Producción local:

```powershell
npm start
```

`src/server.js` configura request timeout de 30 s, headers timeout de 35 s y keep-alive de 5 s. Atiende `SIGTERM` y `SIGINT` con cierre del servidor HTTP.

## PostgreSQL

Para una base vacía:

```powershell
psql -d mirailink -f src/database/db.sql
psql -d mirailink -f src/database/migrations/002_security_hardening.sql
```

`db_inserts.sql` solo contiene datos de desarrollo. No hay runner de migraciones integrado al arranque.

## Health y estáticos

- `GET /`: identidad del servicio.
- `GET /healthz`: liveness del proceso, sin comprobar dependencias.
- `/static`: contenido de `src/public`.
- `/assets`: media con dotfiles denegados, sin índice, CSP y `nosniff`.

## Operación pendiente

No existen readiness de PostgreSQL, logging JSON, métricas, tracing, alertas ni despliegue automático. El diseño futuro está en [future-vps-deployment.md](future-vps-deployment.md).
