# Matriz de cobertura y trazabilidad

[Guía maestra](../guia-maestra.md) | [Cobertura](cobertura.md)

Revisión de fuentes: 2026-10-01. Las observaciones estáticas no certifican el servidor desplegado ni el comportamiento en dispositivo.


| Área | Documento | Fuentes y límites |
| --- | --- | --- |
| Registro, login, verificación, reset y 2FA | [Recorrido](flujos/acceso.md) | [auth.routes.js](../../src/routes/auth.routes.js), [auth.controller.js](../../src/controllers/auth.controller.js), [tokenService.js](../../src/services/tokenService.js), [twoFactorService.js](../../src/services/twoFactorService.js) |
| Perfil, atributos, geografía y fotos | [Recorrido](flujos/perfil.md) | [user.routes.js](../../src/routes/user.routes.js), [user.controller.js](../../src/controllers/user.controller.js), [photo.controller.js](../../src/controllers/photo.controller.js), [photoStorage.js](../../src/utils/photoStorage.js) |
| Ranking, geografía, likes, dislikes y match | [Recorrido](flujos/descubrimiento.md) | [swipe.controller.js](../../src/controllers/swipe.controller.js), [match.controller.js](../../src/controllers/match.controller.js), [geoSearch.js](../../src/utils/geoSearch.js), [swipe.routes.js](../../src/routes/swipe.routes.js) |
| Hub, feed y preferencias por categoría | [Recorrido](flujos/exploracion.md) | [explore.controller.js](../../src/controllers/explore.controller.js), [explore.service.js](../../src/services/explore.service.js), [explore.schemas.js](../../src/validation/explore.schemas.js) |
| Conversaciones, mensajes, lectura y FCM | [Recorrido](flujos/chat.md) | [chat.routes.js](../../src/routes/chat.routes.js), [chat.controller.js](../../src/controllers/chat.controller.js), [chatMember.middleware.js](../../src/middleware/chatMember.middleware.js), [notificationService.js](../../src/services/notificationService.js) |
| Catálogos, traducciones y sincronización | [Recorrido](flujos/catalogos.md) | [catalog.controller.js](../../src/controllers/catalog.controller.js), [catalogLocalization.js](../../src/utils/catalogLocalization.js), [geographyLocalization.js](../../src/utils/geographyLocalization.js), [catalogSyncService.js](../../src/services/catalogSyncService.js) |
| Planes, derechos e intención de cancelación | [Recorrido](flujos/suscripciones.md) | [subscription.controller.js](../../src/controllers/subscription.controller.js), [subscription.routes.js](../../src/routes/subscription.routes.js), [subscription.schemas.js](../../src/validation/subscription.schemas.js), [subscriptionConsts.js](../../src/consts/subscriptionConsts.js) |
| Reportes, feedback, push tokens y versión | [Recorrido](flujos/soporte.md) | [report.controller.js](../../src/controllers/report.controller.js), [feedback.controller.js](../../src/controllers/feedback.controller.js), [app.controller.js](../../src/controllers/app.controller.js), [user.controller.js](../../src/controllers/user.controller.js) |
| Tecnologías y versiones | [Tecnologías](tecnologias.md) | Catálogo/build o package.json; declaraciones, no despliegue |
| Arquitectura y consumidores | [Arquitectura](arquitectura.md), [referencia](referencia-codigo.md) | Fuentes propias versionadas; extractor estático con límites |
| Configuración | [Semántica](configuracion.md), [lectores](lectores-configuracion.md) | Esquemas y consumidores sin secretos |
| Seguridad | [Seguridad](autenticacion-y-seguridad.md) | Contratos, hashes/cifrado y autorización por propietario |
| Errores y casos alternativos | [Errores](ciclo-de-vida-y-errores.md) | Guards, callbacks, cancelación y resultados reales |
| Servicios externos | [Integraciones](integraciones.md) | Sin certificar proveedores ni entrega |
| Persistencia | [Modelo](base-de-datos.md), [diccionario](diccionario-esquema.md), [DDL](ddl-referencia.md) | Baseline, migraciones y schema_migrations; no datos reales |
| Diagramas | [Índice](../diagramas/indice.md) | Tipo, ubicación y fuente por vista |
| Estado de validación | [Verificación](desarrollo-y-verificacion.md) | Resultados con límites y fecha |

## Cobertura de archivos

La [referencia navegable](referencia-codigo.md) enumera todas las fuentes propias Kotlin o JavaScript del inventario versionado y muestra declaraciones, dependencias importadas y consumidores detectados. El extractor no resuelve reflexión, DI, lambdas ni dispatch dinámico; los documentos temáticos explican el recorrido real de los dominios. Esta referencia complementa comentarios explicativos, no los sustituye.

Quedan fuera dependencias, binarios, código generado y archivos privados. src/assets está expresamente excluido de lectura e inventario. No afirmar cobertura de pruebas del 100% por enumerar todos los archivos.


## Cierre de verificación

[Comentarios comparados](comentarios-verificados.md) y [resultados ejecutados](desarrollo-y-verificacion.md). La cobertura documental no implica cobertura completa de pruebas ni verificación de producción.
