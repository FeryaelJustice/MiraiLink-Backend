# Hub, feed y preferencias por categoría

[Guía maestra](../../guia-maestra.md) | [Mapa de funcionalidades](../funcionalidades.md)

## Responsabilidad y recorrido

explore.controller delega al servicio y resuelve idioma. Category filter_type aplica intereses anime/game o metas; preferencias por usuario/categoría controlan radio. El hub devuelve secciones, recuentos y etiquetas localizadas. La caché está en memoria y se invalida en rutas concretas.

## Alternativas y efectos

Categoría no existente y cero candidatos son respuestas diferentes. Recuento y feed pueden diferir por caché/estado concurrente. Cambiar radio no actualiza las preferencias globales del usuario por definición. Settings se guarda con ON CONFLICT usuario/categoría; revisar restricciones Plus antes del UPDATE.

## Fuentes para estudiar

- [explore.controller.js](../../../src/controllers/explore.controller.js)
- [explore.service.js](../../../src/services/explore.service.js)
- [explore.schemas.js](../../../src/validation/explore.schemas.js)

Revisión: 2026-10-01, por inspección del código. Consultar [verificación](../desarrollo-y-verificacion.md) para resultados ejecutados.
