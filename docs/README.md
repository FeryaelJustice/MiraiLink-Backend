# Documentación de MiraiLink Backend

## Lectura recomendada

1. [Arquitectura](architecture.md)
2. [Guía de API](api-reference.md) y [adenda de seguridad vigente](api-hardening-addendum.md)
3. [OpenAPI 3.1](openapi.yaml)
4. [Modelo de datos](database.md)
5. [Runtime y configuración](runtime-and-configuration.md)
6. [Referencia de código](code-reference.md)
7. [Testing](testing-strategy.md)
8. [Revisión original](security-review.md) y [estado de remediación](security-remediation.md)
9. [Contexto de despliegue VPS futuro](future-vps-deployment.md)

La adenda y el estado de remediación describen el contrato posterior al hardening de julio de 2026 y prevalecen ante cualquier fragmento histórico de la referencia original. El comando `npm run check:routes` exige que cada operación Express activa esté representada en OpenAPI.

## Convenciones actuales

- Prefijo `/api` y autenticación `Authorization: Bearer <token>`.
- JSON limitado a 100 KiB y multipart limitado a cuatro imágenes de 5 MiB.
- UUID para recursos de dominio.
- Respuestas de error con `code`, `message` y `requestId`.
- UTC en persistencia y comparación; zona horaria solo en clientes.
- `src/assets` está fuera del alcance de análisis, mantenimiento y tests.
