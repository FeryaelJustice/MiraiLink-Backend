# Adenda vigente de la API

Esta adenda registra los cambios incompatibles de seguridad aplicados después de la referencia inicial.

## Autenticación y 2FA

`POST /api/auth/login` acepta email o username y password. Sin 2FA devuelve `token` y `userId`. Con 2FA no entrega token de acceso:

```json
{ "requires2FA": true, "challengeToken": "signed-jwt", "expiresIn": 300 }
```

Completa el flujo en `POST /api/auth/2fa/loginVerifyLastStep`:

```json
{ "challengeToken": "signed-jwt", "code": "123456" }
```

El código puede ser TOTP o recovery code. Un éxito devuelve `token` y `userId`. Challenge expirado, de propósito incorrecto o código inválido devuelve 401. Los recovery codes se entregan una sola vez durante setup, se almacenan como bcrypt y se consumen atómicamente.

`POST /api/auth/2fa/status`, setup, verify y disable requieren Bearer. Status ignora cualquier id externo. Verificación de cuenta también usa el usuario del Bearer. Login, registro, correo, reset y 2FA tienen rate limit y pueden responder 429 `RATE_LIMITED`.

## Validación y errores

Params UUID, paginación, longitudes, enums y bodies se validan con Zod. Un fallo devuelve 400:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "requestId": "uuid",
  "details": [{ "field": "body.email", "code": "invalid_format", "message": "..." }]
}
```

Los errores inesperados nunca incluyen stack, SQL, JWT ni objetos del proveedor. Devuelven 500 `INTERNAL_ERROR`. Todas las respuestas incluyen `x-request-id`.

## Perfiles y privacidad

Se eliminaron `/api/user/byToken`, `/api/user/byEmailPassword` y `/api/user/public/delete-account`. El id propio ya se recibe en login y autologin. El borrado requiere Bearer en `DELETE /api/user`.

Feed, matches y perfiles de terceros solo incluyen id, username, nickname, bio, gender y birthdate, más fotos e intereses. Email, teléfono, hash, flags internos y secretos no son públicos. El historial de chat aplica la misma política.

## Chats

Mensajes, miembros y read state bajo `/:chatId` requieren que el usuario autenticado pertenezca al chat. La ausencia de membresía responde como recurso no encontrado para reducir enumeración. La creación de chat y el primer mensaje son transaccionales y usan bloqueo advisory para evitar duplicados privados concurrentes.

## Archivos

Los endpoints multipart aceptan `image/jpeg`, `image/png` e `image/webp`. Se valida la firma real, no solo MIME o extensión. Máximo 5 MiB por archivo y cuatro fotos. Los nombres se generan con UUID, los writes usan staging y existe compensación ante rollback. En producción `UPLOAD_ROOT` debe apuntar fuera del checkout.

## Retirados

Socket.IO y `message.controller.js` eran prototipos desconectados e incompatibles con el esquema y se eliminaron. El chat soportado es el REST documentado.
