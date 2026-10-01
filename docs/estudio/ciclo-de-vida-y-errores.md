# Errores y recuperación del servidor

[Guía maestra](../guia-maestra.md) | [Cobertura](cobertura.md)

Revisión de fuentes: 2026-10-01. Las observaciones estáticas no certifican el servidor desplegado ni el comportamiento en dispositivo.


[error.middleware.js](../../src/middleware/error.middleware.js) normaliza errores de validación, payload/upload y operativos. Algunos handlers responden con code/message directamente; requestId no está garantizado en todas esas respuestas. Seguir el camino concreto antes de describir un único formato universal.

| Caso | Comportamiento o límite observado |
| --- | --- |
| Entorno inválido | parseEnv falla antes de escucha HTTP |
| JWT inválido/revocado | Guarda obligatoria responde 401; usuario no verificado 403 |
| Recurso ajeno | Chat membership retorna 404 para no revelar existencia |
| Datos inválidos | Zod sanea/coerce/default antes del handler; JSON multipart se valida después en algunos campos |
| Tamaño excesivo/imagen falsa | Parser o Multer rechaza; magic bytes valida JPEG/PNG/WebP |
| SQL o fallo interno | Handler usa next/error middleware; algunas guardas convierten cualquier fallo en INVALID_TOKEN |
| SMTP caído | Mailer simula y logs; no garantía de entrega real |
| FCM caído | Envío capturado; escritura mensaje puede seguir confirmada |
| Sin geografía activa fresca | No usar coordenadas antiguas como actuales; revisar scope y origen |
| Timeout cliente tras COMMIT | Reintentar puede repetir efecto si no existe clave idempotente |
| Reinicio de proceso | Rate limits y cache de recuentos se pierden; persistencia PostgreSQL depende del commit |

[geoSearch.js](../../src/utils/geoSearch.js) considera activa una ubicación con edad <=24 h y no futura en helper JS. candidateCoordinateSql solo compara el límite inferior temporal, sin excluir timestamps futuros: registrar la diferencia en hallazgos.

Las constraints SQL previenen determinados duplicados, no toda operación repetida. Likes tienen unicidad por pareja; envío de mensaje no recibe un ID idempotente del cliente. No afirmar reintento exactamente una vez.

Diagramas: [actividad y estados](../diagramas/estados.md), [mensajería](../diagramas/mensajeria.md). La presentación del error pertenece al [cliente](https://github.com/FeryaelJustice/MiraiLink/blob/codex/documentacion-integral/docs/estudio/ciclo-de-vida-y-errores.md).
