# Directrices de Integracion Movil (Mobile Guidelines - SDMD)

Este documento define los requisitos criticos de red, ciclo de vida movil y compatibilidad de contratos que cualquier agente o desarrollador debe auditar obligatoriamente en MiraiLink Backend antes de aprobar una especificacion (`spec.md`) o un plan tecnico (`plan.md`).

El backend de MiraiLink esta disenado como el proveedor de servicios de la aplicacion movil Android (Kotlin, Jetpack Compose, Room Database y Koin). La interaccion entre ambos debe ser determinista, resiliente y de bajo consumo.

- - -

## 1. Resiliencia de Red, Latencia y Conexiones Moviles

- **Entornos de Red Inestables (3G, 4G, 5G y Wi-Fi intermitente)**:
  - Las conexiones en dispositivos moviles sufren perdidas de cobertura, conmutaciones de red y latencia variable.
  - Los endpoints deben responder en el menor tiempo posible, manteniendo las consultas SQL indexadas y optimizadas.
  - Los timeouts del servidor estan fijados en 30 segundos; los endpoints de consulta deben resolver habitualmente en menos de 100 ms.

- **Tamano Acotado de Carga Util (Payloads)**:
  - El cuerpo de las peticiones JSON entrantes esta limitado estrictamente a 100 KiB para evitar el agotamiento de memoria en dispositivos y servidores.
  - Las respuestas del backend deben ser compactas: evitar retornar datos irrelevantes o duplicados.
  - La carga de imagenes de perfil esta limitada a 5 MiB por archivo y restringida a formatos optimizados para moviles (JPEG, PNG y WebP).

- **Estrategia de Paginacion**:
  - Toda coleccion o lista con potencial de crecimiento (mensajes de chat, feed de swipes, notificaciones) debe proporcionar parametros de paginacion (`limit`, `offset` o cursores basados en fecha/ID).
  - Nunca devolver colecciones completas sin limite, ya que saturan la memoria RAM del cliente movil y pueden provocar cierres forzados por el Low Memory Killer de Android.

- - -

## 2. Compatibilidad con el Modo Offline y Sincronizacion

- **Paridad con el Modo Offline Demo de MiraiLink Android**:
  - La aplicacion Android incluye un modo sandbox offline respaldado por Room Database.
  - Los contratos de datos expuestos por el backend deben mantener concordancia semantica con las entidades locales de la aplicacion movil (`UserEntity`, `MessageEntity`, `ChatEntity`).

- **Idempotencia y Tolerancia a Reintentos**:
  - Cuando un dispositivo movil pierde la conexion durante el envio de una peticion, la aplicacion puede reintentar la solicitud.
  - Las operaciones de mutacion de estado (registro de swipes, envio de mensajes, creacion de reportes) deben ser idempotentes o contar con restricciones de unicidad en base de datos para prevenir duplicidades ante reintentos de red.

- **Marcas de Tiempo Estandarizadas (Timestamps)**:
  - Todas las fechas y horas transmitidas en JSON deben utilizar el formato estandar ISO 8601 en UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
  - Esto previene discrepancias horarias causadas por zonas horarias del dispositivo o cambios de hora estacionales.

- - -

## 3. Formato Estandarizado de Respuestas y Errores

- **Contrato Predecible de Salida**:
  - Todas las respuestas exitosas siguen la estructura JSON estandar con status `success` y sus datos asociados.
  - Todas las respuestas de error utilizan la estructura normalizada:
    ```json
    {
      "status": "error",
      "code": "CODIGO_DE_DOMINIO",
      "message": "Descripcion legible para desarrollo",
      "requestId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
    }
    ```

- **Mapeo a Recursos de UI en la App (`strings.xml`)**:
  - La aplicacion movil Android no debe mostrar el texto de `message` directamente al usuario final en produccion.
  - La app utiliza la propiedad `code` (por ejemplo `INVALID_CREDENTIALS`, `PROFILE_NOT_FOUND`, `USER_BLOCKED`, `RATE_LIMIT_EXCEEDED`) para seleccionar el mensaje localizado en los recursos nativos del sistema.
  - El backend debe conservar los nombres de los codigos de error estables entre versiones para evitar romper el mapeo en versiones anteriores de la app.

- **Correlacion mediante `x-request-id`**:
  - Cada respuesta incluye la cabecera `x-request-id` y la propiedad homonima en el cuerpo JSON, facilitando la resolucion de incidencias entre los registros de la aplicacion movil y los logs del servidor.

- - -

## 4. Notificaciones Push y Comunicacion en Tiempo Real

- **Gestion de Tokens FCM (Firebase Cloud Messaging)**:
  - Los tokens de dispositivo enviados por la app movil mediante `/user/fcm-token` se actualizan transaccionalmente y se invalidan cuando el usuario cierra sesion.
  - El servicio de notificaciones en `src/services/notificationService.js` se inicializa de forma lazy.

- **Desacoplamiento ante Fallos de Entrega Push**:
  - El envio de una notificacion push es una operacion asincrona desacoplada del flujo principal.
  - Un fallo de red temporal con los servidores de Google FCM nunca debe revertir una transaccion de base de datos exitosa (por ejemplo, el mensaje de chat ya guardado o el match concretado).

- - -

## 5. Control de Versiones del Cliente y Ciclo de Vida de Sesion

- **Verificacion de Version Minima de la App**:
  - El endpoint `/app/version` permite al cliente Android verificar si la version instalada requiere una actualizacion obligatoria antes de continuar su uso.

- **Tokens de Acceso y 2FA en Dispositivos Moviles**:
  - Los tokens de acceso expiran tras un periodo controlado y se transmiten mediante la cabecera `Authorization: Bearer <token>`.
  - El proceso de inicio de sesion con 2FA devuelve un token de corta duracion (5 minutos) con `purpose: '2fa-login'`, disenado especificamente para que la pantalla de ingreso de codigo en la aplicacion movil complete el segundo factor sin exponer permisos de acceso prematuros.
  - Al cerrar sesion, el token actual se anade a la lista de revocacion (`revoked_tokens`) para garantizar la invalidacion inmediata en el servidor.
