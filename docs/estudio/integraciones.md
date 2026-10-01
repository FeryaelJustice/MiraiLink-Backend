# SMTP, FCM, catálogos y almacenamiento

[Guía maestra](../guia-maestra.md) | [Cobertura](cobertura.md)

Revisión de fuentes: 2026-10-01. Las observaciones estáticas no certifican el servidor desplegado ni el comportamiento en dispositivo.


[mailer.js](../../src/utils/mailer.js) construye HTML y texto de verificación/reset, URLs web y esquema mirailink. Sin credenciales SMTP devuelve simulated=true e imprime código/destinatario/enlaces. Si falla SMTP, captura el fallo y simula; los handlers no convierten ese resultado en garantía de entrega. Es un límite operativo y de privacidad, también en producción si falta configuración.

[firebaseAdmin.js](../../src/config/firebaseAdmin.js) carga service account de forma lazy y memoriza la Promise de Messaging. [notificationService.js](../../src/services/notificationService.js) obtiene el token del usuario, construye payload FCM y captura fallo al enviar. Mensaje confirmado en DB puede no producir notificación; los handlers de chat responden antes del envío asíncrono.

[catalogSyncService.js](../../src/services/catalogSyncService.js) procesa RAWG y Jikan por separado; busca entradas por catalog_key o nombre normalizado, rellena imágenes faltantes e inserta traducciones iniciales para idiomas existentes. No es una traducción automática certificada: puede copiar el mismo texto a varios idiomas. Error de un proveedor se captura y se continúa con el otro; una respuesta de resumen no garantiza éxito completo.

[import-geography.js](../../scripts/import-geography.js) importa datos GeoNames; seed lo ejecuta antes de los perfiles demo del servidor. Estas operaciones modifican la DB y no son necesarias para generar documentación. scripts sync/reset también deben tratarse como operación explícita.

[photoStorage.js](../../src/utils/photoStorage.js) crea staging con UUID, escritura exclusiva y permisos 0600, después promueve con rename. [app.js](../../src/app.js) sirve perfiles desde la raíz elegida y bloquea dotfiles. Media usa URLs públicas normalizadas por catalogLocalization; PUBLIC_ORIGIN puede ser necesario detrás de proxy.

No hay comunicación con Google Play Developer API en el handler de verifySubscription revisado. Tampoco se instala un servidor Socket.IO en app/server. Documentar contratos HTTP existentes y enlazar la [implementación del cliente](https://github.com/FeryaelJustice/MiraiLink/blob/codex/documentacion-integral/docs/estudio/integraciones.md) para el consumo.
