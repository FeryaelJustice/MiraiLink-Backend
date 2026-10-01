# Ranking, geografía, likes, dislikes y match

[Guía maestra](../../guia-maestra.md) | [Mapa de funcionalidades](../funcionalidades.md)

## Responsabilidad y recorrido

El feed excluye usuario propio, eliminados y candidatos ya votados; construye filtros según scope, coordenadas frescas y país. Puntúa intereses comunes, distancia y componente aleatorio. Orden no estable implica que offset puede variar entre consultas: no prometer cursor estable.

## Alternativas y efectos

Sin coordenadas válidas, no inventar distancia cero. Ubicación activa expira a 24 h; helper JS excluye futuro mientras SQL tiene otro límite. Radio/límites dependen de plan; verificar el lugar donde se impone cada restricción. Like/dislike tiene unicidad por pareja y self CHECK. Like consulta el recíproco y guarda match con pareja ordenada; no crea chat en ese handler ni engloba ambas escrituras en una transacción. La conversación se crea por el flujo de chat. No hay FK match->chat.

No corregir consultas para satisfacer docs. SQL parametriza valores; los fragmentos dinámicos solo son seguros cuando vienen de opciones internas controladas.

## Fuentes para estudiar

- [swipe.controller.js](../../../src/controllers/swipe.controller.js)
- [match.controller.js](../../../src/controllers/match.controller.js)
- [geoSearch.js](../../../src/utils/geoSearch.js)
- [swipe.routes.js](../../../src/routes/swipe.routes.js)

Revisión: 2026-10-01, por inspección del código. Consultar [verificación](../desarrollo-y-verificacion.md) para resultados ejecutados.
