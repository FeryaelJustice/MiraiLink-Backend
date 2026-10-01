# Arquitectura real del backend

[Guía maestra](../guia-maestra.md) | [Cobertura](cobertura.md)

Revisión de fuentes: 2026-10-01. Las observaciones estáticas no certifican el servidor desplegado ni el comportamiento en dispositivo.


Es un servicio HTTP Express 5 con PostgreSQL y SQL directo. [server.js](../../src/server.js) valida entorno, ejecuta migraciones fuera de test, construye Express, escucha puerto y programa sincronización externa. [app.js](../../src/app.js) permite construir la app para Supertest sin escuchar red.

## Pipeline de una petición

La app desactiva x-powered-by, configura trust proxy y aplica requestId, CORS, JSON 100 KiB, compression y helmet. Sirve recursos estáticos y monta limiter global bajo `/api`. Las rutas combinan limiter específico, autentificación, autorización de recursos y validación Zod. Los controllers coordinan SQL y proyecciones. El handler central normaliza errores, aunque algunos controllers producen respuestas directamente.

[db.js](../../src/models/db.js) es un pool compartido. Los handlers con varias escrituras usan clientes y transacciones explícitas; no hay ORM ni una capa repositorio equivalente a Android. `BEGIN/COMMIT/ROLLBACK` no vuelven transaccional un efecto SMTP o filesystem: documentar compensaciones y límites.

Los servicios compartidos separan JWT, TOTP, FCM, exploración y catálogos. `src/dto/user.dto.js` limita campos públicos; consultas y DTO son parte de la frontera de privacidad. Estar autenticado no acredita pertenencia a un chat: [chatMember.middleware.js](../../src/middleware/chatMember.middleware.js) oculta recursos ajenos con 404.

## Proceso y despliegue

Timeout request 30 s, headers 35 s y keepalive 5 s. Sincronización inicial de catálogo a los 10 s y periódica según configuración; no se ejecuta en test. shutdown cierra HTTP y cancela intervalo, pero no llama a pool.end ni guarda referencia al timeout inicial.

Rate limits y caché de recuentos viven en memoria de proceso; fotos en filesystem. Multiinstancia requiere diseño compartido antes de atribuir coherencia global. /healthz confirma respuesta del proceso, no consulta salud de PostgreSQL o SMTP.

Diagramas: [contexto/componentes/despliegue](../diagramas/arquitectura.md). Para estados de UI, leer [cliente](https://github.com/FeryaelJustice/MiraiLink/blob/codex/documentacion-integral/docs/guia-maestra.md).
