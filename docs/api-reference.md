# API Reference

## Base y transporte

- Base local: `http://localhost:3000`.
- API: `/api`.
- Content type habitual: `application/json`.
- JSON máximo: 100 KiB.
- Identificadores: UUID, salvo ids internos no expuestos.
- No hay versionado de API en path o header.

## Autenticación

Las operaciones marcadas como Bearer requieren:

```http
Authorization: Bearer <access-token>
```

Los access tokens usan HS256, duran 24 horas y llevan `purpose: access`. Un token ausente, inválido, expirado, de otro purpose, revocado o ligado a un usuario eliminado devuelve 401. Un usuario no verificado recibe 403 en rutas que lo exigen.

## Errores comunes

| Status | Code habitual | Significado |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Body, params o query no cumplen schema |
| 401 | `TOKEN_REQUIRED`, `INVALID_TOKEN`, `TOKEN_REVOKED` | Bearer ausente o no válido |
| 403 | `ACCOUNT_UNVERIFIED`, `CORS_REJECTED` | Estado de cuenta u origin |
| 404 | `NOT_FOUND`, `USER_NOT_FOUND`, `CHAT_NOT_FOUND` | Recurso no visible |
| 409 | `ACCOUNT_EXISTS` | Conflicto de unicidad conocido |
| 415 | `INVALID_IMAGE_SIGNATURE`, `IMAGE_CONTENT_TYPE_MISMATCH` | Archivo no permitido |
| 429 | `RATE_LIMITED` | Límite temporal superado |
| 500 | `INTERNAL_ERROR` | Error inesperado sin detalles internos |

Formato:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "requestId": "uuid-or-client-id",
  "details": [
    { "field": "body.email", "code": "invalid_format", "message": "Invalid email address" }
  ]
}
```

`details` es opcional. Todas las respuestas atraviesan `x-request-id`.

## Auth

### `POST /api/auth/register`

Público, rate limit 10/15 min. Body: `username` 3-30 con letras, números, `_` o `.`, email válido y password 8-128 sin secuencias o patrones triviales. Responde 201 con `message`, `userId`, `token`. Puede devolver 409 si email o username existe.

```json
{ "username": "mirai", "email": "mirai@example.com", "password": "a-secure-password" }
```

### `POST /api/auth/login`

Público, rate limit 10/15 min. Requiere password y uno de email o username. Credenciales incorrectas y cuenta eliminada comparten 401 `INVALID_CREDENTIALS`.

Sin 2FA:

```json
{ "token": "access-jwt", "userId": "uuid" }
```

Con 2FA:

```json
{ "requires2FA": true, "challengeToken": "challenge-jwt", "expiresIn": 300 }
```

### `POST /api/auth/2fa/loginVerifyLastStep`

Público con challenge, rate limit 10/15 min. Body: `challengeToken` y `code` TOTP o recovery. Responde `token` y `userId`. Challenge expirado o purpose incorrecto devuelve 401 `INVALID_CHALLENGE`; código incorrecto, 401 `INVALID_CODE`.

### `POST /api/auth/autologin`

Bearer verificado. Sin body. Responde `userId` y `message`.

### `POST /api/auth/logout`

Bearer, permite cuenta no verificada. Inserta el JWT y su expiración en blacklist. Responde 200 con mensaje. El mismo token seguirá rechazado en intentos posteriores.

### Password reset

| Operación | Auth | Request | Success |
| --- | --- | --- | --- |
| `POST /api/auth/password/request-reset` | Público, 5/h | `{email}` | 200 neutro, exista o no la cuenta |
| `POST /api/auth/password/confirm-reset` | Público, 10/15 min | `{email, token, newPassword}` | 200; token hash válido, no expirado y password 8-128 |

El request reemplaza códigos anteriores, expira a los 5 minutos y espera al proveedor SMTP antes de responder. Confirmar elimina todos los tokens del usuario. Código inválido o expirado devuelve 400 `INVALID_CODE`.

### Verificación de cuenta

| Operación | Auth | Request | Success |
| --- | --- | --- | --- |
| `POST /api/auth/verification/request` | Bearer, no requiere cuenta verificada, 5/h | `{type: "email" | "sms"}` | 200 neutro |
| `POST /api/auth/verification/confirm` | Bearer, 10/15 min | `{type, token}` | 200 y cuenta verificada |
| `GET /api/auth/verification/check` | Bearer, acepta no verificada | Ninguno | `{isVerified: boolean}` |

El user id siempre proviene del Bearer. Email genera y envía código; SMS está admitido por contrato de datos pero no tiene proveedor de entrega implementado.

### Gestión 2FA

| Operación | Auth | Request | Success |
| --- | --- | --- | --- |
| `POST /api/auth/2fa/setup` | Bearer verificado | Ninguno | `otpauthUrl` y ocho `recoveryCodes` mostrados una vez |
| `POST /api/auth/2fa/verify` | Bearer, 10/15 min | `{token: "123456"}` | Habilita 2FA |
| `POST /api/auth/2fa/disable` | Bearer, 10/15 min | `{code}` | Deshabilita y elimina códigos |
| `POST /api/auth/2fa/status` | Bearer, acepta no verificada | Ninguno | `{enabled: boolean}` |

Setup reemplaza configuración y recovery codes previos. Disable acepta TOTP o recovery code.

## Usuario y perfiles

### `GET /api/user`

Bearer verificado. Devuelve perfil propio con id, username, nickname, email, phone number, bio, gender, birthdate, verificación, estado 2FA, timestamps, animes, games y photos. No devuelve password hash ni secreto 2FA.

### `POST /api/user/byId`

Bearer. Body `{id: UUID}`. Devuelve perfil público expandido: id, username, nickname, bio, gender, birthdate, animes, games y photos. 404 si no existe o está eliminado.

### `GET /api/users`

Bearer. Query `limit` 1-100, default 20; `offset` >= 0, default 0. Devuelve array de perfiles públicos expandidos, excluye al usuario actual.

### `PUT /api/user`

Bearer. `multipart/form-data`. Todos los campos son opcionales:

| Campo | Tipo y límites |
| --- | --- |
| `nickname` | string <= 30 |
| `bio` | string <= 500 |
| `gender` | `male`, `female`, `non_binary`, `other`, `prefer_not_to_say` o vacío |
| `birthdate` | `YYYY-MM-DD` o vacío |
| `animes`, `games` | JSON string de array `{id}`, <= 20.000 caracteres |
| `reorderedPositions` | JSON string reservado, <= 20.000 caracteres |
| `photo_0` a `photo_3` | máximo un archivo por campo |

Archivos: JPEG, PNG o WebP por MIME y firma, 5 MiB por archivo por defecto, máximo cuatro. Responde `{message: "Profile updated"}`. Perfil, intereses y registros de fotos usan transacción; archivos nuevos usan staging y compensación.

### `DELETE /api/user`

Bearer. Soft delete de la cuenta y revocación del token actual. Responde mensaje o 404.

### `POST /api/user/fcm`

Bearer. Body `fcm` string 20-4096 y `platform` `android`, `ios` o `web`, default android. Hace upsert por usuario.

### `PUT /api/user/settings/search`

Bearer. Body opcional:
- `search_radius_km`: entero 10 a 300, default 40.
- `search_scope`: `radius`, `country`, `world`, `specific_country`, default `radius`.
- `search_target_country`: código ISO 3166-1 alpha-2 (2 letras mayúsculas, ej. `ES`, `JP`, `US`) o `null`.
- `search_match_live_location`: booleano, default `false`.

### `POST /api/user/location/ping`

Bearer. Body:
- `latitude`: número -90 a 90.
- `longitude`: número -180 a 180.
- `city`: string <= 100 opcional o `null`.
- `country_code`: string <= 10 opcional o `null`.

### Fotos

| Operación | Request | Success | Errores propios |
| --- | --- | --- | --- |
| `GET /api/user/photos` | Bearer, query `userId` UUID opcional | Array ordenado; sin id usa usuario actual | 400 query inválida |
| `POST /api/user/photos` | Bearer, multipart `photo`, `position` opcional 1-4 | 201 `{url, position}` | `FILE_REQUIRED`, `PHOTO_LIMIT`, 415 |
| `DELETE /api/user/photos/{photoId}` | Bearer, UUID | Mensaje | Impide borrar la última foto; 404 si no es propia |
| `DELETE /api/user/photo/{position}` | Bearer, entero 1-4 | Mensaje y compactación | 404 si no existe |

## Descubrimiento y matches

| Operación | Request | Success |
| --- | --- | --- |
| `GET /api/swipe/feed` | Bearer; `limit` 1-100 y `offset` >= 0 | Candidatos públicos con photos, animes y games |
| `POST /api/swipe/like` | Bearer; `{toUserId: UUID}` | `{message, match}` |
| `POST /api/swipe/dislike` | Bearer; `{toUserId: UUID}` | Mensaje |
| `GET /api/match` | Bearer | Usuarios matched públicos con extras |
| `GET /api/match/unseen` | Bearer | `{id, user1_id, user2_id}[]` |
| `POST /api/match/mark-seen` | Bearer; `matchIds` array 1-100 UUID | Mensaje |

Like y dislike rechazan autoacción y target inexistente. Mark-seen solo actualiza matches donde participa el Bearer.

## Chats

Todas requieren Bearer verificado.

| Operación | Request | Success |
| --- | --- | --- |
| `GET /api/chats` | Ninguno | Resúmenes ordenados, último mensaje y unread count |
| `GET /api/chats/{chatId}/messages` | UUID; query `limit` 1-100 default 50, `before` fecha opcional | Mensajes del más antiguo al nuevo |
| `GET /api/chats/{chatId}/members` | UUID | id, username, nickname y role |
| `PATCH /api/chats/{chatId}/read` | UUID | `{success: true}` |
| `POST /api/chats/private` | `{otherUserId: UUID}` | 201 `{chatId, message}` |
| `POST /api/chats/group` | `{name: 1-100, userIds: UUID[1..99]}` | 201 `{chatId, message}` |
| `POST /api/chats/send` | `{toUserId: UUID, text: 1-4000}` | 201 `{message, chatId}` |
| `GET /api/chats/history/{userId}` | UUID | Historial con sender y receiver públicos |

Mensajes, members y read exigen membresía mediante guard. Un no miembro recibe 404 `CHAT_NOT_FOUND`. El historial filtra en SQL por el Bearer y el otro usuario. No devuelve emails.

## Catálogos y versión

| Operación | Auth | Success |
| --- | --- | --- |
| `GET /api/app/version/android` | Público | Plataforma, min/latest version code, mensaje y Play Store URL; cache 300 s |
| `GET /api/catalog/animes` | Público | `{id, name, image_url}[]` ordenado |
| `GET /api/catalog/games` | Público | `{id, name, image_url}[]` ordenado |

Versión devuelve 404 si Android no está configurado.

## Reportes y feedback

| Operación | Auth y límite | Request | Success |
| --- | --- | --- | --- |
| `POST /api/report` | Bearer, 30/min | `{reportedUser: UUID, reason: 5-2000}` | 201 o mensaje del controlador |
| `POST /api/feedback` | Bearer, 30/min | `{feedback: 1-10000}` | 201 o mensaje del controlador |

## Rutas no API

| Ruta | Uso |
| --- | --- |
| `GET /` | `{service: "mirailink-backend"}` |
| `GET /healthz` | `{status: "ok"}` de liveness, no readiness |
| `/static/*` | Archivos públicos sin índice |
| `/assets/*` | Media con CSP, `nosniff`, sin dotfiles ni índice |

## Endpoints retirados

No existen `/api/user/byToken`, `/api/user/byEmailPassword` ni `/api/user/public/delete-account`. Los clientes obtienen `userId` en login/autologin y borran la cuenta con Bearer en `DELETE /api/user`.
