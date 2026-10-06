# Reglas Generales de Ingeniería y Calidad de Código (MiraiLink Backend)

Este documento establece los principios técnicos, convenciones de arquitectura y normas de calidad obligatorias para cualquier desarrollo o cambio en MiraiLink Backend bajo la metodología SDMD (Spec-Driven Mobile Development / Spec-Driven Development).

- - -

## 1. Principios de Arquitectura y Pipeline de Peticiones

- **Monolito Modular Basado en Express 5**:
  - Separación estricta de responsabilidades entre arranque de red (`src/server.js`), definición de la aplicación (`src/app.js`), rutas (`src/routes/`), controladores (`src/controllers/`), middleware (`src/middleware/`), validación (`src/validation/`), proyecciones (`src/dto/`) y persistencia (`src/models/db.js`).
  - `src/app.js` no debe escuchar puertos para permitir que Supertest ejecute pruebas sin arrancar sockets de red ni dependencias externas.

- **Pipeline Determinista de Middleware**:
  - Cada petición debe atravesar ordenadamente: correlación de trazas con `x-request-id`, CORS con lista blanca, parser JSON con límite máximo de 100 KiB, compresión gzip/deflate, cabeceras seguras con Helmet, enrutador de dominio, rate limiting adaptativo, guardas de autenticacion/autorizacion y validación de esquemas con Zod.

- **Persistencia con Consultas SQL Parametrizadas**:
  - No se utiliza ORM pesado. Todas las interacciones con PostgreSQL se realizan mediante consultas SQL estrictamente parametrizadas (`$1`, `$2`, etc.) a través del pool centralizado en `src/models/db.js`.
  - Queda terminantemente prohibida la concatenación o interpolación directa de variables en cadenas SQL.
  - Toda operación que involucre múltiples escrituras o mutaciones críticas (matches, 2FA, mensajes, creación de usuarios) debe encapsularse en una transacción explícita (`BEGIN`, `COMMIT`, `ROLLBACK`) con liberación garantizada del cliente en bloques `try...finally`.

- **Proyecciones Seguras y DTOs**:
  - Ningún controlador debe devolver directamente filas crudas de la base de datos sin filtrar.
  - Toda salida pública debe pasar por proyecciones SQL explícitas o funciones DTO de lista blanca (`src/dto/user.dto.js`), asegurando que contraseñas, hashes de recuperación, secretos TOTP, direcciones de correo y datos privados nunca se expongan al cliente.

- - -

## 2. Validación Estricta y Manejo de Errores

- **Validación Declarativa con Zod**:
  - Todo endpoint que acepte parámetros de ruta (`params`), parámetros de consulta (`query`) o cuerpo de petición (`body`) debe contar con un esquema Zod validado a través del middleware `validate()`.
  - El middleware `validate()` reemplaza los datos originales de la petición por los valores saneados y tipados resultantes del parseo.

- **Errores Operativos Estandarizados (`AppError`)**:
  - Las condiciones de error previstas (datos inválidos, credenciales incorrectas, recursos no encontrados, conflictos) deben lanzarse utilizando `AppError` con su respectivo código HTTP y código de error de dominio (por ejemplo `INVALID_CREDENTIALS`, `NOT_FOUND`, `FORBIDDEN`).
  - El middleware centralizado `errorHandler` (`src/middleware/error.middleware.js`) se encarga de normalizar la respuesta en formato JSON:
    ```json
    {
      "status": "error",
      "code": "INVALID_CREDENTIALS",
      "message": "Credenciales no validas",
      "requestId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
    }
    ```
  - Esta estrictamente prohibido exponer trazas internas de ejecución (`stack traces`), errores nativos de PostgreSQL, detalles de JWT o errores de proveedores externos (SMTP / Firebase) al cliente.

- - -

## 3. Seguridad y Criptografía

- **Autenticación Bearer JWT**:
  - Los tokens de acceso se firman con HMAC-SHA256 (`HS256`) y deben contener la propiedad `purpose: 'access'`.
  - `authenticateToken()` valida el token y comprueba que no figure en la tabla de revocación (`revoked_tokens`) antes de autorizar la ejecución.

- **Doble Factor de Autenticación (2FA TOTP)**:
  - El flujo de login con 2FA genera un token temporal de 5 minutos con `purpose: '2fa-login'`.
  - Únicamente el endpoint de verificación (`/auth/2fa/verify-login`) puede canjear este token por un access token definitivo tras validar el código TOTP o un código de recuperación mediante hash bcrypt.

- **Subida de Archivos y Validación Binaria**:
  - El procesamiento de imágenes mediante Multer utiliza almacenamiento acotado en memoria.
  - Toda imagen debe pasar por `validateImage()` para verificar su firma de bytes mágicos (JPEG, PNG, WebP) antes de escribirla en disco.
  - El almacenamiento final en staging y promoción atómica se gestiona mediante `src/utils/photoStorage.js`.
  - Nunca leer, listar, modificar ni incluir en Git los contenidos de `src/assets`. En entornos de prueba, se debe emplear un directorio temporal (`UPLOAD_ROOT`).

- - -

## 4. Convenciones de Código

- **Módulos y Estilo**:
  - Utilizar ES modules (`import` / `export`), cuatro espacios de indentación, comillas simples (`'`), coma final en estructuras multilineas y nombres en `camelCase` para funciones y variables, reservando `PascalCase` para clases y esquemas de validación.
  - Nombres de archivos de rutas en formato kebab-case (`chat.routes.js`, `swipe.routes.js`).

- **Sincronización de Contrato OpenAPI 3.1**:
  - Cada adición o modificación de ruta debe reflejarse en `docs/openapi.yaml`, `docs/api-reference.md` y `docs/code-reference.md`.
  - El comando `npm run check:routes` valida que el router activo de Express coincida exactamente con las operaciones documentadas en la especificación OpenAPI.

- - -

## 5. Estrategia de Testing y Aprobación

- **Pruebas Automatizadas con Vitest**:
  - `npm run test:unit`: Pruebas de utilidades, validadores y lógica de cifrado.
  - `npm run test:integration`: Pruebas de integración HTTP con Supertest simulando el flujo de cliente.
  - `npm run test:database`: Pruebas de esquema relacional y migraciones contra PostgreSQL.
  - `npm run test:coverage`: Validación de umbrales mínimos de cobertura con motor V8.
- **Verificación Integral de Calidad**:
  - Todo cambio debe superar de forma limpia:
    ```bash
    npm run check
    ```
    (el cual ejecuta ESLint, pruebas con cobertura y comprobación de rutas contra OpenAPI).
