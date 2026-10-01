# Desarrollo, comprobaciones y evidencia

[Guía maestra](../guia-maestra.md) | [Cobertura](cobertura.md)

Revisión de fuentes: 2026-10-01. Las observaciones estáticas no certifican el servidor desplegado ni el comportamiento en dispositivo.


## Comandos pertinentes

`npm run build` solo comprueba sintaxis de server.js; no es una compilación de todos los archivos. ESLint, Vitest coverage y check:routes aportan evidencias distintas. La suite PostgreSQL está desactivada salvo REQUIRE_DATABASE_TESTS=true y destruye public, por lo que solo debe ejecutarse en una base desechable autorizada.

Regenerar anexos: `node scripts/documentacion-inventario.mjs backend`. El script limita lectura a fuentes versionadas y excluye media/secretos; no ejecuta SQL ni llama a proveedores.

## Evidencia de esta entrega

Los resultados finales se registran en [checklist](../features/documentacion_integral/tasks.md). Diagramas derivan de fuentes estáticas; renderizado se registrará por separado. No se ejecutan migraciones, seeds, resets ni operaciones de producción para redactar documentos.

Pruebas en mocks son evidencia del contrato probado, no validación de SMTP, Google Play, Firebase, base desplegada o dispositivo real. Un test omitido debe registrarse como omitido.

## Mantenimiento

Ante cambios de funciones, requests, configuración o esquema, regenerar referencias y después revisar manualmente contenido, diagramas y protocolos. Un generador no valida el significado de una decisión de negocio. Seguir las instrucciones cruzadas del maestro.

## Resultados ejecutados el 2026-10-01

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| npm run check | Correcto | ESLint, Vitest coverage y check:routes |
| Vitest | 97 tests correctos, 1 omitido; 27 archivos correctos, 1 omitido | Mocks y pruebas locales |
| Coverage | Statements 74.31%, branches 55.81%, functions 76.57%, lines 74.78% | Umbrales configurados cumplidos |
| check:routes | 59 operaciones válidas | Correspondencia método/path OpenAPI y routers |
| npm run build | Correcto | node --check de server.js |
| ESLint scripts documentales | Correcto tras últimos cambios | documentacion-inventario/comprobar.mjs |
| Conservación de fuentes | 40 archivos JavaScript, solo comentarios | Tokens Espree frente a HEAD |

La suite PostgreSQL quedó omitida por defecto; REQUIRE_DATABASE_TESTS no se activó. Las pruebas no certifican entrega SMTP/FCM, Google Play ni coherencia de una base real.

### Documentación y conservación del comportamiento

- Guías maestras conectadas con disclaimer y protocolo de mantenimiento conjunto.
- Inventarios de fuentes, lectores de configuración, flujos y referencias revisados estáticamente.
- Scripts de comprobación de enlaces locales ejecutados sin destinos rotos en el conjunto de estudio. Los enlaces entre repositorios utilizan la rama de revisión; al integrar las PR deben actualizarse juntos hacia una referencia estable.
- git diff --check correcto al cierre.
- Fuentes ejecutables modificadas comparadas contra HEAD sin cambios fuera de comentarios; ver [lista de comentarios](comentarios-verificados.md). Los scripts nuevos son herramientas de documentación y no forman parte del runtime de la app/servidor.

### Diagramas y límites

Diagramas Mermaid y PlantUML contrastados con fuentes. No se verificó su renderizado con un motor Mermaid/PlantUML en este entorno; se entregan fuentes editables y se registra esta limitación. No se han ejecutado pruebas de dispositivo, integración con proveedores o base desplegada. No se ha ejecutado seed, reset ni migración sobre datos reales.
