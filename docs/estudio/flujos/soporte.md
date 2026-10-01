# Reportes, feedback, push tokens y versión

[Guía maestra](../../guia-maestra.md) | [Mapa de funcionalidades](../funcionalidades.md)

## Responsabilidad y recorrido

Report y feedback autentican, validan y guardan texto. FK SET NULL conserva registros ante borrado físico; account deletion observado es lógico. App controller consulta configuración Android en app_versions: versión mínima y última son distintas decisiones de compatibilidad.

## Alternativas y efectos

Self-report lo impide constraint cuando ambas identidades están presentes. Texto largo produce validación/error; no existe un panel de moderación por registrar una denuncia. SaveFCMToken hace upsert por userId, reemplazando el token previo: no es registro multidispositivo. Versión sin fila/configuración debe seguir respuesta real y cliente no debe inventar versión obligatoria.

## Fuentes para estudiar

- [report.controller.js](../../../src/controllers/report.controller.js)
- [feedback.controller.js](../../../src/controllers/feedback.controller.js)
- [app.controller.js](../../../src/controllers/app.controller.js)
- [user.controller.js](../../../src/controllers/user.controller.js)

Revisión: 2026-10-01, por inspección del código. Consultar [verificación](../desarrollo-y-verificacion.md) para resultados ejecutados.
