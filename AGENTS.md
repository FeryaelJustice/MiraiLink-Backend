# Repository Guidelines

## Scope and protected content

This repository is the MiraiLink Node.js backend. Runtime source lives under `src` and documentation lives under `docs`.

Do not read, rewrite, move, delete, format, inventory by filename, or otherwise touch files inside `src/assets` unless the user explicitly changes this rule. That directory contains uploaded media and is not source code. Tests that exercise uploads must use a temporary directory.

Preserve user changes in a dirty working tree. Avoid broad formatting changes, especially in `src/app.js` and dependency files.

## Documentation map

- `README.md`: honest project status and setup.
- `docs/architecture.md`: components, boundaries and flows.
- `docs/api-reference.md`: human API contract.
- `docs/openapi.yaml`: machine-readable OpenAPI 3.1 contract.
- `docs/code-reference.md`: modules and all exported functions.
- `docs/database.md`: PostgreSQL model.
- `docs/testing-strategy.md`: current gaps and test plan.
- `docs/security-review.md`: prioritized risks.

When a route or response changes, update both API documents in the same change.

## Project structure

- `src/app.js` creates Express, mounts middleware and routers, and starts listening.
- `src/routes` defines the 46 API endpoints.
- `src/controllers` mixes HTTP handling, validation, business rules and SQL.
- `src/models/db.js` exports the shared PostgreSQL pool.
- `src/database` contains the initial schema and development seed data.
- `src/services` contains FCM notification logic.
- `src/utils` contains crypto, date, mail and photo helpers.
- `src/sockets` is disabled prototype code and does not match the current message schema.

## Commands and current reality

- `npm run dev`: Windows development command using Nodemon and `.env`.
- `npm start`: Windows production-like command.
- `npm run build`: placeholder only.
- `npm test`: placeholder only and does not validate behavior.
- `npm run lint`: currently fails because ESLint is not installed or configured.

Do not claim lint or tests pass until real tooling exists and has run successfully.

## Coding conventions

Use ES modules. Follow four-space indentation and existing local style. Prefer focused changes over repository-wide formatting. Use parameterized PostgreSQL queries. Define explicit response DTOs instead of returning `SELECT *` rows. Route input should be validated before controllers perform SQL or filesystem work.

Files use a mix of quote styles because `src/app.js` has user-owned formatting changes. Do not normalize unrelated files.

## Database changes

`src/database/db.sql` is a non-idempotent creation script, not a migration system. Any schema change should include a versioned migration once migration tooling is introduced. Keep development seeds separate from production data.

## Testing expectations

The first implementation step for tests is to separate Express app creation from `app.listen` and inject PostgreSQL, Firebase, SMTP and upload paths. Prioritize auth revocation, response privacy, chat authorization, 2FA login enforcement and multipart consistency. See `docs/testing-strategy.md`.

## Security guardrails

Never commit `.env`, `src/serviceAccountKey.json`, tokens, passwords, SMTP credentials or real user media. Do not expose `password_hash`, phone, email or secret fields in public profile responses. Add authorization checks for resources identified by UUID, especially chats and photos.

Consult `docs/security-review.md` before expanding public API surface.

## Commits and pull requests

Use lightweight Conventional Commits with imperative subjects under 72 characters. Pull requests should describe API and schema changes, configuration changes, migrations, test evidence and compatibility impact.
