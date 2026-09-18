# [BORRADOR | APROBADO] Especificacion Funcional: [Nombre de la Funcionalidad]

- **Fecha**: YYYY-MM-DD
- **Estado**: [BORRADOR | APROBADO]
- **Autor / Responsable**: [Nombre o Rol]
- **Modulos / Rutas Afectadas**: [ej. `src/routes/swipe.routes.js`, `src/controllers/swipe.controller.js`]

- - -

## 1. Problema y Objetivo

- **Problema que resuelve**: [Descripcion concisa de la necesidad de negocio, optimizacion de servicio o funcionalidad requerida por los usuarios de MiraiLink]
- **Objetivo**: [Resultado concreto, medible y verificable una vez implementada la funcionalidad en la API]

- - -

## 2. Situacion Actual

- [Como opera la API en este momento sin esta funcionalidad]
- [Endpoints existentes relacionados, limitaciones tecnicas o ausencia del servicio en la arquitectura actual]

- - -

## 3. Alcance de la Funcionalidad

### 3.1. Dentro del Alcance (In Scope)
- [Endpoint o servicio especifico 1]
- [Regla de negocio, validacion o mutacion transaccional 2]
- [Actualizacion de esquemas Zod y proyecciones DTO 3]

### 3.2. Fuera del Alcance (Out of Scope)
- [Funcionalidades accesorias o mejoras no prioritarias excluidas explicitamente]
- [Evolutivos futuros que se abordaran en versiones posteriores de la API]

- - -

## 4. Casuisticas e Integracion con el Cliente Movil (Mobile Guidelines)

- **Resiliencia de Red e Idempotencia**:
  - [Comportamiento ante peticiones duplicadas por reintentos de red del dispositivo movil]
  - [Uso de restricciones de unicidad o transacciones atomicas en PostgreSQL]
- **Formato de Carga Util y Paginacion**:
  - [Limites de tamano de payload (cuerpo JSON < 100 KiB)]
  - [Estrategia de paginacion con limit/offset o cursor si la respuesta es una coleccion]
- **Estandarizacion de Errores y Codigos de Dominio**:
  - [Codigos de error especificos emitidos para que el cliente Android los mapee en `strings.xml`]
- **Sincronizacion y Notificaciones Push**:
  - [Efecto secundario de notificacion push con Firebase Cloud Messaging si aplica]
  - [Paridad de contrato con el modelo local offline de Room Database de la app movil]

- - -

## 5. Contrato de API y Cambios en OpenAPI

- **Metodo y Ruta**: `[GET | POST | PUT | DELETE | PATCH] /ruta/del/endpoint`
- **Autenticacion**: [Publico | Requiere Bearer JWT | Requiere 2FA verificado]
- **Cabeceras Requeridas**: `Authorization`, `x-request-id`, `Content-Type: application/json`
- **Parametros de Consulta / Ruta**:
  - `param1`: [Tipo y descripcion]
- **Cuerpo de la Peticion (Request Body)**:
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

## 6. Criterios de Aceptacion (Formato Given - When - Then)

### Criterio 1: [Escenario Exitoso Principal]
- **Dado que**: [Estado inicial de autenticacion, base de datos y parametros]
- **Cuando**: [El cliente HTTP envia la peticion con los datos correctos]
- **Entonces**: [El servidor procesa la transaccion, retorna codigo 200/201 con el JSON proyectado por el DTO y actualiza la persistencia]

### Criterio 2: [Escenario Alternativo o de Validacion Fallida]
- **Dado que**: [Peticion con campos invalidos o ausentes segun el esquema Zod]
- **Cuando**: [El cliente envia la solicitud al endpoint]
- **Entonces**: [El middleware `validate()` intercepta la peticion, rechaza con codigo 400 y retorna el codigo de error normalizado sin consultar la base de datos]

- - -

## 7. Decisiones Pendientes [PENDIENTE]

- [ ] [PENDIENTE] Pregunta 1 sobre reglas de negocio o impacto en transacciones
- [ ] [PENDIENTE] Pregunta 2 sobre contrato OpenAPI o compatibilidad con la app Android
