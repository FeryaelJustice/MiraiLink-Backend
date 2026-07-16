# Referencia de código

Esta referencia cubre los archivos activos, la única clase propia y las funciones exportadas. Los handlers Express reciben `(req, res, next)` salvo que se indique lo contrario.

## Entry points y configuración

| Archivo | Export | Contrato |
| --- | --- | --- |
| `src/app.js` | `createApp(options)` | Crea Express sin escuchar. `options.uploadRoot` inyecta media y `enableRateLimits=false` estabiliza tests. |
| `src/app.js` | default `createApp` | Alias del factory. |
| `src/server.js` | sin exports | Valida env, crea app, escucha, configura timeouts y señales. |
| `src/config/env.js` | `parseEnv(input=process.env)` | Valida y normaliza variables; lanza `Error` con campos inválidos. |
| `src/config/firebaseAdmin.js` | `getFcm()` | Inicializa Firebase Admin y devuelve Messaging solo al primer uso. |
| `src/config/firebaseAdmin.js` | `resetFirebaseForTests()` | Limpia la referencia lazy usada por tests. |
| `src/models/db.js` | default `pool` | Instancia compartida de `pg.Pool` construida con `DB_URL`. |

## Clase de error

### `AppError extends Error`

Archivo: `src/errors/AppError.js`.

Constructor: `new AppError({ status, code, message, details, cause })`.

- `status`: HTTP, default 500.
- `code`: identificador estable, default `INTERNAL_ERROR`.
- `message`: texto seguro para cliente.
- `details`: información opcional, normalmente validación.
- `cause`: error original para encadenamiento interno.

No existen más clases propias. La aplicación se compone principalmente de funciones, routers Express y objetos Zod.

## Middleware

| Export | Archivo | Comportamiento |
| --- | --- | --- |
| `authenticateToken(allowUnverified=false)` | `auth.middleware.js` | Devuelve middleware Bearer. Comprueba blacklist, HS256, purpose, usuario y verificación. Añade `req.user` y `req.token`. |
| `requireChatMember({db}={})` | `chatMember.middleware.js` | Factory inyectable. Oculta con 404 los chats donde el usuario no es miembro. |
| `errorHandler` | `error.middleware.js` | Serializa `AppError`, errores Multer y 500 genérico. |
| `requestId` | `requestId.middleware.js` | Acepta un `x-request-id` corto o genera UUID y lo devuelve en header. |
| `validate(schemas)` | `validate.middleware.js` | Ejecuta schemas para params, query y body; reemplaza datos con resultados parseados. |
| `authLimiter` | `rateLimit.middleware.js` | 10 requests cada 15 minutos. |
| `emailLimiter` | `rateLimit.middleware.js` | 5 requests por hora. |
| `writeLimiter` | `rateLimit.middleware.js` | 30 writes por minuto. |
| `profilePhotoUpload` | `photoUpload.middleware.js` | Multer memory storage, hasta cuatro campos `photo_0` a `photo_3`. |
| `singlePhotoUpload` | `photoUpload.middleware.js` | Multer para un campo `photo`. |
| `validateUploadedImages` | `photoUpload.middleware.js` | Verifica firma y adjunta `detectedType` a cada archivo. |

Los limiters se saltan si `app.locals.enableRateLimits === false`.

## Servicios

### Tokens - `src/services/tokenService.js`

| Función | Entrada | Salida y efectos |
| --- | --- | --- |
| `createAccessToken(user)` | `{id, username}` | JWT HS256 de 24 horas, `purpose: access`. |
| `createTwoFactorChallenge(user)` | `{id}` | JWT HS256 de 5 minutos, `purpose: 2fa-login`. |
| `verifyTwoFactorChallenge(token)` | JWT | Payload válido o excepción. Rechaza otro purpose. |
| `decodeTokenExpiry(token)` | JWT sin verificar | `Date` desde `exp`; se usa al persistir revocación. |

### 2FA - `src/services/twoFactorService.js`

| Función | Contrato |
| --- | --- |
| `verifyTotp(encryptedSecret, token)` | Descifra el secreto y valida TOTP de 6 dígitos, step 30, window 1. |
| `hashRecoveryCodes(codes)` | Devuelve hashes bcrypt usando `SALT_ROUNDS`. |
| `useRecoveryCode(client, userId, candidate)` | Bloquea códigos sin usar, compara bcrypt y consume uno de forma condicional. |

### Notificaciones - `src/services/notificationService.js`

| Función | Contrato |
| --- | --- |
| `getUserFcmToken(userId)` | Devuelve token push o `null`. |
| `sendPushToToken(token, payload)` | Convierte data a strings y llama Firebase Messaging. |
| `sendChatMessageNotification(args)` | Obtiene token y nombre del sender; envía push best-effort. |

## Utilidades y DTO

| Export | Archivo | Contrato |
| --- | --- | --- |
| `encrypt(text, options)` | `cryptoUtils.js` | AES-256-GCM, nonce 12 bytes, salida `v2:nonce:tag:ciphertext`. |
| `decrypt(value, options)` | `cryptoUtils.js` | Lee v2 y, temporalmente, AES-CBC heredado con `SECRET_2FA_IV`. |
| `isLegacyEncrypted(value)` | `cryptoUtils.js` | Indica si falta prefijo `v2:`. |
| `detectImageType(buffer)` | `imageValidation.js` | Devuelve MIME/extensión de JPEG, PNG o WebP por magic bytes. |
| `validateImage(file)` | `imageValidation.js` | Comprueba firma y coincidencia MIME; lanza `AppError` 415. |
| `sendVerificationEmail(to, code)` | `mailer.js` | Inicializa Nodemailer lazy y espera `sendMail`. |
| `profileUploadRoot()` | `photoStorage.js` | Resuelve `UPLOAD_ROOT` o la ubicación lógica por defecto. |
| `stagePhoto(userId, file, root)` | `photoStorage.js` | Crea directorio, UUID y archivo staging con modo 0600. |
| `finalizePhoto(staged)` | `photoStorage.js` | Renombra staging a path final. |
| `removePhotoFile(url, root)` | `photoStorage.js` | Borra de forma segura, tolera ENOENT. |
| `cleanupStagedPhoto(staged)` | `photoStorage.js` | Elimina staging y final durante compensación. |
| `toPublicUser(row)` | `user.dto.js` | Allowlist de id, username, nickname, bio, gender y birthdate. |
| `toPublicUsers(rows)` | `user.dto.js` | Aplica el DTO a una lista. |
| `PUBLIC_USER_SQL_COLUMNS` | `user.dto.js` | Proyección SQL pública con alias `u`. |

## Controladores

### App y catálogos

| Handler | Archivo | Resultado |
| --- | --- | --- |
| `checkAndroidAppVersion` | `app.controller.js` | Política Android más reciente y cache 5 minutos. |
| `getAllAnimes` | `catalog.controller.js` | Catálogo ordenado por nombre. |
| `getAllGames` | `catalog.controller.js` | Catálogo ordenado por nombre. |

### Auth - `src/controllers/auth.controller.js`

| Handler | Responsabilidad |
| --- | --- |
| `register` | Unicidad, bcrypt, insert y access token. |
| `login` | Credenciales neutrales; access token o challenge 2FA. |
| `logout` | Inserta token y expiración en blacklist. |
| `autoLogin` | Confirma autenticación y devuelve userId. |
| `requestPasswordReset` | Respuesta neutra, reemplaza código y espera SMTP. |
| `confirmPasswordReset` | Compara hash, actualiza password y elimina tokens. |
| `checkIsVerified` | Lee flag del usuario Bearer. |
| `requestVerificationCode` | Reemplaza código del usuario autenticado. |
| `confirmVerificationCode` | Consume código y marca cuenta verificada. |
| `setup2FA` | Genera secreto, ocho recovery codes y hashes; reemplaza setup previo. |
| `verify2FA` | Valida TOTP y habilita 2FA. |
| `disable2FA` | Exige TOTP o recovery code y elimina material 2FA. |
| `check2FAStatus` | Devuelve estado del usuario Bearer. |
| `loginVerify2FALastStep` | Valida challenge y segundo factor; entrega access token. |

### Usuarios y fotos

| Handler | Archivo | Responsabilidad |
| --- | --- | --- |
| `getProfile` | `user.controller.js` | Perfil propio, email/teléfono, intereses y fotos. |
| `getProfileFromId` | `user.controller.js` | Perfil público expandido. |
| `getProfiles` | `user.controller.js` | Perfiles públicos paginados. |
| `deleteAccount` | `user.controller.js` | Soft delete y revocación actual. |
| `updateProfile` | `user.controller.js` | Perfil, intereses y fotos con transacción y compensación. |
| `deleteUserPhoto` | `user.controller.js` | Borra por posición y compacta posiciones. |
| `saveFCMToken` | `user.controller.js` | Upsert de token y plataforma. |
| `uploadPhoto` | `photo.controller.js` | Inserta/reemplaza una foto con lock y staging. |
| `getUserPhotos` | `photo.controller.js` | Fotos propias o de `query.userId`. |
| `deletePhoto` | `photo.controller.js` | Borra por UUID si pertenece al usuario y conserva al menos una. |

### Social

| Handler | Archivo | Responsabilidad |
| --- | --- | --- |
| `getFeed` | `swipe.controller.js` | Candidatos públicos paginados con extras. |
| `likeUser` | `swipe.controller.js` | Valida target, inserta like y crea match recíproco. |
| `dislikeUser` | `swipe.controller.js` | Valida target e inserta dislike. |
| `getMatches` | `match.controller.js` | Matches públicos con fotos e intereses. |
| `getUnseenMatches` | `match.controller.js` | Matches no vistos por el usuario actual. |
| `markMatchesSeen` | `match.controller.js` | Marca solo matches donde el usuario participa. |
| `reportUser` | `report.controller.js` | Inserta reporte del usuario autenticado. |
| `sendFeedback` | `feedback.controller.js` | Inserta feedback ligado al usuario. |

### Chat - `src/controllers/chat.controller.js`

| Handler | Responsabilidad |
| --- | --- |
| `getChatsFromUser` | Resúmenes, último mensaje y unread count. |
| `getMessages` | Mensajes paginados por `before`, después de guard de membresía. |
| `createPrivateChat` | Advisory lock, target válido y creación transaccional. |
| `createGroupChat` | Grupo y miembros en una transacción. |
| `getChatMembers` | Miembros públicos del chat autorizado. |
| `markChatAsRead` | Actualiza `last_read_at` del miembro actual. |
| `sendMessage` | Reusa o crea chat privado, inserta mensaje y lanza push. |
| `getChatHistory` | Historial privado filtrado por ambos miembros, sin email. |

## Schemas Zod

| Archivo | Exports |
| --- | --- |
| `common.schemas.js` | `uuid`, `shortText`, `pagination`, `chatIdParams`, `userIdParams` |
| `auth.schemas.js` | registro, login, email, reset, verificación, TOTP, 2FA y challenge |
| `chat.schemas.js` | paginación de mensajes, chat privado/grupo y envío |
| `social.schemas.js` | target, match ids, report y feedback |
| `user.schemas.js` | perfil por id, FCM, posición, photo id y query de fotos |

## Script de contrato

`collectExpressRoutes(root)` extrae method y path de los once routers. `validateContract(root)` parsea OpenAPI, exige cobertura de cada ruta activa y operationIds no duplicados. El script se ejecuta directamente con `npm run check:routes` y también se importa desde tests.
