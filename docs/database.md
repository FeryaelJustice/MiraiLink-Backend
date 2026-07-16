# Modelo de datos

## Fuente y estado

El esquema está definido en `src/database/db.sql` como un script de creación completo. No existe una herramienta de migraciones ni un historial versionado. El script crea 21 tablas y un enum. `src/database/db_inserts.sql` añade datos de desarrollo y no debe utilizarse como seed de producción.

## Relaciones principales

```text
users
  -> user_photos
  -> user_anime_interests -> animes
  -> user_game_interests -> games
  -> likes y dislikes
  -> matches
  -> chat_members -> chats -> messages
  -> push_tokens
  -> reports y feedback
  -> verification_tokens y password_reset_tokens
  -> user_2fa -> recovery_codes
```

## Tablas

| Tabla | Clave | Función | Relaciones o restricciones destacadas |
| --- | --- | --- | --- |
| `users` | UUID | Identidad, credenciales y perfil | `username` único, email y teléfono únicos, soft delete. |
| `token_blacklist` | Token JWT | Invalidación anticipada | Token como clave primaria. |
| `verification_tokens` | UUID | Códigos de verificación | Tipo `email` o `sms`, expiración, cascade por usuario. |
| `password_reset_tokens` | UUID | Códigos de recuperación | Expiración y cascade por usuario. |
| `user_photos` | UUID | Fotos del perfil | Posición entre 1 y 4. No hay unique por usuario y posición. |
| `animes` | UUID | Catálogo de anime | Nombre único. |
| `games` | UUID | Catálogo de juegos | Nombre único. |
| `user_anime_interests` | Usuario y anime | Relación de intereses | Clave primaria compuesta. |
| `user_game_interests` | Usuario y juego | Relación de intereses | Clave primaria compuesta. |
| `likes` | UUID | Like dirigido | Par origen y destino único. |
| `dislikes` | UUID | Descarte dirigido | Par origen y destino único. |
| `matches` | UUID | Compatibilidad mutua | Par de usuarios único, flags de visto. |
| `chats` | UUID | Chat privado o grupo | Tipo restringido, creador nullable al borrarse. |
| `chat_members` | Chat y usuario | Miembros, rol y lectura | Clave primaria compuesta, rol admin o member. |
| `messages` | UUID | Mensajes de chat | Texto obligatorio, `created_at` y `sent_at` duplican concepto temporal. |
| `push_tokens` | UUID | Un token FCM por usuario | Plataforma android, ios o web. |
| `reports` | UUID | Reporte entre usuarios | Referencias pasan a null al borrar usuario. |
| `feedback` | UUID | Feedback de producto | Máximo 10000 caracteres, usuario nullable. |
| `user_2fa` | Usuario UUID | Secreto cifrado y estado 2FA | Una fila por usuario. |
| `recovery_codes` | Serial | Códigos alternativos 2FA | Se guardan en texto plano y tienen flag `used`. |
| `app_versions` | Plataforma | Política de versión móvil | Códigos mínimos y últimos, URL de tienda. |

## Enum

`auth_provider` admite `email`, `phone` y `google`. El código de registro actual solo crea usuarios con `email`.

## Integridad que sí existe

- Claves foráneas en los dominios principales.
- Cascade para datos dependientes de usuario, chat o catálogo cuando corresponde.
- Unicidad de username, email, teléfono, likes, dislikes y matches.
- Límites de posición de fotos, tipo de chat, rol, plataforma y longitud de feedback.
- Índices explícitos para lados de likes y matches.

## Brechas del esquema

- Falta `UNIQUE (user_id, position)` en `user_photos`, aunque el código asume una foto por posición.
- Falta `CHECK (from_user_id <> to_user_id)` en likes y dislikes.
- Falta `CHECK (user1_id <> user2_id)` y una normalización impuesta por la base para matches.
- No hay índices explícitos para historial de mensajes por `chat_id` y fecha, miembros por usuario, feed o expiración de tokens.
- `users.two_fa_enabled` y `users.two_fa_secret` duplican conceptos de `user_2fa`, pero el flujo activo usa la segunda tabla.
- `messages.created_at` y `messages.sent_at` pueden divergir.
- Los tokens de verificación y reset no tienen flag de uso ni unicidad y pueden acumularse.
- Los recovery codes se almacenan sin hash.
- Los reportes permiten razón nula en SQL, aunque el controlador la exige.
- `push_tokens.user_id` ya se declara único y luego recibe otra restricción única redundante.

## Limitaciones operativas del SQL

- `CREATE TYPE` y la mayoría de `CREATE TABLE` no usan guardas de idempotencia.
- El bloque de `ALTER TABLE` presupone nombres de constraints generados por PostgreSQL.
- No hay transacciones alrededor de la creación completa del esquema.
- No hay versión de esquema ni rollback.
- Los datos de desarrollo contienen identificadores y relaciones fijas.

## Consultas y exposición de datos

La mayoría de consultas usa parámetros `$1`, `$2` y similares, lo que reduce riesgo de inyección SQL. Sin embargo, `getFeed` y `getMatches` seleccionan filas completas de `users` y las devuelven. Esto incluye columnas internas. La corrección debe hacerse con proyecciones explícitas o DTO antes de tratar la API como pública.

## Estrategia recomendada

1. Adoptar una herramienta de migraciones compatible con PostgreSQL y ES modules.
2. Convertir `db.sql` en una migración base inmutable.
3. Añadir las restricciones e índices pendientes mediante migraciones posteriores.
4. Separar seeds mínimos, datos de demo y datos de test.
5. Probar migración hacia delante, rollback cuando exista y arranque desde base vacía en CI.
6. Evitar cambios manuales de esquema que no queden representados en el repositorio.
