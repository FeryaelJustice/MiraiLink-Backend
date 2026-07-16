# Estrategia de testing

## Estado actual

- No existe carpeta de tests.
- `npm test` es un marcador que siempre imprime un mensaje.
- `npm run lint` falla porque ESLint no está declarado ni configurado.
- Los 34 archivos JavaScript pasan `node --check` con Node.js 24 en la revisión documental.
- La aplicación no exporta una instancia Express, por lo que no puede cargarse en Supertest sin abrir un puerto e inicializar Firebase.

No debe interpretarse el éxito de `npm test` como cobertura ni validación.

## Objetivos

1. Detectar regresiones de contrato HTTP.
2. Probar autorización por recurso, no solo autenticación.
3. Verificar consistencia de transacciones y relaciones PostgreSQL.
4. Aislar Firebase, SMTP y filesystem.
5. Validar OpenAPI frente a respuestas reales.
6. Ejecutar una suite determinista en CI.

## Pirámide propuesta

### Tests unitarios

Adecuados para funciones puras o casi puras:

- `normalizeBirthdate` con formatos válidos, inválidos, UTC y futuro.
- `encrypt` y `decrypt` con claves de test y errores de longitud.
- Construcción y truncado de payload FCM.
- Reglas de nickname, bio, género, posiciones y payloads cuando se extraigan de los controladores.
- Formateo de DTO de chat cuando se exporte o extraiga.

### Tests de integración HTTP y PostgreSQL

Son la parte principal. Stack sugerido:

- Vitest para ejecución ESM.
- Supertest para Express.
- PostgreSQL efímero mediante Testcontainers, o una base de test aislada si Docker no está disponible.
- Migraciones o el esquema base para preparar cada suite.

Cada suite debe limpiar datos o usar una transacción aislada. No debe conectarse a una base de desarrollo compartida.

### Tests de contrato

- Validar request y response contra `docs/openapi.yaml`.
- Detectar endpoints presentes en rutas pero ausentes en OpenAPI.
- Detectar propiedades internas como `password_hash` en respuestas públicas.
- Guardar ejemplos de error estables.

### Tests de sistema

- Arranque con variables válidas.
- Fallo claro con configuración ausente.
- Flujo registro, verificación, login, perfil, swipe, match y mensaje.
- Upload multipart real en un directorio temporal.
- Doble réplica solo cuando se externalice el almacenamiento.

## Refactor mínimo para hacer tests

1. Crear `createApp(dependencies)` que configure Express y lo devuelva sin escuchar.
2. Mover `app.listen` a un archivo `server.js`.
3. Inyectar pool, correo, Firebase y raíz de uploads.
4. Evitar inicialización de Firebase en import time.
5. Exportar validaciones o servicios extraídos de los controladores.
6. Añadir scripts reales `test`, `test:watch`, `test:coverage` y `lint`.

## Matriz prioritaria por endpoint

| Prioridad | Area | Casos mínimos |
| --- | --- | --- |
| P0 | Auth middleware | Sin token, token inválido, expirado, blacklisted repetidas veces, usuario borrado y no verificado. |
| P0 | Feed y matches | Ninguna respuesta contiene hash, secreto, email privado ni teléfono. |
| P0 | Chats | Solo miembros pueden listar mensajes y miembros o leer historial. |
| P0 | 2FA | Login exige segundo factor cuando está habilitado y solo emite JWT tras validarlo. |
| P1 | Registro y login | Campos ausentes, duplicados, password inválido, usuario borrado y respuesta correcta. |
| P1 | Password reset | Token válido, inválido, expirado, reutilizado y rate limit. |
| P1 | Verificación | Email, SMS no implementado, expiración, reuso y autorización. |
| P1 | Perfil multipart | Solo texto, cada combinación de fotos, reemplazo, borrado, rollback y archivo huérfano. |
| P1 | Like y match | Auto-like, duplicado, like recíproco y concurrencia. |
| P1 | Chat send | Chat existente, nuevo, receptor inválido, texto vacío y rollback. |
| P2 | Catálogos y versión | Vacío, orden, cache header y no configurado. |
| P2 | Feedback y reportes | Límites, campos ausentes, usuario inexistente y caracteres Unicode. |
| P2 | FCM | Sin token, token inválido, provider falla y datos convertidos a string. |

## Casos detallados de archivos

- Rechazar extensiones y MIME no permitidos.
- Rechazar tamaño individual y total excesivo.
- Rechazar posiciones fuera de 1 a 4.
- Mantener unicidad de posición bajo concurrencia.
- Borrar el archivo nuevo si la transacción SQL falla.
- No borrar el archivo anterior hasta que el reemplazo sea confirmable.
- Normalizar paths y evitar traversal.
- Usar un directorio temporal, nunca `src/assets` real, en tests.

## Calidad no funcional

- Carga básica sobre feed, matches y chats para revelar consultas N+1.
- Concurrencia en creación de chat privado y matches.
- Fuzzing de JSON y multipart.
- Pruebas de expiración con reloj inyectable.
- Pruebas de zona horaria en cambios de horario de verano.
- Cobertura de error de PostgreSQL, disco, SMTP y FCM.

## Criterio de entrada a producción

- Todos los P0 y P1 corregidos y cubiertos.
- Cero secretos o hashes en respuestas.
- OpenAPI validada en CI.
- Suite de integración sobre PostgreSQL real.
- Lint y tests obligatorios en pull requests.
- Cobertura de líneas como señal secundaria, con objetivo inicial de 80 por ciento en servicios y middleware críticos.
- Un test de restauración o recreación de base desde migraciones.
