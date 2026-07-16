# Repository Guidelines

## Scope

MiraiLink Backend is an Express 5 and PostgreSQL service. Treat `README.md` as the documentation entrypoint and keep the focused files under `docs/` synchronized with code changes.

Never read, inventory, modify, stage or document the contents of `src/assets`. Tests involving uploads must use operating-system temporary directories or an injected `UPLOAD_ROOT`.

## Structure

- `src/server.js`: validates environment, creates the app and owns the HTTP process.
- `src/app.js`: Express factory, global middleware, static delivery and router mounting.
- `src/routes/`: HTTP method/path composition, validation, authentication and authorization.
- `src/controllers/`: handlers, business orchestration, SQL and transactions.
- `src/middleware/`: auth, chat membership, errors, rate limits, request ids, uploads and validation.
- `src/services/`: tokens, 2FA and notifications.
- `src/utils/`: encryption, image validation, mail and photo storage.
- `src/validation/`: Zod request schemas.
- `src/dto/`: public output allowlists.
- `src/database/`: baseline schema, development inserts and migrations.
- `tests/`: unit, HTTP integration and PostgreSQL schema tests.
- `docs/`: focused documentation. Do not create another README inside it.

## Commands

- `npm run dev`: development server with nodemon and `.env`.
- `npm start`: production-like process.
- `npm run lint`: ESLint.
- `npm test`: all Vitest suites.
- `npm run test:coverage`: coverage and thresholds.
- `npm run test:database`: PostgreSQL tests; set `REQUIRE_DATABASE_TESTS=true` when a disposable database is available.
- `npm run check:routes`: active Express operations against OpenAPI.
- `npm run check`: lint, coverage and route contract.

## Conventions

Use ES modules, four-space indentation, single quotes, trailing commas in multiline structures, PascalCase for classes and camelCase for functions and variables. Keep route filenames in kebab-style domain form such as `chat.routes.js`. Use parameterized SQL and existing shared services instead of duplicating security logic.

When an API route changes, update `docs/api-reference.md`, `docs/openapi.yaml`, `docs/code-reference.md` when exports change, and root `README.md` when onboarding or the reading path changes.

## Security

Never commit `.env`, provider credentials, generated media or production data. Public user responses must go through explicit projections or DTO allowlists. Resource authorization is separate from authentication. Uploaded content must remain size-bounded and signature-validated. Do not expose raw JWT, SQL, SMTP or Firebase errors.

## Commits and PRs

Use lightweight Conventional Commit subjects under 72 characters. PRs should list API breaks, migrations, environment changes, verification commands and residual operational work.
