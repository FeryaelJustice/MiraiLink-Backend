# Reglas Generales de Ingenieria y Calidad de Codigo (MiraiLink Backend)

Este documento establece los principios tecnicos, convenciones de arquitectura y normas de calidad obligatorias para cualquier desarrollo o cambio en MiraiLink Backend bajo la metodologia SDMD (Spec-Driven Mobile Development / Spec-Driven Development).

- - -

## 1. Principios de Arquitectura y Pipeline de Peticiones

- **Monolito Modular Basado en Express 5**:
  - Separacion estricta de responsabilidades entre arranque de red (`src/server.js`), definicion de la aplicacion (`src/app.js`), rutas (`src/routes/`), controladores (`src/controllers/`), middleware (`src/middleware/`), validacion (`src/validation/`), proyecciones (`src/dto/`) y persistencia (`src/models/db.js`).
  - `src/app.js` no debe escuchar puertos para permitir que Supertest ejecute pruebas sin arrancar sockets de red ni dependencias externas.

- **Pipeline Determinista de Middleware**:
  - Cada peticion debe atravesar ordenadamente: correlacion de trazas con `x-request-id`, CORS con lista blanca, parser JSON con limite maximo de 100 KiB, compresion gzip/deflate, cabeceras seguras con Helmet, enrutador de dominio, rate limiting adaptativo, guardas de autenticacion/autorizacion y validacion de esquemas con Zod.

- **Persistencia con Consultas SQL Parametrizadas**:
  - No se utiliza ORM pesado. Todas las interacciones con PostgreSQL se realizan mediante consultas SQL estrictamente parametrizadas (`$1`, `$2`, etc.) a traves del pool centralizado en `src/models/db.js`.
  - Queda terminantemente prohibida la concatenacion o interpolacion directa de variables en cadenas SQL.
  - Toda operacion que involucre multiples escrituras o mutaciones criticas (matches, 2FA, mensajes, creacion de usuarios) debe encapsularse en una transaccion explicita (`BEGIN`, `COMMIT`, `ROLLBACK`) con liberacion garantizada del cliente en bloques `try...finally`.

- **Proyecciones Seguras y DTOs**:
  - Ningun controlador debe devolver directamente filas crudas de la base de datos sin filtrar.
  - Toda salida publica debe pasar por proyecciones SQL explicitas o funciones DTO de lista blanca (`src/dto/user.dto.js`), asegurando que contrasenas, hashes de recuperacion, secretos TOTP, direcciones de correo y datos privados nunca se expongan al cliente.

- - -

## 2. Validacion Estricta y Manejo de Errores

- **Validacion Declarativa con Zod**:
  - Todo endpoint que acepte parametros de ruta (`params`), parametros de consulta (`query`) o cuerpo de peticion (`body`) debe contar con un esquema Zod validado a traves del middleware `validate()`.
  - El middleware `validate()` reemplaza los datos originales de la peticion por los valores saneados y tipados resultantes del parseo.

- **Errores Operativos Estandarizados (`AppError`)**:
  - Las condiciones de error previstas (datos invalidos, credenciales incorrectas, recursos no encontrados, conflictos) deben lanzarse utilizando `AppError` con su respectivo codigo HTTP y codigo de error de dominio (por ejemplo `INVALID_CREDENTIALS`, `NOT_FOUND`, `FORBIDDEN`).
  - El middleware centralizado `errorHandler` (`src/middleware/error.middleware.js`) se encarga de normalizar la respuesta en formato JSON:
    ```json
    {
      "status": "error",
      "code": "INVALID_CREDENTIALS",
      "message": "Credenciales no validas",
      "requestId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
    }
    ```
  - Esta estrictamente prohibido exponer trazas internas de ejecucion (`stack traces`), errores nativos de PostgreSQL, detalles de JWT o errores de proveedores externos (SMTP / Firebase) al cliente.

- - -

## 3. Seguridad y Criptografia

- **Autenticacion Bearer JWT**:
  - Los tokens de acceso se firman con HMAC-SHA256 (`HS256`) y deben contener la propiedad `purpose: 'access'`.
  - `authenticateToken()` valida el token y comprueba que no figure en la tabla de revocacion (`revoked_tokens`) antes de autorizar la ejecucion.

- **Doble Factor de Autenticacion (2FA TOTP)**:
  - El flujo de login con 2FA genera un token temporal de 5 minutos con `purpose: '2fa-login'`.
  - Unicamente el endpoint de verificacion (`/auth/2fa/verify-login`) puede canjear este token por un access token definitivo tras validar el codigo TOTP o un codigo de recuperacion mediante hash bcrypt.

- **Subida de Archivos y Validacion Binaria**:
  - El procesamiento de imagenes mediante Multer utiliza almacenamiento acotado en memoria.
  - Toda imagen debe pasar por `validateImage()` para verificar su firma de bytes magicos (JPEG, PNG, WebP) antes de escribirla en disco.
  - El almacenamiento final en staging y promocion atomica se gestiona mediante `src/utils/photoStorage.js`.
  - Nunca leer, listar, modificar ni incluir en Git los contenidos de `src/assets`. En entornos de prueba, se debe emplear un directorio temporal (`UPLOAD_ROOT`).

- - -

## 4. Convenciones de Codigo

- **Modulos y Estilo**:
  - Utilizar ES modules (`import` / `export`), cuatro espacios de indentacion, comillas simples (`'`), coma final en estructuras multilineas y nombres en `camelCase` para funciones y variables, reservando `PascalCase` para clases y esquemas de validacion.
  - Nombres de archivos de rutas en formato kebab-case (`chat.routes.js`, `swipe.routes.js`).

- **Sincronizacion de Contrato OpenAPI 3.1**:
  - Cada adicion o modificacion de ruta debe reflejarse en `docs/openapi.yaml`, `docs/api-reference.md` y `docs/code-reference.md`.
  - El comando `npm run check:routes` valida que el router activo de Express coincida exactamente con las operaciones documentadas en la especificacion OpenAPI.

- - -

## 5. Estrategia de Testing y Aprobacion

- **Pruebas Automatizadas con Vitest**:
  - `npm run test:unit`: Pruebas de utilidades, validadores y logica de cifrado.
  - `npm run test:integration`: Pruebas de integracion HTTP con Supertest simulando el flujo de cliente.
  - `npm run test:database`: Pruebas de esquema relacional y migraciones contra PostgreSQL.
  - `npm run test:coverage`: Validacion de umbrales minimos de cobertura con motor V8.
- **Verificacion Integral de Calidad**:
  - Todo cambio debe superar de forma limpia:
    ```bash
    npm run check
    ```
    (el cual ejecuta ESLint, pruebas con cobertura y comprobacion de rutas contra OpenAPI).
