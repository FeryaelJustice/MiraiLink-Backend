# [BORRADOR | APROBADO] Plan Tecnico de Arquitectura: [Nombre de la Funcionalidad]

- **Especificacion funcional asociada**: `docs/features/<nombre_feature>/spec.md`
- **Estado**: [BORRADOR | APROBADO]
- **Fecha**: YYYY-MM-DD
- **Modulos Afectados**: [ej. `src/routes/`, `src/controllers/`, `src/validation/`, `src/database/migrations/`]

- - -

## 1. Hechos Verificados en el Proyecto (Sin Alucinaciones)

Informacion tecnica verificada rigurosamente en `package.json` y el arbol del proyecto:

- **Runtime & Motor**: Node.js `>=22` (ES Modules, `type: "module"`)
- **Framework Web**: Express `5.2.1`
- **Base de Datos & Driver**: PostgreSQL 16 / driver `pg: ^8.22.0`
- **Validacion**: Zod `^4.4.3`
- **Criptografia & Auth**: `bcrypt: ^6.0.0`, `jsonwebtoken: ^9.0.3`, `speakeasy: ^2.0.0`
- **Testing & Cobertura**: Vitest `^4.1.10`, Supertest `^7.2.2`, `@vitest/coverage-v8: ^4.1.10`
- **Linter & Validacion OpenAPI**: ESLint `^10.7.0`, `yaml: ^2.9.0`
- **Archivos & Media**: `multer: ^2.2.0`, validacion binaria con magic bytes

> **Regla estricta**: Queda prohibido inventar metodos o incorporar paquetes externos sin aprobacion previa en este plan.

- - -

## 2. Impacto Arquitectonico y Diseno de Componentes

### 2.1. Rutas y Middleware (`src/routes/`)
- **Archivo de rutas**: `src/routes/<dominio>.routes.js`
- **Guardas requeridas**:
  - `authenticateToken`: [Si | No]
  - `require2FAVerified`: [Si | No]
  - `rateLimiter`: [Global | Limiter sensible especifico]
  - `validate(schema)`: Esquema Zod asociado

### 2.2. Validacion Declarativa (`src/validation/`)
- **Archivo de esquema**: `src/validation/<dominio>.validation.js`
- **Campos validados**:
  - `params`: [Parametros de ruta con coercion o validacion UUID / entero]
  - `query`: [Paginacion limit/offset, filtros saneados]
  - `body`: [Campos de carga util con reglas de longitud, formato y tipos]

### 2.3. Controladores y Transacciones (`src/controllers/`)
- **Archivo de controlador**: `src/controllers/<dominio>.controller.js`
- **Flujo de orquestacion**:
  1. Extraccion de datos saneados de `req.validated` o `req.user`.
  2. Apertura de cliente transaccional (`pool.connect()`) si hay multiples operaciones.
  3. Ejecucion de SQL parametrizado con captura de `AppError` en caso de infraccion de reglas de negocio.
  4. Confirmacion (`COMMIT`) o reversion (`ROLLBACK`) en bloque `try...catch...finally`.
  5. Proyeccion de salida mediante DTO y respuesta HTTP.

### 2.4. Base de Datos y Persistencia (`src/database/`)
- **Nuevas tablas o columnas**: [Detalle de cambios DDL en `src/database/migrations/NNN_nombre.sql`]
- **Consultas SQL Parametrizadas**:
  ```sql
  -- Ejemplo de consulta proyectada
  SELECT id, username, created_at
  FROM users
  WHERE id = $1;
  ```
- **Indices y Restricciones**: [Indices unicos para idempotencia o claves foraneas con acciones referenciales]

### 2.5. Proyecciones DTO y Privacidad (`src/dto/`)
- **Archivo DTO**: `src/dto/<dominio>.dto.js`
- **Campos permitidos**: [Lista blanca estricta de propiedades que pueden ser devueltas en la respuesta JSON]

### 2.6. Sincronizacion de Contrato OpenAPI (`docs/openapi.yaml`)
- Declaracion del nuevo path, metodos, schemas de request/response y codigos de error en la especificacion OpenAPI 3.1.

- - -

## 3. Estrategia de Testing

- **Pruebas Unitarias (`tests/unit/`)**:
  - Validacion de esquemas Zod con datos correctos e incorrectos.
  - Funciones puras de transformacion y DTOs.
- **Pruebas de Integracion HTTP (`tests/integration/`)**:
  - Peticiones con Supertest simulando tokens Bearer validos, invalidos y expirados.
  - Verificacion de respuestas de error normalizadas (`errorHandler`).
  - Verificacion de limites de tasa (rate limiting) y tamanos maximos de carga.
- **Pruebas de Base de Datos (`tests/database/`)**:
  - Comprobacion del esquema y ejecucion limpia de la migracion.
- **Comprobacion de Contrato**:
  - Ejecucion de `npm run check:routes` para validar la correspondencia entre Express y OpenAPI.

- - -

## 4. Riesgos Tecnicos, Seguridad y Mitigaciones

- **Riesgo 1**: [ej. Inyeccion SQL en nuevos filtros] -> **Mitigacion**: Uso exclusivo de parametros `$1, $2` con tipado validado en Zod.
- **Riesgo 2**: [ej. Duplicidad por reintentos de red del cliente movil] -> **Mitigacion**: Clave unica compuesta en PostgreSQL o clausula `ON CONFLICT DO NOTHING`.
- **Riesgo 3**: [ej. Fuga de datos sensibles de usuarios] -> **Mitigacion**: Paso forzoso por la funcion DTO antes del `res.json()`.
