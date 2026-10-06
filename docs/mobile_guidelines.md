# Directrices de Integración Móvil (Mobile Guidelines - SDMD)

Este documento define los requisitos críticos de red, ciclo de vida móvil y compatibilidad de contratos que cualquier agente o desarrollador debe auditar obligatoriamente en MiraiLink Backend antes de aprobar una especificación (`spec.md`) o un plan técnico (`plan.md`).

El backend de MiraiLink está diseñado como el proveedor de servicios de la aplicación móvil Android (Kotlin, Jetpack Compose, Room Database y Koin). La interacción entre ambos debe ser determinista, resiliente y de bajo consumo.

- - -

## 1. Resiliencia de Red, Latencia y Conexiones Móviles

- **Entornos de Red Inestables (3G, 4G, 5G y Wi-Fi intermitente)**:
  - Las conexiones en dispositivos móviles sufren perdidas de cobertura, conmutaciones de red y latencia variable.
  - Los endpoints deben responder en el menor tiempo posible, manteniendo las consultas SQL indexadas y optimizadas.
  - Los timeouts del servidor están fijados en 30 segundos; los endpoints de consulta deben resolver habitualmente en menos de 100 ms.

- **Tamaño Acotado de Carga Útil (Payloads)**:
  - El cuerpo de las peticiones JSON entrantes está limitado estrictamente a 100 KiB para evitar el agotamiento de memoria en dispositivos y servidores.
  - Las respuestas del backend deben ser compactas: evitar retornar datos irrelevantes o duplicados.
  - La carga de imágenes de perfil está limitada a 5 MiB por archivo y restringida a formatos optimizados para móviles (JPEG, PNG y WebP).

- **Estrategia de Paginación**:
  - Toda colección o lista con potencial de crecimiento (mensajes de chat, feed de swipes, notificaciones) debe proporcionar parámetros de paginación (`limit`, `offset` o cursores basados en fecha/ID).
  - Nunca devolver colecciones completas sin límite, ya que saturan la memoria RAM del cliente móvil y pueden provocar cierres forzados por el Low Memory Killer de Android.

- - -

## 2. Compatibilidad con el Modo Offline y Sincronización

- **Paridad con el Modo Offline Demo de MiraiLink Android**:
  - La aplicación Android incluye un modo sandbox offline respaldado por Room Database.
  - Los contratos de datos expuestos por el backend deben mantener concordancia semántica con las entidades locales de la aplicación móvil (`UserEntity`, `MessageEntity`, `ChatEntity`).

- **Idempotencia y Tolerancia a Reintentos**:
  - Cuando un dispositivo móvil pierde la conexión durante el envío de una petición, la aplicación puede reintentar la solicitud.
  - Las operaciones de mutación de estado (registro de swipes, envío de mensajes, creación de reportes) deben ser idempotentes o contar con restricciones de unicidad en base de datos para prevenir duplicidades ante reintentos de red.

- **Marcas de Tiempo Estandarizadas (Timestamps)**:
  - Todas las fechas y horas transmitidas en JSON deben utilizar el formato estándar ISO 8601 en UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
  - Esto previene discrepancias horarias causadas por zonas horarias del dispositivo o cambios de hora estacionales.

- - -

## 3. Formato Estandarizado de Respuestas y Errores

- **Contrato Predecible de Salida**:
  - Todas las respuestas exitosas siguen la estructura JSON estándar con status `success` y sus datos asociados.
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
  - La aplicación móvil Android no debe mostrar el texto de `message` directamente al usuario final en producción.
  - La app utiliza la propiedad `code` (por ejemplo `INVALID_CREDENTIALS`, `PROFILE_NOT_FOUND`, `USER_BLOCKED`, `RATE_LIMIT_EXCEEDED`) para seleccionar el mensaje localizado en los recursos nativos del sistema.
  - El backend debe conservar los nombres de los códigos de error estables entre versiones para evitar romper el mapeo en versiones anteriores de la app.

- **Correlación mediante `x-request-id`**:
  - Cada respuesta incluye la cabecera `x-request-id` y la propiedad homónima en el cuerpo JSON, facilitando la resolución de incidencias entre los registros de la aplicación móvil y los logs del servidor.

- - -

## 4. Notificaciones Push y Comunicación en Tiempo Real

- **Gestión de Tokens FCM (Firebase Cloud Messaging)**:
  - Los tokens de dispositivo enviados por la app móvil mediante `/user/fcm-token` se actualizan transaccionalmente y se invalidan cuando el usuario cierra sesión.
  - El servicio de notificaciones en `src/services/notificationService.js` se inicializa de forma lazy.

- **Desacoplamiento ante Fallos de Entrega Push**:
  - El envío de una notificación push es una operación asíncrona desacoplada del flujo principal.
  - Un fallo de red temporal con los servidores de Google FCM nunca debe revertir una transacción de base de datos exitosa (por ejemplo, el mensaje de chat ya guardado o el match concretado).

- - -

## 5. Control de Versiones del Cliente y Ciclo de Vida de Sesión

- **Verificación de Versión Mínima de la App**:
  - El endpoint `/app/version` permite al cliente Android verificar si la versión instalada requiere una actualización obligatoria antes de continuar su uso.

- **Tokens de Acceso y 2FA en Dispositivos Móviles**:
  - Los tokens de acceso expiran tras un periodo controlado y se transmiten mediante la cabecera `Authorization: Bearer <token>`.
  - El proceso de inicio de sesión con 2FA devuelve un token de corta duración (5 minutos) con `purpose: '2fa-login'`, diseñado específicamente para que la pantalla de ingreso de código en la aplicación móvil complete el segundo factor sin exponer permisos de acceso prematuros.
  - Al cerrar sesión, el token actual se añade a la lista de revocación (`revoked_tokens`) para garantizar la invalidación inmediata en el servidor.
