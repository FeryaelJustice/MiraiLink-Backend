# WARP.md

Guidance for Warp when working in MiraiLink Backend.

Use [README.md](README.md) as the single documentation entrypoint. It links architecture, code reference, API, database, runtime, tests and security documents.

## Commands

```bash
npm ci
npm run dev
npm run lint
npm test
npm run test:coverage
npm run check:routes
```

`src/server.js` is the process entrypoint. `src/app.js` exports the Express factory. Node.js 22 and PostgreSQL 16 are the supported CI baseline.

For PostgreSQL schema tests, use a disposable database and set `REQUIRE_DATABASE_TESTS=true`. Initialize a new database with `src/database/db.sql` followed by `src/database/migrations/002_security_hardening.sql`.

Never read, inventory, modify or test against `src/assets`. Use a temporary directory or injected `UPLOAD_ROOT` for upload work.

Keep `docs/api-reference.md`, `docs/openapi.yaml` and `docs/code-reference.md` synchronized with route or export changes. Use parameterized SQL, explicit public DTOs, resource authorization and the existing validation/error services.
