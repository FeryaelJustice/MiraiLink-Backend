# Seguridad

## Estado actual

La revisión original de julio de 2026 dio lugar al hardening implementado en esta rama. Los hallazgos P0 y P1 identificados en esa revisión tienen controles de código y regresiones automatizadas. Este documento describe el estado vigente, no el código anterior.

## Controles implementados

| Área | Control | Evidencia |
| --- | --- | --- |
| Privacidad | SQL explícito y DTO allowlist | `user.dto.test.js` |
| Revocación | Blacklist consultada sin borrar y con expiry | `auth.middleware.test.js`, migración 002 |
| Chat IDOR | Guard de membresía y filtros SQL | `chatMember.test.js` |
| Login 2FA | Challenge purpose-bound de 5 minutos | `auth.routes.test.js`, `tokenService.test.js` |
| Recovery codes | bcrypt y consumo atómico | `twoFactorService.test.js` |
| Secreto TOTP | AES-256-GCM con nonce aleatorio | `cryptoUtils.test.js` |
| Input | Zod en params, query, JSON y multipart | `validate.test.js` |
| Abuso | Rate limit en auth, correo y writes sensibles | `rateLimit.middleware.js` |
| Uploads | Tamaño, cantidad, MIME y firma real | `imageValidation.test.js` |
| Errores | Envelope estable sin stack o provider error | `error.test.js` |
| CORS y media | allowlist, no credentials, Helmet, CSP, nosniff | `app.test.js` |
| Dependencias | lockfile, audit CI y override de uuid | workflow CI |

## Cambios incompatibles

- Se retiraron `/api/user/byToken`, `/api/user/byEmailPassword` y `/api/user/public/delete-account`.
- Login con 2FA ya no entrega access token hasta completar el segundo paso.
- Verificación y status 2FA se ligan al Bearer, no a un `userId` externo.
- Recovery codes anteriores a la migración dejan de funcionar.
- Uploads que solo falsifican MIME o extensión son rechazados.

## Riesgo residual

- El store de rate limit es local al proceso.
- AES-CBC sigue disponible solo para leer secretos heredados. Debe eliminarse tras migración.
- Falta escaneo de secretos dedicado, observabilidad, readiness y respuesta operativa.
- El service account de Firebase debe proporcionarse fuera del repositorio y rotarse si alguna credencial real fue versionada históricamente.
- El filesystem local no sirve para múltiples réplicas sin volumen compartido o almacenamiento de objetos.
- La migración 002 necesita ensayo sobre datos reales y backup restaurable.

## Antes de producción

1. Rotar JWT, SMTP, Firebase y claves 2FA.
2. Ejecutar migración en clon y probar rollback o restauración.
3. Externalizar rate limit, uploads y secretos.
4. Añadir logs estructurados, métricas, alertas y readiness.
5. Forzar CI como protección de rama.
6. Ejecutar tests de concurrencia, proveedor y multipart pendientes.
