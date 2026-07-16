# Referencia de API

## Propósito

Referencia del contrato observado en las rutas y controladores actuales. Incluye anomalías conocidas para evitar que un cliente dependa por accidente de un defecto. La versión procesable está en [openapi.yaml](openapi.yaml).

## Base URL y formatos

- Desarrollo: `http://localhost:3000`.
- Prefijo principal: `/api`.
- JSON: `Content-Type: application/json`.
- Uploads: `multipart/form-data`.
- UUID: string con formato UUID.
- JWT protegido: `Authorization: Bearer <token>`.

No existe versionado de API en el path ni en headers.

## Autenticación y errores comunes

Todas las rutas marcadas como protegidas pueden responder:

| Estado | Body habitual | Motivo |
| ---: | --- | --- |
| 401 | `{ "message": "No token provided" }` | Falta Bearer token. |
| 401 | `{ "message": "Invalid token", "error": {} }` | Firma, expiración o formato inválido. |
| 401 | `{ "message": "Token has been invalidated" }` | Token encontrado en blacklist. El código actual lo elimina después. |
| 403 | `{ "message": "Cuenta no verificada", "verified": false }` | Cuenta pendiente de verificación. |
| 404 | `{ "message": "Usuario no encontrado" }` | Usuario borrado o inexistente. |
| 500 | `{ "message": "Internal Server Error" }` | Error delegado al middleware global. |

Las respuestas de error no están normalizadas. Algunos controladores devuelven otros mensajes, códigos o texto plano.

## Modelos observados

### CatalogItem

```json
{
  "id": "uuid",
  "name": "Nombre",
  "image_url": "https://example.com/image.jpg"
}
```

### Photo

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "url": "assets/img/profiles/<userId>/<file>",
  "position": 1
}
```

### Perfil proyectado

Los endpoints seguros deberían limitarse a:

```json
{
  "id": "uuid",
  "username": "user",
  "nickname": "Nick",
  "bio": "Texto",
  "gender": "prefer_not_to_say",
  "birthdate": "2000-01-31",
  "is_verified": true,
  "two_fa_enabled": false,
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "is_deleted": false,
  "photos": [],
  "animes": [],
  "games": []
}
```

Advertencia: feed y matches devuelven hoy columnas completas de `users`, que pueden incluir `password_hash`, email, teléfono y secretos internos. Es un defecto P0. Esos campos no son contrato para clientes y deben eliminarse del servidor.

## Sistema

### `GET /`

- Auth: no.
- Response 200: texto plano `Hello, World!`.
- Response 404: no aplica a esta ruta.

### `GET /api/app/version/android`

- Auth: no.
- Request: sin parámetros.
- Response 200 y header `Cache-Control: public, max-age=300`:

```json
{
  "platform": "android",
  "minVersionCode": 1,
  "latestVersionCode": 2,
  "message": "Actualiza la aplicación",
  "playStoreUrl": "https://play.google.com/store/apps/details?id=..."
}
```

- 404: `{ "message": "Not configured" }`.
- 500: error de PostgreSQL.

## Autenticación

### `POST /api/auth/register`

- Auth: no.
- Body JSON: `username`, `email`, `password`.
- Validación real: solo comprueba que username o email no existan. No valida presencia, formato ni fortaleza antes de SQL o bcrypt.
- 201: `{ "message": "User created", "token": "jwt" }`.
- 409: `{ "message": "User already exists" }`.
- 500: input ausente o inválido, error SQL o configuración bcrypt/JWT.

### `POST /api/auth/login`

- Auth: no.
- Body JSON: `email` o `username`, y `password`.
- 200: `{ "token": "jwt" }`.
- 401: `User not found` o `Invalid credentials`.
- 403: `{ "message": "Account has been deleted", "code": "USER_DELETED" }`.
- 500: error interno.
- Nota: emite el JWT antes de aplicar 2FA, incluso si está habilitado.

### `POST /api/auth/autologin`

- Auth: Bearer, cuenta verificada.
- Body: ninguno.
- 200: `{ "userId": "uuid", "message": "Autenticado correctamente" }`.
- Errores comunes de autenticación y 500.

### `POST /api/auth/logout`

- Auth: Bearer. Permite cuenta no verificada.
- 200: `{ "message": "Logged out successfully" }`.
- 400: `No token provided`, aunque el middleware normalmente lo intercepta como 401.
- Errores comunes y 500.
- Nota crítica: la siguiente petición con un token blacklisted lo elimina de la tabla, por lo que intentos posteriores pueden volver a aceptarlo.

### `POST /api/auth/password/request-reset`

- Auth: no.
- Body: `{ "email": "user@example.com" }`.
- 200: `{ "message": "Código de recuperación enviado" }`.
- 404: `Usuario no encontrado`.
- 500: error SQL o de configuración. El fallo asíncrono de entrega SMTP puede ocurrir después del 200.

### `POST /api/auth/password/confirm-reset`

- Auth: no.
- Body: `email`, `token` de seis dígitos, `newPassword`.
- 200: `{ "message": "Contraseña actualizada correctamente" }`.
- 400: `Código inválido` o `Código expirado`.
- 404: `Usuario no encontrado`.
- 500: bcrypt, SQL o input inválido.

### `POST /api/auth/verification/request`

- Auth: no.
- Body: `{ "userId": "uuid", "type": "email" }` o tipo `sms`.
- 200: `{ "message": "Código de verificación enviado" }`.
- 400: `Tipo inválido`.
- 404: `Usuario no encontrado o ya verificado`.
- 500: error interno.
- Nota: `sms` se acepta y guarda, pero no existe envío SMS.

### `POST /api/auth/verification/confirm`

- Auth: no.
- Body: `userId`, `token`, `type`.
- 200: `{ "message": "Cuenta verificada correctamente" }`.
- 400: `Código inválido` o `Código expirado`.
- 404: `Usuario no encontrado o ya verificado`.
- 500: error interno.

### `GET /api/auth/verification/check`

- Auth: Bearer, cuenta verificada según middleware.
- 200: `{ "isVerified": true }`.
- 404: `Usuario no encontrado`.
- Errores comunes y 500.
- Nota: por la configuración actual, una cuenta no verificada recibe 403 antes de poder consultar su estado.

### `POST /api/auth/2fa/setup`

- Auth: Bearer, cuenta verificada.
- Body: ninguno.
- 200:

```json
{
  "otpauth_url": "otpauth://totp/...",
  "recovery_codes": ["code1", "code2", "code3", "code4", "code5"],
  "base32": "TOTPSECRET"
}
```

- Errores comunes y 500.
- Nota: repetir setup acumula recovery codes anteriores hasta disable.

### `POST /api/auth/2fa/verify`

- Auth: Bearer, cuenta verificada.
- Body: `{ "token": "123456" }`.
- 200: `{ "message": "2FA habilitado correctamente" }`.
- 400: `Código inválido`.
- 404: `2FA no configurado`.
- Errores comunes y 500.

### `POST /api/auth/2fa/disable`

- Auth: Bearer, cuenta verificada.
- Body: `{ "code": "TOTP-o-recovery-code" }`.
- 200: `{ "message": "2FA desactivado correctamente" }`.
- 400: falta código o 2FA no activo.
- 401: código inválido.
- Errores comunes y 500.

### `POST /api/auth/2fa/status`

- Auth: no.
- Body: `{ "userId": "uuid" }`.
- 200: `{ "enabled": true }` o false.
- 500: error interno.
- Riesgo: permite consultar el estado de otro usuario y no está ligado a un challenge.

### `POST /api/auth/2fa/loginVerifyLastStep`

- Auth: no.
- Body: `{ "userId": "uuid", "code": "..." }`.
- 200: `{ "message": "2FA verificado correctamente" }`.
- 400: `2FA no requerido` o `Código inválido`.
- 500: error interno.
- Nota: no devuelve JWT ni modifica un challenge de login.

## Perfil y usuarios

### `GET /api/user`

- Auth: Bearer.
- 200: perfil propio con `animes`, `games`, `photos` y `fcm_token`.
- Errores comunes y 500.

### `GET /api/user/byToken`

- Auth: Bearer.
- Body GET no estándar: `{ "token": "jwt" }`.
- 200: `{ "userId": "uuid" }`.
- 500: token del body ausente o inválido.
- Nota: ignora el id ya validado en `req.user` y verifica un segundo token recibido en el body.

### `POST /api/user/byEmailPassword`

- Auth: no.
- Body: `email`, `password`.
- 401: usuario inexistente.
- 200 previsto: `{ "userId": "uuid" }`.
- Comportamiento actual para usuario existente: normalmente 500, porque la consulta no selecciona `password_hash` y bcrypt recibe `undefined`.

### `POST /api/user/byId`

- Auth: Bearer.
- Body: `{ "id": "uuid" }`.
- 200: perfil solicitado con fotos e intereses.
- Si el usuario no existe, puede devolver 200 con solo arrays vacíos, no 404.
- Errores comunes y 500.

### `POST /api/user/public/delete-account`

- Auth: no.
- Body: `email`, `password`.
- 200: `{ "message": "Cuenta eliminada correctamente." }`.
- 401: `Contraseña incorrecta.`.
- 404: `Usuario no encontrado o ya eliminado.`.
- 500: `{ "message": "Error interno del servidor." }`.

### `POST /api/user/fcm`

- Auth: Bearer.
- Body: `fcm` requerido por la base, `platform` opcional con default `android`.
- Plataformas SQL válidas: `android`, `ios`, `web`.
- 200: `{ "message": "FCM token saved" }`.
- Errores comunes y 500.

### `PUT /api/user`

- Auth: Bearer.
- Content-Type: `multipart/form-data`.
- Campos de texto:

| Campo | Formato actual | Regla |
| --- | --- | --- |
| `nickname` | string | Máximo 30. Ausente se guarda como vacío. |
| `bio` | string | Máximo 500. Ausente se guarda como vacío. |
| `gender` | string | `male`, `female`, `non_binary`, `other`, `prefer_not_to_say` o vacío. |
| `birthdate` | string | `YYYY-MM-DD` o ISO. No futura. Ausente termina como null. |
| `animes` | string JSON | Array de objetos con `id`. Default `[]`. |
| `games` | string JSON | Array de objetos con `id`. Default `[]`. |
| `reorderedPositions` | string JSON | Array de `{ "url": "...", "position": 1 }`. Error de parse solo se registra. |

- Archivos: `photo_0`, `photo_1`, `photo_2`, `photo_3`, uno por campo. Se mapean a posiciones 1 a 4.
- 200: `{ "message": "Profile updated" }`.
- 400: nickname o bio largos, género o fecha inválidos, fecha futura o más de cuatro fotos.
- Errores comunes y 500.
- Nota: no hay límite de bytes ni filtro MIME.

### `DELETE /api/user`

- Auth: Bearer.
- 200: `{ "message": "Cuenta eliminada correctamente." }`.
- 404: usuario no encontrado o ya eliminado.
- 500: `{ "message": "Error al eliminar cuenta." }`.

### `DELETE /api/user/photo/{position}`

- Auth: Bearer.
- Path `position`: entero de 1 a 4.
- 200: `{ "message": "Foto eliminada correctamente" }`.
- 400: `Posición inválida`.
- 404: `Foto no encontrada`, con `shouldLogout: false`.
- 500: `Error al eliminar la foto`.

### `GET /api/users`

- Auth: Bearer.
- 200: array de otros perfiles no borrados, con fotos e intereses.
- No hay paginación.
- Errores comunes y 500.

## Fotos

### `GET /api/user/photos`

- Auth: Bearer.
- Query: `userId` UUID. No usa automáticamente el usuario autenticado.
- 200: array de Photo ordenado por posición.
- Sin `userId` normalmente devuelve array vacío.
- Errores comunes y 500.

### `POST /api/user/photos`

- Auth: Bearer.
- Content-Type: `multipart/form-data`.
- Archivo: campo `photo`, obligatorio.
- Campo `position`: entero opcional. Si falta, añade después de la última foto.
- 201: `{ "url": "assets/img/profiles/..." }`.
- 400: `No file uploaded` o `Maximum 4 photos allowed`.
- Errores comunes y 500.
- Nota: una posición fuera de 1 a 4 llega a la base y puede producir 500.

### `DELETE /api/user/photos/{photoId}`

- Auth: Bearer y propietario de la foto.
- 200: `{ "message": "Photo deleted" }`.
- 400: `At least one photo is required`.
- 404: `Photo not found`, con `shouldLogout: false`.
- Errores comunes y 500.

## Catálogos

### `GET /api/catalog/animes`

- Auth: no.
- 200: array de CatalogItem ordenado por nombre.
- 500: error PostgreSQL.

### `GET /api/catalog/games`

- Auth: no.
- 200: array de CatalogItem ordenado por nombre.
- 500: error PostgreSQL.

## Descubrimiento

### `GET /api/swipe/feed`

- Auth: Bearer.
- Query: `limit` default 10 y `offset` default 0.
- 200: usuarios no evaluados, de más nuevos a más antiguos, con fotos e intereses.
- Errores comunes y 500.
- Riesgo P0: devuelve columnas internas de `users` por `SELECT *`.

### `POST /api/swipe/like`

- Auth: Bearer.
- Body: `{ "toUserId": "uuid" }`.
- 200: `{ "message": "Liked", "match": false }`. `match` será true si existe like recíproco.
- 400: `No puedes hacer like a ti mismo`.
- Errores comunes y 500.

### `POST /api/swipe/dislike`

- Auth: Bearer.
- Body: `{ "toUserId": "uuid" }`.
- 200: `{ "message": "Disliked" }`.
- Errores comunes y 500.
- Nota: no impide auto-dislike.

## Matches

### `GET /api/match`

- Auth: Bearer.
- 200: perfiles matched con fotos e intereses.
- Errores comunes y 500.
- Riesgo P0: devuelve todas las columnas de `users`.

### `GET /api/match/unseen`

- Auth: Bearer.
- 200: array de `{ "id": "matchId", "user1_id": "uuid", "user2_id": "uuid" }`.
- Errores comunes y 500.

### `POST /api/match/mark-seen`

- Auth: Bearer.
- Body: `{ "matchIds": ["uuid"] }`.
- 200: `{ "message": "Marked as seen" }`.
- 500: `matchIds` ausente o no iterable, además de error SQL.
- Nota: ids que no pertenecen al usuario simplemente no cambian flags.

## Chats

### `GET /api/chats`

- Auth: Bearer.
- 200: array de resúmenes con `chat_id`, tipo, nombre, rol, último mensaje, `unread_count` y `destinatary`.
- Errores comunes y 500.
- Defecto actual: el filtro final elimina chats de grupo y chats privados sin destinatario activo.

### `GET /api/chats/{chatId}/messages`

- Auth: Bearer.
- Query: `limit` default 50, `before` timestamp opcional.
- 200 previsto: mensajes de antiguo a nuevo.
- Comportamiento actual: sin `before`, la consulta usa `LIMIT $3` pero solo envía dos parámetros, por lo que normalmente responde 500. Con `before` se envían tres parámetros.
- Riesgo P0: no comprueba membresía del chat.

### `GET /api/chats/{chatId}/members`

- Auth: Bearer.
- 200: array de `{ id, username, nickname, role }`.
- Errores comunes y 500.
- Riesgo P0: no comprueba membresía del solicitante.

### `PATCH /api/chats/{chatId}/read`

- Auth: Bearer.
- 200: `{ "success": true }`, incluso si no se actualizó ninguna fila.
- Errores comunes y 500.

### `POST /api/chats/private`

- Auth: Bearer.
- Body: `{ "otherUserId": "uuid" }`.
- 201: `{ "chatId": "uuid", "message": "Chat privado creado" }`.
- 400: auto-chat o chat ya existente. El existente incluye `chatId`.
- 500: input ausente, usuario inválido o error SQL.

### `POST /api/chats/group`

- Auth: Bearer.
- Body: `{ "name": "Grupo", "userIds": ["uuid"] }`.
- 200: grupo con mismo nombre y mismos miembros ya existente.
- 201: grupo creado.
- Response: `{ "chatId": "uuid", "message": "..." }`.
- 500: `userIds` ausente o no array, duplicados, usuarios inválidos o error SQL.

### `POST /api/chats/send`

- Auth: Bearer.
- Body: `{ "toUserId": "uuid", "text": "Mensaje" }`.
- 201: `{ "message": "Mensaje enviado", "chatId": "uuid" }`.
- Errores comunes y 500.
- Crea chat privado si no existe. No valida longitud, texto vacío, match previo ni receptor antes de SQL. El push FCM es best effort posterior al response.

### `GET /api/chats/history/{userId}`

- Auth: Bearer.
- Path `userId`: la otra persona.
- 200: array vacío si no hay chat, o mensajes con `id`, `content`, `timestamp`, `sender` y `receiver`.
- Cada user DTO incluye id, username, nickname, email, gender, birthdate y `profile_photo`.
- Errores comunes y 500.
- Nota de privacidad: devuelve email de ambos participantes.

## Reportes y feedback

### `POST /api/report`

- Auth: Bearer.
- Body: `{ "reportedUser": "uuid", "reason": "Razón de al menos cinco caracteres" }`.
- 201: `{ "message": "Usuario reportado correctamente" }`.
- 400: usuario o razón ausente, o razón menor de cinco caracteres tras trim.
- Errores comunes y 500.

### `POST /api/feedback`

- Auth: Bearer.
- Body: `{ "feedback": "Texto" }`.
- 201: `{ "message": "Feedback enviado correctamente." }`.
- 400: vacío o más de 10000 caracteres.
- Errores comunes y 500.

## Media

Las URLs guardadas tienen forma relativa `assets/img/profiles/...`. El servidor monta el directorio como `/assets`, así que un cliente normalmente construirá:

```text
http://localhost:3000/assets/img/profiles/<userId>/<filename>
```

El backend no devuelve una URL base ni transforma el path. El consumidor debe configurarla por entorno. No debe asumir que el almacenamiento seguirá siendo local.

## 404 global

Cualquier path no reconocido responde 404 con texto plano:

```text
Sorry can't find that!
```

No se devuelve JSON ni código de error estable.

## Compatibilidad para clientes

Hasta estabilizar el contrato:

- Ignorar propiedades desconocidas.
- No depender de campos internos filtrados por error.
- Tratar errores tanto como JSON como texto.
- Configurar timeout y reintentos solo en operaciones idempotentes.
- No reintentar automáticamente uploads, likes, mensajes o reportes sin idempotency key.
- Generar clientes desde OpenAPI solo después de revisar las notas `x-current-issue` de la especificación.
