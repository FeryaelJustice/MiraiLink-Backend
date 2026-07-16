# Mapa del código

## Raíz

| Ruta | Papel | Observaciones |
| --- | --- | --- |
| `package.json` | Metadatos, scripts y dependencias | Tests y build son marcadores. ESLint no está declarado. |
| `.env.example` | Contrato de configuración de ejemplo | Debe contener solo placeholders seguros. |
| `.gitignore` | Exclusiones | Excluye `.env`, lockfile, credencial Firebase y `src/assets`. |
| `README.md` | Entrada para desarrollo | Resume estado real y enlaza esta carpeta. |
| `AGENTS.md` | Reglas de trabajo del repositorio | No es documentación de runtime. |
| `WARP.md` | Contexto heredado para Warp | Parte de su contenido quedó obsoleto frente al código actual. |

## `src/app.js`

Punto de entrada único. Configura CORS, JSON, compresión, Helmet, estáticos, routers, 404, errores y escucha de puerto. Importa Firebase como efecto lateral. No exporta `app` ni el servidor.

## Rutas

| Archivo | Base montada | Endpoints | Controlador principal |
| --- | --- | ---: | --- |
| `app.routes.js` | `/api/app` | 1 | `app.controller.js` |
| `auth.routes.js` | `/api/auth` | 14 | `auth.controller.js` |
| `catalog.routes.js` | `/api/catalog` | 2 | `catalog.controller.js` |
| `chat.routes.js` | `/api/chats` | 8 | `chat.controller.js` |
| `feedback.routes.js` | `/api/feedback` | 1 | `feedback.controller.js` |
| `match.routes.js` | `/api/match` | 3 | `match.controller.js` |
| `report.routes.js` | `/api/report` | 1 | `report.controller.js` |
| `swipe.routes.js` | `/api/swipe` | 3 | `swipe.controller.js` |
| `user.routes.js` | `/api/user` | 9 | `user.controller.js` |
| `userphotos.routes.js` | `/api/user/photos` | 3 | `photo.controller.js` |
| `users.routes.js` | `/api/users` | 1 | `user.controller.js` |

Total: 46 endpoints bajo `/api`, más `GET /`.

## Controladores

| Archivo | Responsabilidad | Estado |
| --- | --- | --- |
| `app.controller.js` | Versión Android | Conectado. |
| `auth.controller.js` | Registro, login, tokens, verificación y 2FA | Conectado, con flujo 2FA incompleto. |
| `catalog.controller.js` | Listado de anime y juegos | Conectado. |
| `chat.controller.js` | Chats y mensajes REST | Conectado, sin comprobación consistente de membresía. |
| `feedback.controller.js` | Feedback autenticado | Conectado. |
| `match.controller.js` | Matches y visto | Conectado, usa `SELECT u.*`. |
| `message.controller.js` | Modelo alternativo de conversaciones | No está importado por rutas y no coincide con el esquema vigente. |
| `photo.controller.js` | API específica de fotos | Conectado. |
| `report.controller.js` | Reportes | Conectado. |
| `swipe.controller.js` | Feed, likes y dislikes | Conectado, el feed usa `SELECT *`. |
| `user.controller.js` | Perfiles, edición, borrado y FCM | Conectado, concentra gran parte de la complejidad. |

## Middleware

- `auth.middleware.js`: extrae Bearer token, consulta blacklist, verifica JWT, comprueba usuario y añade `req.user` y `req.token`.
- `error.middleware.js`: registra stack y devuelve 500 JSON. No normaliza errores conocidos.

## Persistencia

- `models/db.js`: instancia `pg.Pool` con `DB_URL`.
- `database/db.sql`: crea enum, 21 tablas, relaciones e índices.
- `database/db_inserts.sql`: datos de desarrollo para usuarios, catálogos, interacciones y versión de app.
- No hay modelos de dominio, ORM, repositorios ni migraciones versionadas.

## Servicios e integraciones

- `config/firebaseAdmin.js`: importa una credencial JSON fija e inicializa Firebase Admin.
- `services/notificationService.js`: obtiene tokens y envía push FCM.
- `utils/mailer.js`: crea un transporte SMTP y lanza el envío de códigos.
- `utils/cryptoUtils.js`: cifra y descifra secretos TOTP con AES-256-CBC.
- `utils/dateUtils.js`: suma dos horas y normaliza fechas de nacimiento.
- `utils/photoUploader.js`: reemplaza registros y archivos de foto.
- `sockets/socketHandler.js`: prototipo Socket.IO desactivado e incompatible con `messages.chat_id`.

## Estáticos y uploads

- `src/public/index.html`: contenido mínimo servido en `/static`.
- `src/assets`: almacenamiento de uploads servido en `/assets`. No fue leído ni modificado durante esta revisión.

## Código activo frente a código huérfano

### Activo

Todos los routers y controladores indicados como conectados, el middleware, el pool, las utilidades invocadas y el servicio FCM.

### Huérfano o desactivado

- `message.controller.js`: no tiene ruta y depende de tablas y una función que no existen en el modelo actual.
- `socketHandler.js`: no se conecta al servidor y usa `match_id` en mensajes.
- `SPEAKEASY_CONFIG.secretKeyLength`: se declara, pero `generateSecret` no recibe ese valor.
- `fcm` importado en `app.js`: fuerza inicialización, pero la variable no se usa allí.

## Archivos de mayor complejidad

| Archivo | Motivo |
| --- | --- |
| `user.controller.js` | Perfil, intereses, uploads, transacciones, filesystem, borrado y FCM. |
| `auth.controller.js` | Varios flujos de identidad, correo, JWT, cifrado y 2FA. |
| `chat.controller.js` | SQL complejo, creación de chats, historial y notificaciones. |

Son los primeros candidatos para extraer servicios y añadir tests de integración.
