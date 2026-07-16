# MiraiLink Backend

Backend de MiraiLink, una aplicación social y de citas orientada a personas interesadas en videojuegos y anime. La API está implementada con Node.js, Express y PostgreSQL e incluye autenticación, perfiles, descubrimiento, matches, chats, catálogos, reportes, feedback y notificaciones push.

## Estado real del proyecto

El repositorio contiene un prototipo funcional, pero todavía no debe considerarse listo para producción. La API expone 46 endpoints bajo `/api`, el chat REST está conectado y el esquema PostgreSQL cubre los dominios principales. No hay tests automatizados, el lint no está operativo, Socket.IO está desactivado y existen riesgos de seguridad y consistencia descritos en [docs/security-review.md](docs/security-review.md).

La documentación distingue de forma explícita entre:

- Comportamiento observado en el código actual.
- Contrato que un cliente puede consumir hoy.
- Riesgos que deben corregirse antes de publicar la API.
- Mejoras propuestas, que no están implementadas todavía.

## Documentación

- [Indice general](docs/README.md)
- [Arquitectura](docs/architecture.md)
- [Mapa del código](docs/codebase-map.md)
- [Referencia de módulos y funciones](docs/code-reference.md)
- [Referencia de la API](docs/api-reference.md)
- [Especificación OpenAPI 3.1](docs/openapi.yaml)
- [Modelo de datos](docs/database.md)
- [Runtime y configuración](docs/runtime-and-configuration.md)
- [Estrategia de testing](docs/testing-strategy.md)
- [Revisión de seguridad y riesgos](docs/security-review.md)

## Tecnologías observadas

- Node.js con módulos ES.
- Express 5.
- PostgreSQL mediante `pg.Pool`.
- JWT y bcrypt para autenticación.
- Speakeasy para TOTP y 2FA.
- Multer para subida de fotos.
- Nodemailer para correo SMTP.
- Firebase Admin para FCM.
- Socket.IO presente en el código, pero no activado en el arranque.

## Requisitos

- Node.js 20 o superior. El import JSON con atributos usado por Firebase no es compatible con la promesa anterior de Node.js 18.
- PostgreSQL 15 o superior.
- npm.
- Un archivo privado `src/serviceAccountKey.json` válido para Firebase Admin. El servidor lo importa durante el arranque aunque no se envíen notificaciones.
- Credenciales SMTP si se utilizan verificación y recuperación de contraseña.

## Puesta en marcha

1. Instala las dependencias:

```powershell
npm install
```

2. Crea la base de datos y carga el esquema:

```powershell
psql -U postgres -d mirailink -f src/database/db.sql
psql -U postgres -d mirailink -f src/database/db_inserts.sql
```

`db_inserts.sql` contiene datos de desarrollo. No debe ejecutarse en producción. El SQL no es un sistema de migraciones y no es seguro repetirlo sobre una base ya inicializada.

3. Copia `.env.example` a `.env` y sustituye todos los valores de ejemplo:

```powershell
Copy-Item .env.example .env
```

Genera valores criptográficos para 2FA:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('node:crypto').randomBytes(16).toString('hex'))"
```

4. Coloca la credencial de Firebase en `src/serviceAccountKey.json`.

5. Inicia el servidor:

```powershell
npm run dev
```

La URL predeterminada es `http://localhost:3000`. La API vive bajo `http://localhost:3000/api`.

## Comandos disponibles

| Comando | Estado | Uso |
| --- | --- | --- |
| `npm run dev` | Configurado para Windows | Arranca Nodemon con `.env` y `NODE_ENV=development`. |
| `npm start` | Configurado para Windows | Arranca Node con `.env` y `NODE_ENV=production`. |
| `npm run build` | Marcador de posición | No compila ni genera artefactos. |
| `npm test` | Marcador de posición | No ejecuta tests. |
| `npm run lint` | No operativo | El proyecto no declara ESLint ni incluye configuración. |

## Estructura principal

```text
src/
  app.js                 Arranque de Express y montaje de rutas
  config/                Integraciones que se inicializan al arrancar
  consts/                Constantes compartidas
  controllers/           Handlers HTTP y lógica de negocio
  database/              Esquema y datos de desarrollo PostgreSQL
  middleware/            Autenticación y errores
  models/                 Pool de PostgreSQL
  public/                 Contenido estático no sensible
  routes/                 Definición de rutas Express
  services/               Notificaciones push
  sockets/                Prototipo Socket.IO no conectado
  utils/                  Cifrado, fechas, correo y fotos
```

`src/assets` almacena archivos subidos y queda fuera del alcance de la documentación y de los cambios de mantenimiento. No debe tratarse como código fuente ni incluirse en Git.

## Autenticación básica

Las rutas protegidas esperan un JWT en:

```http
Authorization: Bearer <token>
```

El token se obtiene en `POST /api/auth/register` o `POST /api/auth/login`. El flujo 2FA está implementado parcialmente y todavía no forma una barrera completa durante el login. Consulta [docs/api-reference.md](docs/api-reference.md) antes de integrar un cliente.

## Calidad y contribución

Antes de ampliar funcionalidades conviene ejecutar el plan de [docs/testing-strategy.md](docs/testing-strategy.md) y resolver primero los riesgos P0 y P1 de [docs/security-review.md](docs/security-review.md). Los commits siguen Conventional Commits con asuntos breves e imperativos.

## Licencia

ISC, según `package.json`.
