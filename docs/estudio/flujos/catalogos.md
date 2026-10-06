# Catálogos, traducciones y sincronización

[Guía maestra](../../guia-maestra.md) | [Mapa de funcionalidades](../funcionalidades.md)

## Responsabilidad y recorrido

Catalog controller ofrece anime/game, geografía y opciones de perfil. resolveCatalogLanguage recorre Accept-Language y variantes de idioma para es/en/ja con fallback es. Localización usa traducciones solicitadas y Spanish fallback; ID no cambia al cambiar idioma.

## Alternativas y efectos

Ciudad se consulta con texto dentro de región; no reutilizar country label como región ID. Media relativa necesita PUBLIC_ORIGIN u origen request correcto. Traducción ausente y elemento sin imagen requieren fallback distinto. Sync RAWG/Jikan conserva datos existentes y añade entradas/idiomas; puede copiar mismo texto en varios idiomas y capturar fallo por proveedor.

## Fuentes para estudiar

- [catalog.controller.js](../../../src/controllers/catalog.controller.js)
- [catalogLocalization.js](../../../src/utils/catalogLocalization.js)
- [geographyLocalization.js](../../../src/utils/geographyLocalization.js)
- [catalogSyncService.js](../../../src/services/catalogSyncService.js)

Revisión: 2026-10-01, por inspección del código. Consultar [verificación](../desarrollo-y-verificacion.md) para resultados ejecutados.
