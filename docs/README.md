# Documentación de MiraiLink Backend

Esta carpeta documenta el comportamiento observado en el repositorio a fecha de la última revisión. No describe funcionalidades imaginadas ni garantiza que los riesgos señalados ya estén resueltos.

## Lectura recomendada

1. [Arquitectura](architecture.md) para entender el flujo general y los límites del sistema.
2. [Mapa del código](codebase-map.md) para localizar cada responsabilidad.
3. [Referencia de la API](api-reference.md) para integrar clientes humanos o automáticos.
4. [OpenAPI 3.1](openapi.yaml) para Swagger UI, Redoc, generación de clientes y validación de contratos.
5. [Modelo de datos](database.md) para tablas, relaciones y limitaciones del SQL actual.
6. [Runtime y configuración](runtime-and-configuration.md) para arrancar y operar el servicio.
7. [Referencia de código](code-reference.md) para conocer todas las funciones exportadas y piezas internas relevantes.
8. [Estrategia de testing](testing-strategy.md) para convertir el proyecto en un sistema verificable.
9. [Revisión de seguridad](security-review.md) para priorizar correcciones antes de producción.

## Alcance revisado

- `package.json`, `.env.example`, `.gitignore`, `README.md`, `AGENTS.md` y `WARP.md`.
- Los 34 archivos JavaScript bajo `src`, excluyendo `src/assets`.
- Las 11 familias de rutas Express y sus 46 endpoints bajo `/api`.
- Los controladores, middleware, utilidades, servicios, configuración y prototipo Socket.IO.
- `src/database/db.sql` y la estructura de `db_inserts.sql`.
- El HTML estático de `src/public`.

## Fuera de alcance

- No se leyó ni modificó ningún archivo dentro de `src/assets`.
- No se verificó una base PostgreSQL real ni un proyecto Firebase real.
- No se enviaron correos, notificaciones push ni peticiones HTTP reales.
- No se infirieron contratos no demostrados por rutas, controladores o SQL.

## Estado documental

| Area | Fuente principal | Documento |
| --- | --- | --- |
| Arranque y middleware | `src/app.js` | [architecture.md](architecture.md) |
| Endpoints y payloads | `src/routes`, `src/controllers` | [api-reference.md](api-reference.md) |
| Contrato legible por herramientas | Rutas y controladores | [openapi.yaml](openapi.yaml) |
| Funciones y módulos | Todo `src` | [code-reference.md](code-reference.md) |
| Persistencia | `db.sql`, consultas SQL | [database.md](database.md) |
| Configuración | `.env.example`, imports | [runtime-and-configuration.md](runtime-and-configuration.md) |
| Calidad | Scripts y estructura actual | [testing-strategy.md](testing-strategy.md) |
| Riesgos | Flujo completo | [security-review.md](security-review.md) |

## Convenciones de la API actual

- Prefijo REST: `/api`.
- Autenticación: JWT Bearer en las rutas marcadas como protegidas.
- JSON: formato predominante para request y response.
- Archivos: `multipart/form-data` en las dos operaciones de fotos.
- Identificadores: UUID de PostgreSQL, salvo `recovery_codes.id`, que es entero.
- Errores: no existe todavía un esquema uniforme. La mayoría usa `{ "message": "..." }`, pero también hay texto plano, campos adicionales y respuestas distintas según el módulo.
- Fechas: PostgreSQL devuelve timestamps en formato dependiente del driver; algunos endpoints convierten fechas o timestamps manualmente.

## Mantenimiento de la documentación

Cuando cambie una ruta, hay que actualizar en el mismo cambio:

1. `docs/api-reference.md`.
2. `docs/openapi.yaml`.
3. El mapa o la referencia de código si cambia la responsabilidad de un módulo.
4. El README si cambian requisitos, scripts o estado operativo.

La documentación de riesgos debe cerrarse solo cuando exista una corrección y una prueba que la demuestre.
