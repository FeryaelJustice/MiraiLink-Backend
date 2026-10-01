# Planes, derechos e intención de cancelación

[Guía maestra](../../guia-maestra.md) | [Mapa de funcionalidades](../funcionalidades.md)

## Responsabilidad y recorrido

getSubscriptionStatus calcula active/no-expired y Plus/Premium desde tabla. verifySubscription valida request y hace upsert con vencimiento NOW()+interval de base plan. El nombre verify no implica validación con Google Play: no hay llamada externa en el handler.

## Alternativas y efectos

Sin fila responde free; canceled/expired no tiene el mismo estado que active. Repetir verify puede desplazar vencimiento al recalcular desde NOW(), y token no es único entre usuarios en esquema. cancel-intent cambia auto_renewing y devuelve URL de Google Play; no cancela al proveedor.

Registrar estos límites de seguridad/facturación y no sustituirlos por afirmaciones de validación oficial.

## Fuentes para estudiar

- [subscription.controller.js](../../../src/controllers/subscription.controller.js)
- [subscription.routes.js](../../../src/routes/subscription.routes.js)
- [subscription.schemas.js](../../../src/validation/subscription.schemas.js)
- [subscriptionConsts.js](../../../src/consts/subscriptionConsts.js)

Revisión: 2026-10-01, por inspección del código. Consultar [verificación](../desarrollo-y-verificacion.md) para resultados ejecutados.
