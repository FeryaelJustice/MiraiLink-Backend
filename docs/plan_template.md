# [BORRADOR | APROBADO] Plan Técnico de Arquitectura: [Nombre de la Funcionalidad]

- **Especificación funcional asociada**: `docs/features/<nombre_feature>/spec.md`
- **Estado**: [BORRADOR | APROBADO]
- **Fecha**: YYYY-MM-DD
- **Módulos Afectados**: [ej. `src/routes/`, `src/controllers/`, `src/validation/`, `src/database/migrations/`]

- - -

## 1. Hechos Verificados en el Proyecto (Sin Alucinaciones)

Información técnica verificada rigurosamente en `package.json` y el árbol del proyecto:

- **Runtime & Motor**: Node.js `>=22` (ES Modules, `type: "module"`)
- **Framework Web**: Express `5.2.1`
- **Base de Datos & Driver**: PostgreSQL 16 / driver `pg: ^8.22.0`
- **Validación**: Zod `^4.4.3`
- **Criptografía & Auth**: `bcrypt: ^6.0.0`, `jsonwebtoken: ^9.0.3`, `speakeasy: ^2.0.0`
- **Testing & Cobertura**: Vitest `^4.1.10`, Supertest `^7.2.2`, `@vitest/coverage-v8: ^4.1.10`
- **Linter & Validación OpenAPI**: ESLint `^10.7.0`, `yaml: ^2.9.0`
- **Archivos & Media**: `multer: ^2.2.0`, validación binaria con magic bytes

> **Regla estricta**: Queda prohibido inventar métodos o incorporar paquetes externos sin aprobación previa en este plan.

- - -

## 2. Impacto Arquitectónico y Diseño de Componentes

### 2.1. Rutas y Middleware (`src/routes/`)
- **Archivo de rutas**: `src/routes/<dominio>.routes.js`
- **Guardas requeridas**:
  - `authenticateToken`: [Si | No]
  - `require2FAVerified`: [Si | No]
  - `rateLimiter`: [Global | Limiter sensible específico]
  - `validate(schema)`: Esquema Zod asociado

### 2.2. Validación Declarativa (`src/validation/`)
- **Archivo de esquema**: `src/validation/<dominio>.validation.js`
- **Campos validados**:
  - `params`: [Parámetros de ruta con coerción o validación UUID / entero]
  - `query`: [Paginación limit/offset, filtros saneados]
  - `body`: [Campos de carga útil con reglas de longitud, formato y tipos]

### 2.3. Controladores y Transacciones (`src/controllers/`)
- **Archivo de controlador**: `src/controllers/<dominio>.controller.js`
- **Flujo de orquestación**:
  1. Extracción de datos saneados de `req.validated` o `req.user`.
  2. Apertura de cliente transaccional (`pool.connect()`) si hay múltiples operaciones.
  3. Ejecución de SQL parametrizado con captura de `AppError` en caso de infracción de reglas de negocio.
  4. Confirmación (`COMMIT`) o reversión (`ROLLBACK`) en bloque `try...catch...finally`.
  5. Proyección de salida mediante DTO y respuesta HTTP.

### 2.4. Base de Datos y Persistencia (`src/database/`)
- **Nuevas tablas o columnas**: [Detalle de cambios DDL en `src/database/migrations/NNN_nombre.sql`]
- **Consultas SQL Parametrizadas**:
  ```sql
  -- Ejemplo de consulta proyectada
  SELECT id, username, created_at
  FROM users
  WHERE id = $1;
  ```
- **Índices y Restricciones**: [Índices únicos para idempotencia o claves foráneas con acciones referenciales]

### 2.5. Proyecciones DTO y Privacidad (`src/dto/`)
- **Archivo DTO**: `src/dto/<dominio>.dto.js`
- **Campos permitidos**: [Lista blanca estricta de propiedades que pueden ser devueltas en la respuesta JSON]

### 2.6. Sincronización de Contrato OpenAPI (`docs/openapi.yaml`)
- Declaración del nuevo path, métodos, schemas de request/response y códigos de error en la especificación OpenAPI 3.1.

- - -

## 3. Estrategia de Testing

- **Pruebas Unitarias (`tests/unit/`)**:
  - Validación de esquemas Zod con datos correctos e incorrectos.
  - Funciones puras de transformación y DTOs.
- **Pruebas de Integración HTTP (`tests/integration/`)**:
  - Peticiones con Supertest simulando tokens Bearer válidos, inválidos y expirados.
  - Verificación de respuestas de error normalizadas (`errorHandler`).
  - Verificación de límites de tasa (rate limiting) y tamanos maximos de carga.
- **Pruebas de Base de Datos (`tests/database/`)**:
  - Comprobación del esquema y ejecución limpia de la migración.
- **Comprobación de Contrato**:
  - Ejecución de `npm run check:routes` para validar la correspondencia entre Express y OpenAPI.

- - -

## 4. Riesgos Técnicos, Seguridad y Mitigaciones

- **Riesgo 1**: [ej. Inyección SQL en nuevos filtros] -> **Mitigación**: Uso exclusivo de parámetros `$1, $2` con tipado validado en Zod.
- **Riesgo 2**: [ej. Duplicidad por reintentos de red del cliente móvil] -> **Mitigación**: Clave única compuesta en PostgreSQL o clausula `ON CONFLICT DO NOTHING`.
- **Riesgo 3**: [ej. Fuga de datos sensibles de usuarios] -> **Mitigación**: Paso forzoso por la función DTO antes del `res.json()`.
