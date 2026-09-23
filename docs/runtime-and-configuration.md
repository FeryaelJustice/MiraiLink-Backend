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
| `ORIGIN` | Sí | Lista separada por comas de origins HTTP/HTTPS exactos (o `*`) |
| `ORIGIN_REGEX` | No | Expresión regular para orígenes dinámicos (ej. `^https:\/\/(.*\.trycloudflare\.com|.*\.mirailink\.xyz)$`) |
| `GLOBAL_RATE_LIMIT_MAX` | No | Entero (mínimo 10); peticiones máximas permitidas en la ventana global (default 1000) |
| `GLOBAL_RATE_LIMIT_WINDOW_MS` | No | Milisegundos de la ventana para rate limiting global (default 900000 = 15 min) |
| `RAWG_API_KEY` | Para catálogo | Clave de API de RAWG para sincronización de videojuegos |
| `CATALOG_SYNC_INTERVAL_HOURS` | No | Intervalo en horas para la sincronización periódica (default 24) |
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

## Seguridad, CORS y Rate Limiting

### 1. Política de CORS (Cross-Origin Resource Sharing)

La configuración de CORS se gestiona de forma centralizada en `src/app.js` mediante la función `createCorsOptions()`:

- **Peticiones sin cabecera `Origin`**: Se permiten siempre de forma automática (aplicaciones móviles nativas como MiraiLink en Android/iOS, llamadas directas entre servidores o clientes cURL).
- **Orígenes fijos (`ORIGIN`)**: Lista separada por comas de URLs de origen permitidas (ej. `ORIGIN=http://localhost:5173,https://mirailink.xyz`). Si se establece `ORIGIN=*`, se aceptan todos los orígenes.
- **Expresiones regulares (`ORIGIN_REGEX`)**: Permite autorizar dinámicamente orígenes según un patrón regex. Por ejemplo, para permitir túneles de desarrollo Cloudflare y subdominios del VPS:
  ```env
  ORIGIN_REGEX=^https:\/\/(.*\.trycloudflare\.com|.*\.mirailink\.xyz)$
  ```
- **Modo Desarrollo (`NODE_ENV !== 'production'`)**: Se autorizan automáticamente los orígenes de emuladores y desarrollo local (`localhost`, `127.0.0.1`, `10.0.2.2`, `10.0.3.2` con cualquier puerto) y cualquier túnel `https://*.trycloudflare.com`.

### 2. Rate Limiting

El middleware se encuentra en `src/middleware/rateLimit.middleware.js`:

- **Limitador global de la API (`/api`)**: Diseñado para ser generoso y no interferir con la navegación interactiva de la aplicación.
  - `GLOBAL_RATE_LIMIT_MAX`: Máximo de solicitudes permitidas por IP dentro de la ventana (por defecto `1000`).
  - `GLOBAL_RATE_LIMIT_WINDOW_MS`: Duración de la ventana en milisegundos (por defecto `900000` = 15 minutos).
- **Limitadores especializados existentes**:
  - `authLimiter`: 10 solicitudes cada 15 min en endpoints de autenticación (`/api/auth/login`, `/api/auth/register`, `/api/auth/2fa/verify`).
  - `emailLimiter`: 5 solicitudes por hora en envío de correos y recuperación de contraseñas.
  - `writeLimiter`: 30 solicitudes por minuto en reportes y feedback.
- **Entorno de pruebas (`app.locals.enableRateLimits === false`)**: Los tests unitarios y de integración deshabilitan automáticamente el rate limiting para evitar bloqueos espurios.

## Operación pendiente

No existen readiness de PostgreSQL, logging JSON, métricas, tracing, alertas ni despliegue automático. El diseño futuro está en [future-vps-deployment.md](future-vps-deployment.md).

