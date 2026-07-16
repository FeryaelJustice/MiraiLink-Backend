# Referencia de módulos y funciones

## Convención

El proyecto no define clases. La unidad pública de código son funciones exportadas, constantes y objetos singleton. Esta referencia cubre todos los exports observados y los helpers internos que influyen en el contrato.

Los handlers Express siguen en general la firma `async (req, res, next)`. Cuando delegan el error con `next(err)`, el fallback responde 500. Algunos handlers capturan y responden 500 directamente.

## `src/app.js`

No exporta símbolos. Construye la instancia Express, monta middleware y rutas, e invoca `app.listen`. Importar el módulo produce efectos laterales de Firebase y red.

## Controladores

### `app.controller.js`

| Función | Entrada principal | Resultado | Dependencias |
| --- | --- | --- | --- |
| `checkAndroidAppVersion` | Ninguna | Política Android más reciente y cache de 5 minutos | `app_versions` |

### `auth.controller.js`

| Función | Entrada principal | Resultado y notas |
| --- | --- | --- |
| `register` | `username`, `email`, `password` | Crea usuario email, nickname igual a username y JWT de 24 horas. Comprueba duplicado por username o email. |
| `login` | `email`, `username`, `password` | Busca por email o username, comprueba soft delete y bcrypt, y emite JWT. No aplica segundo factor. |
| `logout` | `req.token` | Inserta el JWT en blacklist si no estaba y responde éxito. |
| `autoLogin` | `req.user.id` | Devuelve el id autenticado. |
| `requestPasswordReset` | `email` | Crea código de 6 dígitos con 5 minutos de vida e inicia correo. |
| `confirmPasswordReset` | `email`, `token`, `newPassword` | Valida último código, cambia hash y elimina todos los tokens de reset del usuario. |
| `checkIsVerified` | Usuario autenticado | Devuelve `isVerified`. |
| `requestVerificationCode` | `userId`, `type` | Crea código de 15 minutos. Solo envía cuando el tipo es email. |
| `confirmVerificationCode` | `userId`, `token`, `type` | Marca cuenta verificada y elimina tokens del mismo tipo. |
| `setup2FA` | Usuario autenticado | Genera TOTP, cifra el secreto, crea cinco recovery codes y devuelve secreto y códigos. |
| `verify2FA` | `token` TOTP | Comprueba secreto almacenado y habilita `user_2fa.enabled`. |
| `disable2FA` | `code` | Acepta TOTP o recovery code, y elimina configuración y códigos. |
| `check2FAStatus` | `userId` | Devuelve el estado de `user_2fa`, sin autenticación en la ruta actual. |
| `loginVerify2FALastStep` | `userId`, `code` | Comprueba TOTP o recovery code y devuelve mensaje. No emite JWT. |

Helpers internos:

- `generateToken()`: usa `Math.random` para producir seis dígitos.
- `SPEAKEASY_CONFIG`: encoding base32, seis dígitos y paso de 30 segundos. `secretKeyLength` no se pasa al generador.

### `catalog.controller.js`

| Función | Resultado |
| --- | --- |
| `getAllAnimes` | `id`, `name`, `image_url` ordenados por nombre. |
| `getAllGames` | `id`, `name`, `image_url` ordenados por nombre. |

### `chat.controller.js`

| Función | Entrada principal | Resultado y notas |
| --- | --- | --- |
| `getChatsFromUser` | Usuario autenticado | Resúmenes, último mensaje, no leídos y destinatario privado. El filtro final omite grupos. |
| `getMessages` | `chatId`, `limit`, `before` | Mensajes ordenados de antiguo a nuevo. No valida membresía. |
| `createPrivateChat` | `otherUserId` | Devuelve chat existente como 400 o crea chat y dos miembros como 201. |
| `createGroupChat` | `name`, `userIds` | Reutiliza grupo con mismo nombre y miembros o crea uno. |
| `getChatMembers` | `chatId` | Lista id, username, nickname y rol. No valida membresía. |
| `markChatAsRead` | `chatId` | Actualiza `last_read_at` para el usuario autenticado. |
| `sendMessage` | `toUserId`, `text` | Reutiliza o crea chat privado, inserta mensaje y lanza FCM sin esperar. |
| `getChatHistory` | `userId` de la otra persona | Historial privado con DTO de sender y receiver. |

Helper interno:

- `formatUserDto(user)`: proyecta id, username, nickname, email, gender, birthdate y foto.

### `feedback.controller.js`

| Función | Entrada | Regla |
| --- | --- | --- |
| `sendFeedback` | `feedback` | Exige texto no vacío y máximo 10000 caracteres. |

### `match.controller.js`

| Función | Entrada | Resultado |
| --- | --- | --- |
| `getMatches` | Usuario autenticado | Usuarios matched con fotos e intereses. Devuelve columnas internas por `u.*`. |
| `getUnseenMatches` | Usuario autenticado | Match ids y ambos user ids no vistos por el solicitante. |
| `markMatchesSeen` | `matchIds` | Marca el lado correspondiente en cada match. |

### `message.controller.js`

| Función | Estado |
| --- | --- |
| `createMessage` | No conectada. Usa `conversation_id`, `conversation_participants`, `user_devices` y `sendNewChatMessageNotification`, ausentes en el modelo activo. Importar el archivo fallaría por el export inexistente del servicio. |

### `photo.controller.js`

| Función | Entrada | Resultado y reglas |
| --- | --- | --- |
| `uploadPhoto` | Archivo `photo`, `position` opcional | Máximo cuatro si añade sin posición. Reemplaza por posición mediante utilidad. |
| `getUserPhotos` | Query `userId` | Lista fotos del usuario solicitado. |
| `deletePhoto` | Param `photoId` | Solo propietario. Exige conservar al menos una foto y reordena posiciones. |

### `report.controller.js`

| Función | Entrada | Regla |
| --- | --- | --- |
| `reportUser` | `reportedUser`, `reason` | Exige usuario y razón recortada con al menos cinco caracteres. |

### `swipe.controller.js`

| Función | Entrada | Resultado |
| --- | --- | --- |
| `getFeed` | Query `limit`, `offset` | Usuarios no evaluados con fotos e intereses. Devuelve columnas internas por `SELECT *`. |
| `likeUser` | `toUserId` | Inserta like, crea match si existe like recíproco y devuelve flag `match`. |
| `dislikeUser` | `toUserId` | Inserta dislike idempotente. No rechaza auto-dislike. |

### `user.controller.js`

| Función | Entrada | Resultado y notas |
| --- | --- | --- |
| `getProfile` | Usuario autenticado | Perfil propio, intereses, FCM y fotos. |
| `getProfileFromId` | Body `id` | Perfil no borrado con intereses y fotos. |
| `getUserIdByToken` | Body `token` en una ruta GET | Verifica de nuevo el token recibido y devuelve id. La ruta ya exige Bearer. |
| `getUserIdByEmailAndPassword` | `email`, `password` | Pretende comprobar credenciales, pero la consulta no selecciona `password_hash`, por lo que el flujo actual puede terminar en 500. |
| `deleteAccount` | Usuario autenticado | Soft delete y blacklist del token actual. |
| `publicDeleteAccount` | `email`, `password` | Soft delete sin JWT tras comprobar password. |
| `getProfiles` | Usuario autenticado | Lista perfiles no borrados excepto el propio, con fotos e intereses. |
| `updateProfile` | Multipart con perfil, intereses y fotos | Valida parcialmente, usa transacción SQL, reemplaza fotos y limpia archivos. |
| `deleteUserPhoto` | Param `position` | Borra por posición y reordena, sin exigir conservar una foto. |
| `saveFCMToken` | `fcm`, `platform` opcional | Upsert de un token por usuario. Plataforma predeterminada android. |

Constantes internas:

- `MAX_NICKNAME_LENGTH = 30`.
- `MAX_BIO_LENGTH = 500`.
- `UPLOAD_DIR_PROFILES`: path absoluto resuelto desde el directorio de trabajo.

## Middleware

### `authenticateToken(allowUnverified = false)`

Factory que devuelve middleware async.

1. Lee `Authorization` y toma el segundo fragmento separado por espacio.
2. Exige token.
3. Busca el token en `token_blacklist`.
4. Si lo encuentra, lo elimina y responde 401.
5. Verifica firma y expiración JWT.
6. Comprueba existencia, soft delete y verificación del usuario.
7. Escribe `req.user` y `req.token`.

El borrado de blacklist es un defecto crítico, no un comportamiento deseado.

### `errorHandler(err, req, res, next)`

Registra `err.stack` y responde 500 con `{ message: 'Internal Server Error' }`. No utiliza `req` ni `next`.

## Servicios

### `notificationService.js`

| Función | Responsabilidad |
| --- | --- |
| `getUserFcmToken(userId)` | Une `users` y `push_tokens`, y devuelve token, username y nickname o null. |
| `sendPushToToken(token, payload)` | Convierte `data` a strings y llama a `fcm.send`. Captura errores sin propagarlos. |
| `sendChatMessageNotification(options)` | Obtiene destinatario y emisor, recorta texto a 60 caracteres y envía evento `chat_message`. |

El nombre del emisor depende hoy de que el emisor también tenga un token FCM, porque se reutiliza `getUserFcmToken` para obtener su perfil.

## Utilidades

### `cryptoUtils.js`

- `encrypt(text)`: AES-256-CBC a hex con clave e IV globales.
- `decrypt(encrypted)`: operación inversa.

Las variables se convierten a `Buffer` durante el import. Longitudes inválidas pueden impedir cargar el módulo.

### `dateUtils.js`

- `getCorrectNow(from)`: crea un objeto Day.js y suma dos horas.
- `normalizeBirthdate(input)`: acepta `YYYY-MM-DD`, toma la parte de fecha de ISO o intenta parsear con `Date`; devuelve string o null.

### `mailer.js`

- `sendVerificationEmail(to, code)`: construye texto y HTML y lanza `transporter.sendMail`. No devuelve ni espera la promesa del envío.

### `photoUploader.js`

- `uploadOrReplacePhoto(userId, file, position, client = db)`: busca foto previa, intenta borrar archivo, elimina registro, inserta el nuevo y devuelve la URL relativa.

## Configuración y constantes

### `models/db.js`

Export default de un `pg.Pool` configurado solo con `process.env.DB_URL`.

### `config/firebaseAdmin.js`

Importa la credencial JSON fija, llama a `firebaseAdmin.initializeApp` y exporta `fcm = firebaseAdmin.messaging()`.

### `consts/photosConsts.js`

- `UPLOAD_DIR_STRING = 'assets'`.
- `UPLOAD_DIR_IMG_STRING = 'assets/img'`.
- `UPLOAD_DIR_PROFILES_STRING = 'assets/img/profiles'`.

## Socket.IO

### `setupSocketIO(httpServer)`

Crea un servidor Socket.IO, autentica el handshake con JWT, mantiene un mapa en memoria de usuario a socket y registra:

- Entrada `send_message` con `{ matchId, text }`.
- Salida `receive_message` con remitente, texto, match y fecha.
- `disconnect` para limpiar el mapa.

No se ejecuta en el runtime actual y su SQL no coincide con el esquema. El mapa en memoria tampoco funcionaría entre varias réplicas sin un adapter compartido.
