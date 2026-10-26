> **Referencia de estudio actualizada (2026-10-01):** [Guía maestra](guia-maestra.md). Para el estado vigente por tema, seguir sus enlaces. Los recuentos, rutas y ejemplos históricos de este documento deben contrastarse con los routers y el contrato actual.

# Arquitectura

## Almacenamiento de fotos configurable

La fachada `photoStorage.js` conserva el modo local y usa Cloudinary como proveedor principal configurable. Se envian buffers ya validados mediante el SDK oficial; PostgreSQL guarda URL y metadatos de identidad del recurso. No existe fallback automatico al disco efimero. Las credenciales incompletas bloquean la configuracion; una caida del proveedor devuelve `PHOTO_STORAGE_UNAVAILABLE`.

La eliminacion externa queda registrada en `photo_cleanup_jobs` antes del COMMIT y se intenta despues sin convertir un error de limpieza en rollback de una foto nueva confirmada. El ID remoto previsto se registra antes de subir para recuperar resultados inciertos. Las [herramientas y procedimientos de migracion](cloudinary-storage-and-vps-migration.md) permiten volver al disco propio con archivos verificados y referencias consistentes.

## Resumen

MiraiLink Backend es un monolito modular Node.js. Se organiza por responsabilidades técnicas, conserva PostgreSQL como fuente de verdad y expone REST mediante Express 5. No implementa repositorios ni una capa de dominio separada: los controladores orquestan reglas, transacciones y SQL parametrizado.

## Arranque

`src/server.js` llama a `parseEnv()`, construye la aplicación con `createApp()` y abre el puerto. Configura timeouts HTTP y cierre ante `SIGTERM` o `SIGINT`.

`src/app.js` no escucha puertos. Esto permite importarlo desde Supertest sin arrancar Firebase, SMTP ni un proceso externo.

## Pipeline HTTP

```text
request
  -> requestId
  -> CORS allowlist
  -> JSON 100 KiB
  -> compression
  -> Helmet
  -> router de dominio
  -> rate limit, Bearer, Zod y guardas de recurso
  -> controller
  -> PostgreSQL o integración lazy
  -> response
  -> errorHandler si falla
```

`/static` sirve `src/public`. `/assets` usa la raíz inyectada, deniega dotfiles, desactiva índices y añade CSP y `nosniff`. El contenido real de `src/assets` está expresamente fuera del alcance documental.

## Dominios

| Dominio | Router | Controlador | Persistencia principal |
| --- | --- | --- | --- |
| Versión Android | `app.routes.js` | `app.controller.js` | `app_versions` |
| Auth, reset, verificación y 2FA | `auth.routes.js` | `auth.controller.js` | `users`, tokens, `user_2fa`, recovery codes, blacklist |
| Perfil y fotos | `user.routes.js`, `userphotos.routes.js`, `users.routes.js` | `user.controller.js`, `photo.controller.js` | users, interests, photos, push tokens |
| Descubrimiento | `swipe.routes.js` | `swipe.controller.js` | users, likes, dislikes |
| Matches | `match.routes.js` | `match.controller.js` | matches |
| Chat | `chat.routes.js` | `chat.controller.js` | chats, members, messages |
| Catálogos | `catalog.routes.js` | `catalog.controller.js` | animes, games |
| Moderación | `report.routes.js`, `feedback.routes.js` | controladores homónimos | reports, feedback |

## Autenticación y autorización

`authenticateToken()` exige Bearer, comprueba la blacklist sin consumirla, verifica HS256 y carga estado del usuario. Los access tokens tienen `purpose: access`.

El login con 2FA genera un JWT de cinco minutos con `purpose: 2fa-login`. Solo `loginVerify2FALastStep` puede convertirlo en access token. Los recovery codes se comparan con bcrypt y se consumen de forma transaccional.

La autenticación no autoriza por sí sola. `requireChatMember()` comprueba pertenencia antes de mensajes, miembros y read state, y las consultas de historial vuelven a filtrar por el usuario actual.

## Validación y errores

Los schemas de `src/validation` parsean body, params y query. `validate()` sustituye la sección original por el valor normalizado. `AppError` representa errores operativos y `errorHandler` evita filtrar stacks u objetos de proveedores.

## Privacidad

`src/dto/user.dto.js` define campos públicos y una proyección SQL compartida. Feed, matches y perfiles públicos no devuelven email, teléfono, password hash, secretos 2FA ni flags internos.

## Archivos

Multer usa memoria acotada. `validateImage()` inspecciona firmas JPEG, PNG y WebP. `photoStorage.js` genera identificadores UUID y permite subir a Cloudinary o escribir en staging local. Los controladores coordinan compensaciones y transacciones SQL; el borrado anterior se registra y se intenta despues del commit, una vez liberada la conexion del handler.

## Integraciones

- PostgreSQL: pool único en `src/models/db.js`.
- SMTP: transporter lazy en `src/utils/mailer.js`.
- Firebase: app y messaging lazy en `src/config/firebaseAdmin.js`.
- Notificaciones: `notificationService.js`; el fallo push no revierte un mensaje ya confirmado.

## CI

`.github/workflows/ci.yml` usa Node.js 22 y PostgreSQL 16. Ejecuta instalación reproducible, lint, cobertura, esquema, contrato y audit. No contiene despliegue ni permisos de escritura.

## Deuda técnica

- Controladores con SQL y reglas siguen siendo amplios y difíciles de aislar.
- Rate limiting en memoria no coordina réplicas.
- El health check no comprueba PostgreSQL ni proveedores.
- Falta observabilidad estructurada y un sistema formal de migraciones.
- La entrega de media local requiere almacenamiento persistente compartido antes de escalar horizontalmente.
