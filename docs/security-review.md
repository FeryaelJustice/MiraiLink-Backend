# Revisión de seguridad y riesgos

## Alcance

Revisión estática del código, rutas, configuración y SQL. No es una auditoría de penetración y no se ejecutó contra un entorno real. Los hallazgos describen el comportamiento observado y no implican que hayan sido explotados.

## Escala

- P0: exposición o bypass crítico. Bloquea publicación.
- P1: riesgo alto o corrupción probable. Corregir antes de producción.
- P2: riesgo medio, deuda operativa o contrato frágil.
- P3: mejora de mantenibilidad.

## Hallazgos P0

### SEC-001: el feed y los matches pueden exponer credenciales y datos internos

`getFeed` usa `SELECT * FROM users` y devuelve cada fila completa. `getMatches` usa `SELECT u.*`. La tabla incluye `password_hash`, email, teléfono, secretos 2FA heredados y flags internos.

Impacto: un usuario autenticado puede recibir hashes y datos privados de otros usuarios.

Corrección: usar una lista explícita de columnas públicas y un DTO de salida compartido. Añadir tests que fallen ante cualquier propiedad sensible.

### SEC-002: la blacklist invalida el JWT solo una vez

Cuando el middleware encuentra un token en `token_blacklist`, lo elimina y devuelve 401. En el siguiente intento el mismo JWT ya no está en la tabla y puede volver a ser válido hasta expirar.

Impacto: logout no revoca de forma duradera el token.

Corrección: no eliminar el token al comprobarlo. Guardar también expiración y limpiar en un proceso separado, o migrar a sesiones o tokens con identificador revocable.

### SEC-003: endpoints de chat no autorizan membresía

Los endpoints de mensajes y miembros reciben `chatId`, pero no comprueban que `req.user.id` pertenezca al chat. El historial por usuario tampoco demuestra autorización más allá de buscar un chat que incluya ambos ids.

Impacto: posible lectura de mensajes o miembros mediante UUID conocido o filtrado.

Corrección: centralizar una guardia `requireChatMember`, filtrar toda consulta por usuario autenticado y añadir casos IDOR.

### SEC-004: el segundo factor no protege el login

`POST /api/auth/login` emite inmediatamente un JWT válido sin consultar `user_2fa`. `loginVerify2FALastStep` es público, solo devuelve un mensaje y no participa en la emisión del token.

Impacto: una cuenta con 2FA habilitado sigue siendo accesible con email o username y password.

Corrección: emitir primero un challenge de vida corta y entregar el JWT final solo tras TOTP o recovery code válido.

## Hallazgos P1

### SEC-005: estado 2FA consultable y verificable por userId público

`/2fa/status` y `/2fa/loginVerifyLastStep` no requieren autenticación ni challenge ligado a un intento de login. Permiten enumeración y fuerza bruta sin rate limit.

Corrección: asociarlos a un challenge firmado de login, limitar intentos y evitar respuestas enumerables.

### SEC-006: no hay rate limiting

Registro, login, reset, verificación, 2FA, borrado público y feedback no tienen limitación.

Corrección: límites por IP, usuario, cuenta y operación, con almacenamiento compartido en despliegues distribuidos.

### SEC-007: uploads sin límites ni filtro de tipo

Multer acepta el nombre y extensión original sin `limits` ni `fileFilter`. Los archivos quedan servidos bajo `/assets`.

Corrección: allowlist MIME y extensión comprobada por contenido, límite de tamaño y cantidad, nombres controlados, almacenamiento fuera del árbol de código y cabeceras seguras.

### SEC-008: AES-CBC usa un IV global fijo

Todos los secretos 2FA se cifran con la misma clave y el mismo IV de entorno. AES-CBC no autentica el ciphertext.

Corrección: usar cifrado autenticado, por ejemplo AES-GCM, con nonce aleatorio por registro y rotación de claves.

### SEC-009: recovery codes en texto plano

`recovery_codes.code` almacena el valor original.

Corrección: guardar un hash resistente y comparar mediante hash, igual que una contraseña de un solo uso.

### SEC-010: verificación y reset permiten enumeración y abuso de correo

Las respuestas distinguen cuentas inexistentes y la solicitud de verificación acepta `userId` sin autenticación. El envío SMTP no se espera antes de responder.

Corrección: respuestas neutras, rate limit, challenge o sesión, invalidación de códigos previos y entrega observable.

### SEC-011: validación de input incompleta

No hay schemas centrales. Registro, login, chat, likes, matches y FCM aceptan campos sin comprobar tipo, longitud o formato de forma consistente.

Corrección: validar params, query, body y multipart en rutas con schemas versionados.

### SEC-012: configuración de ejemplo contenía secretos débiles

El ejemplo histórico incluía contraseña SMTP y claves cortas con apariencia real. Aunque fueran de prueba, inducen a copiar valores inseguros.

Corrección: usar placeholders inequívocos, rotar cualquier credencial que alguna vez fuera válida y añadir escaneo de secretos en CI.

## Hallazgos P2

### SEC-013: errores inconsistentes y potencialmente verbosos

El middleware de auth incluye `error: err` en 401. El 404 es texto plano y otros controladores capturan 500 por su cuenta.

Corrección: un envelope estable con `code`, `message`, `requestId` y detalles solo en logs internos.

### SEC-014: datos de perfil no usan política de privacidad

El historial de chat devuelve email de sender y receiver. Otros endpoints devuelven campos distintos sin una definición explícita de público, privado o interno.

Corrección: DTO por contexto y pruebas de privacidad.

### SEC-015: filesystem y base no son atómicos

Actualizar fotos combina escritura previa de Multer, transacción SQL y limpieza posterior. Los retornos tempranos dentro de una transacción también pueden dejar trabajo abierto hasta liberar la conexión.

Corrección: staging temporal, validación previa, compensación explícita y rollback antes de toda salida.

### SEC-016: creación de chat y mensaje no es transaccional

Un fallo puede crear chat sin miembros completos o miembros sin mensaje.

Corrección: transacción y restricción que impida múltiples chats privados equivalentes.

### SEC-017: fecha actual con offset fijo

`getCorrectNow` suma siempre dos horas. España alterna offset según horario estacional y PostgreSQL puede interpretar timestamps de otro modo.

Corrección: usar UTC para almacenamiento y comparación, con zona solo en presentación.

### SEC-018: dependencia obligatoria de Firebase durante el arranque

El servidor importa una credencial fija aunque no use FCM. Un problema de credencial impide servir incluso endpoints no relacionados.

Corrección: inicialización validada e inyectable, con política clara de fallo o degradación.

### SEC-019: código muerto incompatible

Socket.IO escribe `match_id`, pero la tabla usa `chat_id`. `message.controller.js` usa tablas y funciones ausentes.

Corrección: eliminarlo o migrarlo y cubrirlo con tests antes de activarlo.

### SEC-020: CORS y estáticos requieren endurecimiento

Solo se documenta un origen, no hay validación al faltar `ORIGIN` y los uploads se sirven directamente. Helmet ayuda, pero no reemplaza una política específica para contenido subido.

Corrección: validación de configuración, allowlist explícita y entrega de media desde un servicio seguro.

## Hallazgos de calidad con efecto en seguridad

- No hay tests ni lint operativo.
- No hay lockfile en el estado actual del working tree.
- No hay logs estructurados ni request id.
- No hay health checks ni observabilidad.
- No hay pipeline de escaneo de dependencias o secretos.
- No hay migraciones ni entorno reproducible documentado.

## Orden de remediación

1. Cerrar SEC-001 a SEC-004 y añadir tests de regresión.
2. Introducir validación y rate limiting.
3. Endurecer uploads, reset, verificación y 2FA.
4. Unificar errores y DTO de privacidad.
5. Asegurar transacciones y modelo de datos.
6. Hacer reproducibles lint, tests, migraciones y CI.
7. Decidir el futuro de Socket.IO y del controlador huérfano.

## Criterio de cierre

Un hallazgo no se considera cerrado solo por cambiar el código. Debe existir una prueba automatizada que reproduzca el fallo anterior y demuestre el comportamiento corregido.
