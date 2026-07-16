# MiraiLink Backend

Backend REST de MiraiLink, una aplicación social orientada a personas interesadas en videojuegos y anime. Está construido con Node.js 22, Express 5 y PostgreSQL, e incluye autenticación con 2FA, perfiles, descubrimiento, matches, chat, fotos, catálogos, reportes, feedback y notificaciones push.

Este es el único README del repositorio. Funciona como punto de entrada para personas, herramientas y agentes de IA.

## Estado verificado

- 43 operaciones bajo `/api`, más `/`, `/healthz`, `/static` y `/assets`.
- Aplicación Express separada del proceso HTTP mediante `createApp()` y `src/server.js`.
- Validación Zod, JWT Bearer, revocación, 2FA en dos fases, rate limiting y errores normalizados.
- Tests unitarios, de integración HTTP, contrato OpenAPI y esquema PostgreSQL.
- GitHub Actions ejecuta CI sin desplegar.
- SMTP y Firebase se inicializan solo cuando se usan.
- `src/assets` queda fuera de análisis, mantenimiento, documentación y tests.

## Cómo entender el proyecto

Lee en este orden:

1. [Arquitectura](docs/architecture.md): recorrido de una petición, límites, dependencias y decisiones técnicas.
2. [Mapa del código](docs/codebase-map.md): función de cada carpeta y archivo relevante.
3. [Referencia de código](docs/code-reference.md): clases, funciones, métodos exportados, parámetros, efectos y consumidores.
4. [Guía de API](docs/api-reference.md): autenticación, requests, responses, errores, multipart y las 43 operaciones vigentes.
5. [OpenAPI 3.1](docs/openapi.yaml): contrato procesable por Swagger, Redoc, generadores y agentes.
6. [Base de datos](docs/database.md): tablas, relaciones, migración de seguridad y forma de inicializar PostgreSQL.
7. [Runtime y configuración](docs/runtime-and-configuration.md): variables, integraciones, arranque y operación.
8. [Testing](docs/testing-strategy.md): suites, cobertura, comandos y límites actuales.
9. [Seguridad](docs/security-review.md): estado actual, controles implementados y riesgos residuales.
10. [Futuro VPS](docs/future-vps-deployment.md): contexto no implementado para Debian, PM2, nginx y futuro CD.

Los documentos de [diseño](docs/superpowers/specs/2026-07-16-backend-security-testing-ci-design.md) y [plan de implementación](docs/plans/2026-07-16-backend-security-testing-ci.md) son registros históricos. No sustituyen al contrato actual.

## Flujo principal

```text
Cliente
  -> src/server.js
  -> src/app.js
  -> middleware global
  -> src/routes/*.routes.js
  -> validación y autorización
  -> src/controllers/*.controller.js
  -> servicios, utilidades y PostgreSQL
  -> errorHandler o respuesta JSON
```

No hay una capa de repositorios independiente: los controladores ejecutan consultas parametrizadas mediante el pool compartido de `src/models/db.js`.

## Requisitos

- Node.js 22 o superior.
- npm compatible con `package-lock.json`.
- PostgreSQL 16 recomendado.
- SMTP solo para verificación y recuperación por correo.
- Firebase solo para notificaciones push.

## Instalación

```powershell
npm ci
Copy-Item .env.example .env
psql -U postgres -d mirailink -f src/database/db.sql
npm run dev
```

En una instalación creada con el esquema anterior, aplica también:

```powershell
psql -U postgres -d mirailink -f src/database/migrations/002_security_hardening.sql
```

La migración invalida recovery codes antiguos porque el formato actual solo guarda hashes bcrypt. Sustituye todos los placeholders de `.env.example` antes de arrancar.

## Comandos

| Comando | Resultado |
| --- | --- |
| `npm run dev` | Nodemon, `.env` y `NODE_ENV=development` |
| `npm start` | Proceso de producción con `.env` |
| `npm run build` | Comprueba la sintaxis del entrypoint |
| `npm test` | Ejecuta toda la suite Vitest |
| `npm run test:unit` | Tests unitarios |
| `npm run test:integration` | Integración Express y autenticación |
| `npm run test:database` | Esquema PostgreSQL, obligatorio con `REQUIRE_DATABASE_TESTS=true` |
| `npm run test:coverage` | Tests con cobertura V8 y umbrales |
| `npm run lint` | ESLint sobre código, scripts y tests |
| `npm run check:routes` | Compara rutas Express con OpenAPI |
| `npm run check` | Lint, cobertura y contrato de rutas |

## Autenticación resumida

Las rutas protegidas usan:

```http
Authorization: Bearer <access-token>
```

El login sin 2FA entrega `token` y `userId`. Con 2FA entrega `requires2FA`, `challengeToken` y `expiresIn`; el token final se obtiene en `POST /api/auth/2fa/loginVerifyLastStep` con el challenge y un TOTP o recovery code.

## Errores

El formato general es:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "requestId": "request-correlation-id",
  "details": []
}
```

`details` solo aparece cuando aporta información segura, normalmente en validación. La respuesta incluye `x-request-id`.

## Limitaciones conocidas

- El rate limit usa memoria local. Un despliegue con varias réplicas necesitará un store compartido.
- No hay despliegue automático, logs estructurados, métricas ni readiness de dependencias.
- La prueba PostgreSQL se omite localmente salvo que `REQUIRE_DATABASE_TESTS=true`; CI la fuerza contra PostgreSQL 16.
- La compatibilidad de lectura AES-CBC debe retirarse después de migrar todos los secretos 2FA.
- La API no está versionada en el path.

## Licencia

ISC.
