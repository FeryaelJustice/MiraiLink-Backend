# MiraiLink Backend

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![Express](https://img.shields.io/badge/Express-5.1+-lightgrey.svg)](https://expressjs.com/)

MiraiLink es una aplicación de citas y red social diseñada específicamente para gamers y fanáticos del anime. Este repositorio contiene el backend de la aplicación, construido con Node.js, Express y PostgreSQL.

## 🚀 Características Principales

- **Autenticación Completa**: Registro, login, verificación por email, reset de contraseña
- **2FA (Autenticación de Dos Factores)**: Implementado con TOTP y códigos de recuperación
- **Sistema de Matching**: Swipe para likes/dislikes con matches automáticos
- **Chat en Tiempo Real**: Mensajería privada entre matches
- **Perfiles Personalizados**: Fotos, biografía, intereses en anime y videojuegos
- **Catálogos Extensos**: Base de datos de animes y videojuegos populares
- **Sistema de Reportes**: Funcionalidad para reportar usuarios problemáticos
- **API RESTful**: Endpoints bien estructurados con autenticación JWT

## 🛠️ Tecnologías Utilizadas

- **Backend**: Node.js con Express.js
- **Base de Datos**: PostgreSQL con UUIDs
- **Autenticación**: JWT + 2FA (Speakeasy)
- **Subida de Archivos**: Multer para gestión de fotos
- **Seguridad**: Helmet, CORS, Bcrypt
- **Email**: Nodemailer para verificaciones
- **Desarrollo**: Nodemon, ESLint

## 📦 Instalación y Configuración

### Prerrequisitos

- Node.js 18+
- PostgreSQL 15+
- npm o yarn

### 1. Clonar el Repositorio

```bash
git clone https://github.com/FeryaelJustice/MiraiLink-Backend.git
cd MiraiLink-Backend
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configuración de Base de Datos

Crea una base de datos PostgreSQL:

```sql
CREATE DATABASE mirailink;
```

Ejecuta el schema y datos de prueba:

```bash
psql -U postgres -d mirailink -f src/database/db.sql
psql -U postgres -d mirailink -f src/database/db_inserts.sql
```

### 4. Variables de Entorno

Copia el archivo de ejemplo y configura las variables:

```bash
cp .env.example .env
```

#### Para las variables de 2FA en el .env hay que generar

##### Clave (32 bytes)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

##### IV (16 bytes)

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Configura las siguientes variables en tu `.env`:

```env
PORT=3000
JWT_SECRET=tu_jwt_secret_muy_seguro
ORIGIN=http://localhost:5173
DB_URL=postgres://usuario:contraseña@localhost:5432/mirailink
BCRYPT_ROUNDS=12
EMAIL_HOST=tu_smtp_host
EMAIL_PORT=587
EMAIL_USER=tu_email
EMAIL_PASSWORD=tu_password_email
SECRET_2FA_KEY=clave_32_bytes_generada
SECRET_2FA_IV=iv_16_bytes_generado
```

### 5. Ejecutar la Aplicación

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm run start
```

La API estará disponible en `http://localhost:3000`

## 📚 Estructura del Proyecto

```text
src/
├── app.js              # Configuración principal del servidor
├── controllers/        # Lógica de negocio
│   ├── auth.controller.js
│   ├── user.controller.js
│   ├── chat.controller.js
│   └── ...
├── routes/            # Definición de rutas
│   ├── auth.routes.js
│   ├── user.routes.js
│   └── ...
├── middleware/        # Middlewares personalizados
│   ├── auth.middleware.js
│   └── error.middleware.js
├── models/           # Modelos y conexión DB
│   └── db.js
├── utils/            # Utilidades
│   ├── cryptoUtils.js
│   ├── dateUtils.js
│   └── mailer.js
├── database/         # Esquemas y datos iniciales
│   ├── db.sql
│   └── db_inserts.sql
└── assets/           # Archivos estáticos (ignorado por git)
```

## 🔗 API Endpoints

### Autenticación (`/api/auth`)

- `POST /register` - Registro de usuario
- `POST /login` - Inicio de sesión
- `POST /logout` - Cerrar sesión
- `POST /2fa/setup` - Configurar 2FA
- `POST /password/request-reset` - Solicitar reset de contraseña

### Usuario (`/api/user`)

- `GET /` - Obtener perfil propio
- `PUT /` - Actualizar perfil
- `DELETE /` - Eliminar cuenta
- `DELETE /photo/:position` - Eliminar foto específica

### Matches (`/api/match`)

- `GET /` - Obtener matches
- `GET /unseen` - Matches no vistos
- `POST /mark-seen` - Marcar matches como vistos

### Chat (`/api/chats`)

- `GET /` - Obtener chats del usuario
- `GET /:chatId/messages` - Mensajes de un chat
- `POST /send` - Enviar mensaje

### Catálogos (`/api/catalog`)

- `GET /animes` - Lista de animes disponibles
- `GET /games` - Lista de videojuegos disponibles

## 🔒 Seguridad

- **JWT**: Tokens con expiración de 24 horas
- **Token Blacklist**: Invalidación de tokens en logout
- **2FA**: Autenticación de dos factores con TOTP
- **Bcrypt**: Hash seguro de contraseñas (12 rounds por defecto)
- **Helmet**: Headers de seguridad HTTP
- **CORS**: Configurado para orígenes específicos
- **Validación**: Parámetros validados en todas las rutas

## 🧪 Desarrollo

```bash
# Ejecutar en modo desarrollo
npm run dev

# Linting
npm run lint

# Generar claves para 2FA
npm run generate:2fa-keys
```

## 📄 Base de Datos

La base de datos incluye:

- **Usuarios**: Perfiles, autenticación, verificación
- **Contenido**: Fotos de perfil, intereses en anime/games
- **Social**: Likes, matches, chats, mensajes
- **Seguridad**: Tokens, 2FA, códigos de recuperación
- **Catálogos**: +280 animes y +100+ videojuegos populares

## 🤝 Contribuir

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 👨‍💻 Autor

**FeryaelJustice** - [GitHub](https://github.com/FeryaelJustice)

## 📜 Licencia

Este proyecto está bajo la Licencia ISC.
