# Base de datos

## Fuentes

- `src/database/db.sql`: esquema base histórico.
- `src/database/migrations/002_security_hardening.sql`: cambios requeridos por el runtime actual.
- `src/database/db_inserts.sql`: datos de desarrollo.

No hay un framework ni una tabla de historial de migraciones. La operación debe registrar externamente qué scripts se aplicaron.

## Modelo

| Tabla | Responsabilidad |
| --- | --- |
| `users` | Identidad, credenciales, perfil y soft delete |
| `token_blacklist` | JWT revocados con expiración |
| `verification_tokens` | Hashes de códigos de verificación |
| `password_reset_tokens` | Hashes de códigos de reset |
| `user_2fa` | Secreto cifrado y estado 2FA |
| `recovery_codes` | Hash bcrypt y marca de consumo |
| `user_photos` | URL y posición 1-4 por usuario |
| `animes`, `games` | Catálogos |
| `user_anime_interests`, `user_game_interests` | Relaciones de intereses |
| `likes`, `dislikes` | Decisiones dirigidas |
| `matches` | Relación recíproca y estado seen |
| `chats` | Chat privado o grupo |
| `chat_members` | Membresía, rol y last read |
| `messages` | Mensajes por chat |
| `push_tokens` | Token FCM por usuario |
| `reports`, `feedback` | Moderación y comentarios |
| `app_versions` | Política de versión Android |

`auth_provider` admite `email`, `phone` y `google`.

## Migración 002

La migración:

- añade `token_blacklist.expires_at` e índice de limpieza;
- renombra tokens a `token_hash`;
- invalida recovery codes previos y adopta `code_hash`;
- elimina las columnas 2FA duplicadas de `users`;
- impone una foto por posición y usuario;
- impide like, dislike, match o report a uno mismo;
- añade índices para mensajes, members y códigos.

Los usuarios con recovery codes anteriores deben regenerarlos. Antes de aplicar en producción, usa un clon, crea backup y prueba restauración.

## Transacciones del runtime

- Auth reemplaza códigos y actualiza contraseña o verificación en transacción.
- Recovery codes usan `FOR UPDATE` y consumo condicional.
- Chat privado usa advisory lock y transacción para evitar duplicados concurrentes.
- Fotos bloquean filas por usuario, coordinan staging y compensan archivos ante rollback.

## Inicialización

```powershell
createdb mirailink
psql -d mirailink -f src/database/db.sql
psql -d mirailink -f src/database/migrations/002_security_hardening.sql
```

El esquema base todavía representa el punto histórico anterior a la migración, por lo que ambos scripts son necesarios para una base nueva hasta que se consolide un baseline nuevo.

## Integridad pendiente

- Falta una tabla de migraciones y ejecución automatizada.
- La unicidad de chat privado depende del advisory lock de aplicación.
- No hay política incorporada de limpieza de blacklist o tokens expirados.
- No hay índices ni análisis de carga documentados para todas las consultas N+1 de perfiles y matches.
