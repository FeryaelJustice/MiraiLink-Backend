# Arquitectura

## Resumen ejecutivo

MiraiLink Backend es una aplicación Node.js monolítica organizada por carpetas técnicas. Express recibe las peticiones, las rutas aplican middleware y delegan en controladores, y los controladores ejecutan directamente consultas SQL mediante un pool PostgreSQL compartido. No existe una capa de dominio o repositorios independiente. Las integraciones SMTP, Firebase y almacenamiento local se invocan desde utilidades o servicios.

Flujo HTTP actual:

```text
Cliente
  -> Express y middleware global
  -> Router de la funcionalidad
  -> authenticateToken cuando corresponde
  -> Controlador
  -> PostgreSQL, filesystem, SMTP o Firebase
  -> Respuesta HTTP
  -> errorHandler solo si el error llega mediante next(error)
```

## Arranque

`src/app.js` realiza todo el arranque como efecto lateral:

1. Importa Express, middleware y todos los routers.
2. Importa la configuración de Firebase, que carga `src/serviceAccountKey.json` e inicializa Firebase Admin.
3. Configura CORS con `process.env.ORIGIN`.
4. Habilita JSON, compresión y Helmet.
5. Expone `src/public` en `/static` y `src/assets` en `/assets`.
6. Monta las rutas bajo `/api`.
7. Instala respuestas 404 y el middleware global de errores.
8. Desactiva `x-powered-by`.
9. Invoca `app.listen` directamente.

Consecuencia: importar la aplicación también intenta inicializar Firebase y abrir un puerto. Para tests y despliegues más controlables conviene separar `createApp()` de `startServer()`.

## Capas reales

### Entrada HTTP

- `src/app.js`: composición del servidor.
- `src/routes`: paths, verbos HTTP, autenticación y Multer.
- `src/middleware/auth.middleware.js`: JWT, blacklist, existencia y verificación de cuenta.
- `src/middleware/error.middleware.js`: fallback de error 500.

### Aplicación y negocio

- `src/controllers`: contiene a la vez parsing de input, validaciones parciales, reglas de negocio, consultas SQL, transacciones y construcción de respuestas.
- `src/services/notificationService.js`: acceso a tokens FCM y envío de push.

### Infraestructura

- `src/models/db.js`: único pool PostgreSQL global.
- `src/config/firebaseAdmin.js`: inicialización global de Firebase Admin.
- `src/utils/mailer.js`: transporte SMTP global.
- `src/utils/photoUploader.js`: coordinación de base de datos y filesystem.
- `src/utils/cryptoUtils.js`: AES para secretos 2FA.
- `src/assets`: almacenamiento local de uploads, fuera del alcance de cambios y documentación interna.

### Tiempo real

`src/sockets/socketHandler.js` contiene un prototipo Socket.IO, pero `src/app.js` no crea un servidor HTTP explícito ni llama a `setupSocketIO`. Además, el prototipo usa `messages.match_id`, mientras que el esquema vigente usa `messages.chat_id`. Por tanto, el tiempo real no forma parte del runtime actual.

## Dominios funcionales

| Dominio | Entrada | Responsabilidad | Persistencia o integración |
| --- | --- | --- | --- |
| Versión de app | `/api/app` | Versión mínima y última de Android | `app_versions` |
| Autenticación | `/api/auth` | Registro, login, logout, verificación, reset y 2FA | `users`, tokens, JWT, SMTP |
| Perfil | `/api/user`, `/api/users` | Perfil propio, perfiles ajenos, edición, borrado y FCM | `users`, intereses, fotos, `push_tokens` |
| Fotos | `/api/user/photos` | Listar, subir, reemplazar y borrar | `user_photos`, filesystem |
| Descubrimiento | `/api/swipe` | Feed, like y dislike | `users`, intereses, `likes`, `dislikes` |
| Matches | `/api/match` | Listado y estado visto | `matches` y perfiles |
| Chat | `/api/chats` | Chats, miembros, mensajes y lectura | `chats`, `chat_members`, `messages`, FCM |
| Catálogo | `/api/catalog` | Anime y videojuegos | `animes`, `games` |
| Moderación | `/api/report` | Reportes entre usuarios | `reports` |
| Producto | `/api/feedback` | Feedback textual | `feedback` |

## Flujos importantes

### Autenticación JWT

```text
register o login
  -> consulta de usuario
  -> bcrypt
  -> jwt.sign con expiración de 24 horas
  -> cliente guarda token
  -> Authorization Bearer en rutas protegidas
  -> authenticateToken consulta blacklist y usuario
  -> req.user y req.token
```

El middleware exige cuenta verificada salvo cuando se llama como `authenticateToken(true)`, que hoy solo se usa en logout. El comportamiento de blacklist tiene un defecto grave documentado en [security-review.md](security-review.md).

### Actualización de perfil

```text
multipart/form-data
  -> Multer escribe archivos en carpeta del usuario
  -> updateProfile abre transacción PostgreSQL
  -> actualiza datos e intereses
  -> reemplaza registros y archivos de fotos
  -> reordena posiciones
  -> commit
  -> limpia archivos sin registro
```

La base de datos y el filesystem no comparten una transacción atómica. Un fallo intermedio puede dejar diferencias entre ambos.

### Like y match

```text
POST /api/swipe/like
  -> inserta like de A hacia B
  -> busca like previo de B hacia A
  -> si existe, inserta match ordenando ambos UUID
  -> responde match true o false
```

### Mensaje privado

```text
POST /api/chats/send
  -> busca chat privado entre emisor y receptor
  -> crea chat y miembros si no existe
  -> inserta mensaje
  -> responde 201
  -> intenta enviar FCM en segundo plano
```

No hay una transacción que agrupe creación de chat, miembros y mensaje.

## Estado de las fronteras

### Bien delimitado

- Las rutas están separadas por funcionalidad.
- Todas las consultas usan parámetros posicionales para valores proporcionados por el cliente.
- El pool PostgreSQL está centralizado.
- Las constantes de paths de fotos se comparten.

### Acoplamiento actual

- Los controladores mezclan HTTP, reglas, SQL y serialización.
- Firebase se inicializa aunque el flujo no lo necesite.
- La configuración se lee directamente desde `process.env` en import time.
- La subida de archivos mezcla Multer, SQL y borrado físico.
- Los DTO no están definidos, por lo que varias respuestas reflejan columnas internas.
- Hay código no conectado que usa un modelo de datos antiguo.

## Evolución recomendada

1. Corregir primero los riesgos P0 y P1.
2. Separar creación de app y escucha del puerto.
3. Introducir validación de schemas en el borde HTTP.
4. Definir DTO de salida y evitar `SELECT *`.
5. Extraer repositorios y servicios de negocio de los controladores más grandes.
6. Sustituir el SQL inicial por migraciones versionadas.
7. Abstraer correo, FCM y filesystem para poder probarlos.
8. Decidir si Socket.IO se corrige y activa o se elimina.

Esta evolución puede hacerse por dominios sin reescribir todo el backend.
