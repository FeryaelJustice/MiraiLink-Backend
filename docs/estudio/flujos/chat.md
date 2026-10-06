# Conversaciones, mensajes, lectura y FCM

[Guía maestra](../../guia-maestra.md) | [Mapa de funcionalidades](../funcionalidades.md)

## Responsabilidad y recorrido

Lista conversaciones por pertenencia, calcula último mensaje con LATERAL y unread desde last_read_at. getMessages página por before/limit y revierte orden para respuesta. Private chat usa advisory lock por pareja ordenada y recupera el existente o crea chat/members.

## Alternativas y efectos

requireChatMember protege rutas por chatId y devuelve 404 ajeno. history por userId consulta membership de ambos y no página en el handler revisado. sendMessage escribe en transacción, responde 201 y después solicita FCM sin bloquear respuesta. No exige match previo en el handler.

Grupo crea miembros de una lista sin implementar por sí solo UI grupal. markChatAsRead actualiza marca temporal de miembro, no cambia todos los messages.is_read. Timeout después del commit puede repetir mensaje: sin client message ID no existe deduplicación general.

## Fuentes para estudiar

- [chat.routes.js](../../../src/routes/chat.routes.js)
- [chat.controller.js](../../../src/controllers/chat.controller.js)
- [chatMember.middleware.js](../../../src/middleware/chatMember.middleware.js)
- [notificationService.js](../../../src/services/notificationService.js)

Revisión: 2026-10-01, por inspección del código. Consultar [verificación](../desarrollo-y-verificacion.md) para resultados ejecutados.

## Comprobación cruzada del receptor

El payload remitido al cliente debe revisarse también en su [recorrido FCM](https://github.com/FeryaelJustice/MiraiLink/blob/codex/documentacion-integral/docs/estudio/flujos/notificaciones.md). La aceptación del envío por Firebase no acredita presentación ni apertura del chat en Android. Los detalles de canal, PendingIntent y permisos son responsabilidad del cliente.
