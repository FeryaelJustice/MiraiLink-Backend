# Runtime y configuración

## Runtime soportado por el código

El proyecto usa módulos ES y un import JSON con atributos en `firebaseAdmin.js`. La base práctica documentada es Node.js 20 o superior. No hay compilación ni transpilación.

Los scripts de `package.json` usan `set VARIABLE=valor`, por lo que son específicos de `cmd.exe` en Windows:

| Script | Ejecución real |
| --- | --- |
| `npm run dev` | `set NODE_ENV=development && nodemon --env-file=.env src/app.js` |
| `npm start` | `set NODE_ENV=production && node --env-file=.env src/app.js` |
| `npm run build` | Solo imprime un mensaje. |
| `npm test` | Solo imprime que no hay tests. |
| `npm run lint` | Intenta `eslint .`, pero ESLint no está instalado. |

## Variables de entorno

| Variable | Obligatoria | Consumidor | Formato o valor |
| --- | --- | --- | --- |
| `PORT` | No | `app.js` | Entero. Predeterminado `3000`. |
| `ORIGIN` | Sí para clientes web | `app.js`, Socket.IO si se activara | Origen completo, por ejemplo `http://localhost:5173`. |
| `DB_URL` | Sí | `models/db.js` | URL PostgreSQL. |
| `JWT_SECRET` | Sí | Auth y sockets | Secreto largo y aleatorio. |
| `SALT_ROUNDS` | No | `auth.controller.js` | Entero para bcrypt. Predeterminado real `6`. |
| `EMAIL_HOST` | No | `mailer.js` | Predeterminado `smtp.hostinger.com`. |
| `EMAIL_PORT` | No | `mailer.js` | Predeterminado `587`. |
| `EMAIL_SECURE` | No | `mailer.js` | String `true` o `false`. |
| `EMAIL_USER` | Sí para correo | `mailer.js` | Cuenta remitente SMTP. |
| `EMAIL_PASSWORD` | Sí para correo | `mailer.js` | Credencial SMTP. |
| `SECRET_2FA_KEY` | Sí para importar auth | `cryptoUtils.js` | 64 caracteres hex, equivalentes a 32 bytes. |
| `SECRET_2FA_IV` | Sí para importar auth | `cryptoUtils.js` | 32 caracteres hex, equivalentes a 16 bytes. |

El ejemplo antiguo declaraba `BCRYPT_ROUNDS`, pero el código lee `SALT_ROUNDS`. También declaraba `FIREBASE_SERVICE_ACCOUNT_FILE_NAME`, pero la implementación no usa esa variable.

## Archivos sensibles

### `.env`

Debe permanecer fuera de Git. No se inspeccionó durante esta revisión. Cada entorno debe usar secretos distintos.

### `src/serviceAccountKey.json`

Firebase Admin lo importa mediante una ruta fija. Debe existir antes de arrancar y está ignorado por Git. No debe copiarse a documentación, logs, imágenes de contenedor públicas ni artefactos de CI.

Una mejora futura es permitir credenciales por variables estándar de Google o inyección de configuración, sin forzar un archivo local en todos los entornos.

## Dependencias externas

### PostgreSQL

- Conexión única a través de `pg.Pool` y `DB_URL`.
- No hay comprobación explícita de salud al arrancar.
- No hay cierre ordenado del pool al recibir señales.
- No hay configuración propia de tamaño, timeout o SSL.

### SMTP

- El transporte se crea al importar el módulo.
- `sendVerificationEmail` inicia `sendMail`, pero no espera su finalización.
- Los endpoints pueden responder éxito antes de confirmar la entrega.
- No hay plantillas, reintentos ni proveedor alternativo.

### Firebase Cloud Messaging

- Se inicializa durante el arranque global.
- El servidor guarda un token por usuario.
- El envío de chat ocurre después de responder al cliente y los errores solo se registran.
- Todos los valores del mapa `data` se convierten a string.

### Filesystem local

- Los uploads se escriben bajo `src/assets/img/profiles/<userId>`.
- Se sirven públicamente desde `/assets`.
- No hay límites de tamaño, filtro MIME ni almacenamiento externo.
- El almacenamiento local no se comparte entre varias réplicas del servidor.
- `src/assets` no fue leído ni modificado durante esta tarea.

## Arranque local

```powershell
npm install
Copy-Item .env.example .env
psql -U postgres -d mirailink -f src/database/db.sql
psql -U postgres -d mirailink -f src/database/db_inserts.sql
npm run dev
```

Antes del último comando debe existir una credencial Firebase válida en la ruta fija.

## Señales de salud disponibles

- `GET /` responde texto plano `Hello, World!`.
- `GET /api/app/version/android` prueba indirectamente el acceso a PostgreSQL.
- No existe `/health`, `/ready` ni métrica de proceso.

Para operación real se recomienda:

- Liveness sin dependencias externas.
- Readiness con consulta PostgreSQL y estado de configuración.
- Logging estructurado con request id.
- Cierre ordenado de HTTP y pool.
- Timeouts, límites de body y rate limiting.
- Métricas de latencia, errores, pool, correo y FCM.

## Despliegue

No hay Dockerfile, pipeline CI, manifiestos de infraestructura ni configuración de plataforma. Tampoco hay evidencia de proxy, TLS, balanceo o almacenamiento persistente. Cualquier guía de despliegue más concreta sería especulativa hasta añadir esos archivos.
