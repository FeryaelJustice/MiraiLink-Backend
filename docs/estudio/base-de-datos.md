# Modelo PostgreSQL, relaciones y migraciones

[Guía maestra](../guia-maestra.md) | [Cobertura](cobertura.md)

Revisión de fuentes: 2026-10-01. Las observaciones estáticas no certifican el servidor desplegado ni el comportamiento en dispositivo.


## Fuente y reconstrucción

[db.sql](../../src/database/db.sql) es baseline; las migraciones 002..009 añaden endurecimiento, ubicaciones, traducciones, geografía canónica, perfil extendido, exploración y suscripciones. [migrator.js](../../src/database/migrator.js) añade schema_migrations en runtime. El [diccionario](diccionario-esquema.md) y los [diagramas ER](../diagramas/indice.md) cubren todas las tablas derivadas de esas fuentes, sin leer filas ni consultar la base real.

El migrador no crea automáticamente el baseline. Una base vacía necesita inicialización controlada antes de aplicar ALTER TABLE. No ejecutar reset para resolverlo en producción. Los scripts reset tienen otro propósito.

## Dominios y relaciones

- users concentra identidad, residencia, coordenadas y atributos simples. is_deleted es borrado lógico en el handler de cuenta; no equivale a DELETE físico ni activa todas las cascadas.
- user_2fa, códigos email/reset, recovery y token_blacklist gestionan seguridad. Legacy two_fa_* se elimina en 002; token se renombra token_hash según estado previo.
- user_photos relaciona perfil con URL y posición 1..4, con unicidad usuario/posición. El archivo no reside dentro de PostgreSQL.
- animes/games y tablas de nombre/biografía separan ID canónico de texto por idioma. Tablas puente user_*_interests son N:M.
- countries/regions/cities y sus traducciones forman geografía canónica. Referencias de residencia usan RESTRICT; ciudades permiten region_id NULL. user_search_preferences conserva el contrato nuevo junto a columnas legacy de users.
- Perfil extendido: catálogos de relación, familia, religión, signo, política, tabaco, alcohol, orientación, estudios e idiomas; traducciones y selecciones puente. Prompts enlazan pregunta canónica con respuesta propia y unicidad usuario/prompt.
- likes/dislikes son dirigidos y únicos por par; matches relaciona dos usuarios, no contiene FK a chats. El handler de like guarda match sin crear chat; sendMessage crea la conversación por pareja, sin FK ni requisito de match.
- chats tiene tipo private/group; chat_members forma N:M y guarda last_read_at. messages referencia chat y sender. No sustituirlo por un nombre histórico chat_messages.
- push_tokens es único por usuario, por lo que no representa varios dispositivos por cuenta. reports/feedback conservan registro con SET NULL al borrado físico de usuario.
- Categorías tienen filtro y traducciones; user_category_preferences es única por usuario/categoría. user_subscriptions es única por usuario.

## Integridad, índices y transacciones

PK compuestas evitan selecciones repetidas; CHECK previene self-like/match y acota radio/posiciones. Los índices favorecen usuario destinatario, último mensaje, geografía y lookup de traducciones; ver [DDL](ddl-referencia.md). Índice no garantiza plan óptimo sin EXPLAIN y datos representativos, que no se ejecutaron aquí.

Las transacciones usan un cliente del pool. Advisory locks serializan parejas para creación de chat; FOR UPDATE protege recovery y fotos existentes. Filesystem y SMTP no comparten rollback PostgreSQL: confirmar puntos de promoción/compensación en handlers.

El migrador usa advisory lock de sesión, archivos ordenados y registro de filename después del SQL. El archivo puede confirmar su transacción antes de registrar filename: una interrupción entre ambos deja un riesgo de reejecución. No describe un checksum ni migration framework con rollback automático.

Para el significado de cada columna: [diccionario completo](diccionario-esquema.md). Para responsabilidades del cliente: [contratos y persistencia Android](https://github.com/FeryaelJustice/MiraiLink/blob/codex/documentacion-integral/docs/estudio/persistencia-y-demo.md).
