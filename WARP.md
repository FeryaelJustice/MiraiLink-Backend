# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

MiraiLink Backend is a social networking/dating app backend focused on gamers and anime fans. Built with Node.js, Express, and PostgreSQL, it provides authentication, user profiles, matching system, real-time chat, and user content management.

## Development Commands

### Core Development

```bash
# Development server with auto-reload
npm run dev

# Production server
npm run start

# Linting (check for errors)
npm run lint
```

### Database Setup

The project uses PostgreSQL. Database schema and seed data are in `src/database/`:

- `db.sql` - Complete database schema
- `db_inserts.sql` - Sample data including games, animes, and test users

```bash
# Connect to PostgreSQL and run schema
psql -U postgres -d mirailink -f src/database/db.sql
psql -U postgres -d mirailink -f src/database/db_inserts.sql
```

### 2FA Secret Generation

For 2FA encryption keys in `.env`:

```bash
# Generate 32-byte key (SECRET_2FA_KEY)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate 16-byte IV (SECRET_2FA_IV) 
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## Architecture

### Core Structure

- **Entry Point**: `src/app.js` - Express server setup with middleware, routes, and error handling
- **Database**: PostgreSQL with connection pooling via `src/models/db.js`
- **Routes**: RESTful API with `/api` prefix, organized by feature modules
- **Authentication**: JWT-based with token blacklisting, 2FA support using TOTP

### Key Components

#### Authentication System

- **JWT Authentication** with stateless token blacklisting
- **2FA Support** with TOTP (Speakeasy) and recovery codes
- **Email/Password Reset** with timed tokens
- **Account Verification** via email codes
- **Middleware**: `authenticateToken()` with optional verification bypass

#### User Management

- **Profile System** with photos (1-4 positions), bio, interests
- **Interest Matching** via anime/game selections from master catalogs
- **Soft Delete** - users marked as `is_deleted` rather than hard deletion
- **File Uploads** using Multer with user-specific directories

#### Matching & Social Features

- **Swipe System** - likes/dislikes with automatic match creation
- **Real-time Chat** - private chats between matches
- **Reports & Feedback** - user safety features

### Database Design

PostgreSQL with UUID primary keys throughout:

- **User Tables**: `users`, `user_photos`, `user_anime_interests`, `user_game_interests`
- **Social Features**: `likes`, `dislikes`, `matches`, `chats`, `chat_members`, `messages`
- **Security**: `token_blacklist`, `verification_tokens`, `user_2fa`, `recovery_codes`
- **Content**: `animes`, `games` (master catalogs), `reports`, `feedback`

### API Structure

All routes prefixed with `/api`:

- `/auth` - Authentication, 2FA, password reset, verification
- `/user` - Profile management, photos, account deletion
- `/users` - Browse other user profiles
- `/swipe` - Like/dislike actions
- `/match` - View matches, mark as seen
- `/chats` - Chat management and messaging
- `/catalog` - Get available animes/games
- `/report` - Report users
- `/feedback` - App feedback
- `/app` - App version checking

### Security Features

- **Helmet.js** for security headers
- **CORS** configured for specific origins
- **Bcrypt** password hashing with configurable rounds
- **Rate Limiting** consideration for production
- **Input Validation** and SQL injection prevention via parameterized queries
- **2FA Encryption** with AES for stored secrets

### File Organization

```text
src/
��� app.js              # Main server setup
��� models/
�   ��� db.js           # Database connection pool
��� controllers/        # Business logic by feature
��� routes/             # Route definitions by feature  
��� middleware/         # Authentication, error handling
��� utils/              # Crypto, date, email utilities
��� database/           # SQL schema and seed data
��� assets/             # Static file storage (git ignored)
```

### Environment Configuration

Required `.env` variables (see `.env.example`):

- Database: `DB_URL`
- Authentication: `JWT_SECRET`
- CORS: `ORIGIN`
- Email: `EMAIL_*` settings for verification/reset
- 2FA: `SECRET_2FA_KEY`, `SECRET_2FA_IV` (32 & 16 bytes hex)
- Security: `BCRYPT_ROUNDS`

### Development Notes

- **ES6 Modules** - uses `import/export` syntax (`"type": "module"` in package.json)
- **Windows Development** - npm scripts use `set` for Windows environment variables
- **No Build Step** - Pure Node.js, no compilation required
- **Error Handling** - Global error middleware for consistent API responses
- **Async/Await** - Modern Promise handling throughout

### Testing & Quality

- ESLint configured for code quality
- No test suite currently configured (`npm test` placeholder)
- Development uses nodemon for auto-reload

### Development Guidelines

When making changes:

- Follow existing patterns for controllers/routes/middleware structure
- Use parameterized queries for all database operations  
- Implement proper error handling with try/catch and next()
- Maintain JWT token blacklist for logout functionality
- Consider 2FA requirements when modifying authentication flows
