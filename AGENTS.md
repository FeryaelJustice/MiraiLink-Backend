# Repository Guidelines

## Project Structure & Module Organization
MiraiLink backend lives under `src/`. `src/app.js` boots Express, wires shared middleware, and mounts all API routers under `/api`. Feature folders sit alongside each other: `controllers/` holds request handlers, `routes/` exposes Express routers, `models/` contains data mappers, `database/` centralizes PostgreSQL pooling, `utils/` keeps shared helpers, and `middleware/` covers validators and error handling. Real-time concerns reside in `sockets/`, while static assets and upload placeholders stay in `public/` and `assets/`. Environment settings belong in `.env`; keep `.env.example` current when adding keys.

## Build, Test, and Development Commands
Run `npm run dev` for hot-reload development (nodemon, `.env`). Use `npm start` for production-like execution with `NODE_ENV=production`. `npm run lint` runs ESLint across the project; fix issues before raising a PR. `npm run build` is a placeholder; extend it if a build pipeline is introduced. `npm test` currently echoes a warning; replace it with the real test runner when tests land.

## Coding Style & Naming Conventions
Use ES modules (`import`/`export`) and keep four-space indentation, matching existing files. Prefer single quotes, trailing commas on multi-line objects, and PascalCase for classes, camelCase for functions and variables, and kebab-case for filenames (e.g., `chat.routes.js`). Reuse shared constants from `consts/` instead of inlining magic values. Run `npm run lint` before commits; add custom ESLint rules in a root config if the defaults become insufficient.

## Testing Guidelines
Target integration tests per router using Vitest or Jest; place suites under `src/__tests__` mirroring route names (e.g., `src/__tests__/auth.routes.test.js`). Mock PostgreSQL with test containers or a dedicated schema; clean tables between cases. Minimum bar is covering authentication flows, catalog lookups, chats, and error middleware. Update `npm test` to execute the suite, and document any required seed data in the test README.

## Commit & Pull Request Guidelines
Follow the lightweight Conventional Commit pattern already used (`docs: add...`, `fix:` etc.). Keep subject lines under 72 characters and use imperative mood. PRs should describe the feature or fix, link related issues, list migrations or env changes, and provide screenshots or curl samples for new endpoints. Ensure lint/test checks pass locally before requesting review.

## Security & Environment
Never commit `.env`; rely on `.env.example` for onboarding. Rotate JWT secrets and SMTP credentials regularly, and confirm CORS origins in `src/app.js` when adding clients. Review file upload size limits in `middleware/` before adjusting media features.