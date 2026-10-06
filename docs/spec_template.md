# [BORRADOR | APROBADO] Especificación Funcional: [Nombre de la Funcionalidad]

- **Fecha**: YYYY-MM-DD
- **Estado**: [BORRADOR | APROBADO]
- **Autor / Responsable**: [Nombre o Rol]
- **Módulos / Rutas Afectadas**: [ej. `src/routes/swipe.routes.js`, `src/controllers/swipe.controller.js`]

- - -

## 1. Problema y Objetivo

- **Problema que resuelve**: [Descripción concisa de la necesidad de negocio, optimización de servicio o funcionalidad requerida por los usuarios de MiraiLink]
- **Objetivo**: [Resultado concreto, medible y verificable una vez implementada la funcionalidad en la API]

- - -

## 2. Situación Actual

- [Cómo opera la API en este momento sin esta funcionalidad]
- [Endpoints existentes relacionados, limitaciones técnicas o ausencia del servicio en la arquitectura actual]

- - -

## 3. Alcance de la Funcionalidad

### 3.1. Dentro del Alcance (In Scope)
- [Endpoint o servicio específico 1]
- [Regla de negocio, validación o mutación transaccional 2]
- [Actualización de esquemas Zod y proyecciones DTO 3]

### 3.2. Fuera del Alcance (Out of Scope)
- [Funcionalidades accesorias o mejoras no prioritarias excluidas explícitamente]
- [Evolutivos futuros que se abordarán en versiones posteriores de la API]

- - -

## 4. Casuísticas e Integración con el Cliente Móvil (Mobile Guidelines)

- **Resiliencia de Red e Idempotencia**:
  - [Comportamiento ante peticiones duplicadas por reintentos de red del dispositivo móvil]
  - [Uso de restricciones de unicidad o transacciones atómicas en PostgreSQL]
- **Formato de Carga Útil y Paginación**:
  - [Límites de tamaño de payload (cuerpo JSON < 100 KiB)]
  - [Estrategia de paginación con limit/offset o cursor si la respuesta es una colección]
- **Estandarización de Errores y Códigos de Dominio**:
  - [Códigos de error específicos emitidos para que el cliente Android los mapee en `strings.xml`]
- **Sincronización y Notificaciones Push**:
  - [Efecto secundario de notificación push con Firebase Cloud Messaging si aplica]
  - [Paridad de contrato con el modelo local offline de Room Database de la app móvil]

- - -

## 5. Contrato de API y Cambios en OpenAPI

- **Método y Ruta**: `[GET | POST | PUT | DELETE | PATCH] /ruta/del/endpoint`
- **Autenticación**: [Publico | Requiere Bearer JWT | Requiere 2FA verificado]
- **Cabeceras Requeridas**: `Authorization`, `x-request-id`, `Content-Type: application/json`
- **Parámetros de Consulta / Ruta**:
  - `param1`: [Tipo y descripción]
- **Cuerpo de la Petición (Request Body)**:
  ```json
  {
    "campo1": "valor",
    "campo2": 123
  }
  ```
- **Respuestas Esperadas**:
  - **200 OK / 201 Created**:
    ```json
    {
      "status": "success",
      "data": {}
    }
    ```
  - **400 Bad Request / 401 Unauthorized / 404 Not Found**:
    ```json
    {
      "status": "error",
      "code": "CODIGO_ERROR",
      "message": "Descripcion del error",
      "requestId": "uuid"
    }
    ```

- - -

## 6. Criterios de Aceptación (Formato Given - When - Then)

### Criterio 1: [Escenario Exitoso Principal]
- **Dado que**: [Estado inicial de autenticación, base de datos y parámetros]
- **Cuando**: [El cliente HTTP envía la petición con los datos correctos]
- **Entonces**: [El servidor procesa la transacción, retorna código 200/201 con el JSON proyectado por el DTO y actualiza la persistencia]

### Criterio 2: [Escenario Alternativo o de Validación Fallida]
- **Dado que**: [Petición con campos inválidos o ausentes según el esquema Zod]
- **Cuando**: [El cliente envía la solicitud al endpoint]
- **Entonces**: [El middleware `validate()` intercepta la petición, rechaza con código 400 y retorna el código de error normalizado sin consultar la base de datos]

- - -

## 7. Decisiones Pendientes [PENDIENTE]

- [ ] [PENDIENTE] Pregunta 1 sobre reglas de negocio o impacto en transacciones
- [ ] [PENDIENTE] Pregunta 2 sobre contrato OpenAPI o compatibilidad con la app Android
