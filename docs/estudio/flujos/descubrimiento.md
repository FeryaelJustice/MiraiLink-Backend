# Ranking, geografía, likes, dislikes y match

[Guía maestra](../../guia-maestra.md) | [Mapa de funcionalidades](../funcionalidades.md)

## Responsabilidad y recorrido

El feed excluye usuario propio, eliminados y candidatos ya votados; construye filtros según scope, coordenadas frescas y país. Puntúa intereses comunes, distancia y componente aleatorio. Orden no estable implica que offset puede variar entre consultas: no prometer cursor estable.

## Alternativas y efectos

Sin coordenadas válidas, no inventar distancia cero. Ubicación activa expira a 24 h; helper JS excluye futuro mientras SQL tiene otro límite. Radio/límites dependen de plan; verificar el lugar donde se impone cada restricción. Like/dislike tiene unicidad por pareja y self CHECK. Like consulta el recíproco y guarda match con pareja ordenada; no crea chat en ese handler ni engloba ambas escrituras en una transacción. La conversación se crea por el flujo de chat. No hay FK match->chat.

No corregir consultas para satisfacer docs. SQL parametriza valores; los fragmentos dinámicos solo son seguros cuando vienen de opciones internas controladas.

## Sistema de Deshacer (Undo Swipe) y Cuotas por Nivel

El endpoint `POST /api/swipe/undo` revierte el último voto (like o dislike) del usuario dentro de una transacción atómica:
- Si el voto deshecho era un `like`, elimina el registro de `likes` y cualquier `matches` mutuo correspondiente.
- Si era un `dislike`, elimina el registro de `dislikes`.
- Registra el evento en `user_swipe_undos` con marca temporal UTC.
- Devuelve el DTO completo del usuario restaurado para que la app cliente reconstruya la tarjeta en Discovery.

### Cuotas Diarias y Ventana Deslizante
Las cuotas están definidas en `UNDO_DAILY_LIMITS`:
- **Free**: 1 deshacer por día.
- **Plus**: 3 deshaceres por día.
- **Premium**: 6 deshaceres por día.

La ventana se evalúa de manera deslizante (`created_at >= NOW() - INTERVAL '24 hours'`). El endpoint `GET /api/swipe/undo-quota` informa la cuota consumida, remanente, timestamp de expiración del próximo uso (`resetsAt`) y si el usuario tiene votos reversibles (`hasUndoableSwipe`).

## Integridad Temporal y Timezones (TIMESTAMPTZ)
Todas las columnas de fecha/hora de la base de datos se migraron a `TIMESTAMPTZ` (migración `010_timezone_and_swipe_undo_quota.sql`) para garantizar consistencia absoluta en UTC y evitar vulnerabilidades derivadas del huso horario o cambios manuales de reloj en clientes.

## Fuentes para estudiar

- [swipe.controller.js](../../../src/controllers/swipe.controller.js)
- [match.controller.js](../../../src/controllers/match.controller.js)
- [geoSearch.js](../../../src/utils/geoSearch.js)
- [swipe.routes.js](../../../src/routes/swipe.routes.js)
- [010_timezone_and_swipe_undo_quota.sql](../../../src/database/migrations/010_timezone_and_swipe_undo_quota.sql)

Revisión: 2026-10-04, actualización con sistema de deshacer y estandarización a TIMESTAMPTZ. Consultar [verificación](../desarrollo-y-verificacion.md) para resultados ejecutados.
