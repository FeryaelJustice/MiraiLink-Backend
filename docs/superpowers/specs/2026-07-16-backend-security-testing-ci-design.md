# MiraiLink Backend Security, Testing and CI Design

## Context

MiraiLink is an Express 5 and PostgreSQL backend with 46 API endpoints plus the root route. The repository already documents missing tests, inconsistent validation, unsafe response projections, incomplete 2FA, weak JWT revocation, chat authorization gaps, unsafe uploads, dead Socket.IO code, and absent CI.

This design covers the complete hardening initiative requested on 2026-07-16. It does not deploy the service. Deployment to a Debian VPS with Hostinger, PM2 and a reverse proxy is documented as future work only.

## Goals

- Make the application importable and testable without opening a port or requiring Firebase credentials.
- Add unit, HTTP integration and PostgreSQL schema tests.
- Resolve every application-level finding in `docs/security-review.md` that can be fixed in this repository.
- Remove routes, modules and dependencies that are obsolete, broken or unused.
- Keep API and technical documentation aligned with the resulting behavior.
- Add GitHub Actions checks for install, lint, tests, coverage, schema validation and dependency audit.
- Preserve `src/assets` without reading or modifying its contents.

## Non-goals

- No VPS deployment or remote server changes.
- No PM2, nginx, DNS, TLS certificate or Hostinger automation in the active workflow.
- No mobile application changes.
- No replacement of PostgreSQL with an ORM.
- No broad visual or product feature work.

## Approaches considered

### 1. Incremental hardening with an app factory

Separate `createApp()` from `startServer()`, inject external integrations, validate requests at route boundaries, add focused security services, and keep the existing controller and SQL structure where it remains safe.

Advantages:

- Lowest migration risk.
- Tests can cover current behavior before each fix.
- Existing endpoints can be preserved except the explicitly obsolete ones.
- Security work remains reviewable by domain.

Trade-off: controllers will still contain some SQL and business logic after this iteration.

### 2. Full clean-architecture rewrite

Replace controllers with use cases, repositories, DTO modules and infrastructure adapters before testing.

Advantages: stronger long-term separation.

Trade-offs: large regression surface, slow delivery, difficult comparison with the current API, and unnecessary scope for the requested hardening.

### 3. Black-box tests around the existing server

Start the current process with real Firebase, SMTP and PostgreSQL, then test it only through HTTP.

Advantages: minimal code refactor before tests.

Trade-offs: slow, brittle, requires secrets, makes failures hard to isolate, and leaves import-time coupling unresolved.

## Selected approach

Approach 1 is selected. It gives tests a stable seam while preserving the recognizable structure of the backend. The user's explicit instruction to continue autonomously is treated as approval of this incremental design and the requested order: tests first, security second, documentation and CI last.

## Target architecture

```text
server.js
  -> validate configuration
  -> build production dependencies
  -> createApp(dependencies)
  -> listen with safe HTTP timeouts

createApp(dependencies)
  -> security middleware and request limits
  -> routers with validation middleware
  -> controllers
  -> injected database, mail, FCM, clock and upload root
  -> normalized 404 and error responses
```

Production code will use the existing PostgreSQL pool and real integrations. Tests will use explicit fakes for focused HTTP behavior and a PostgreSQL service for schema and SQL integration tests.

## Testing design

### Tooling

- Vitest for unit and integration tests.
- Supertest for Express HTTP tests.
- Vitest coverage with V8.
- ESLint flat configuration for source, tests and configuration files.
- PostgreSQL 16 service in GitHub Actions.

### Test layers

1. Unit tests for crypto, date handling, DTO projections, validation, upload signatures and configuration.
2. HTTP tests for middleware, error envelopes, auth behavior, route validation, rate limits and authorization.
3. Controller and service tests with database fakes for security decisions.
4. PostgreSQL tests that apply the baseline schema and security migration to a disposable database.
5. Static contract checks that compare Express routes with OpenAPI operations.

`src/assets` is never used by tests. Upload tests receive a temporary directory.

## Security design

### Authentication and revocation

- Blacklisted JWTs remain invalid until expiry.
- Logout stores token expiry and never removes the entry during authentication.
- Access tokens and 2FA challenge tokens have separate purposes.
- Login returns a short-lived challenge when 2FA is active and returns an access token only after successful TOTP or recovery-code verification.
- Recovery codes are stored as bcrypt hashes.
- TOTP secrets use authenticated AES-256-GCM encryption with a random nonce.
- Legacy AES-CBC secrets can be read only for controlled migration and are rewritten to the new format after successful use.

### Validation and abuse prevention

- Zod schemas validate params, query, JSON and multipart text fields.
- Auth, reset, verification, public deletion, reports and feedback receive rate limits.
- JSON bodies have an explicit conservative size limit.
- CORS uses a validated allowlist and does not enable cookie credentials because auth is Bearer based.

### Authorization and privacy

- Public profile DTOs never include password hashes, email, phone or secret fields.
- Chat message, member, history and read operations require membership.
- Match updates are restricted to matches involving the authenticated user.
- Photo operations remain owner-scoped.

### Uploads and media

- Multer uses memory storage with per-file and count limits.
- Only JPEG, PNG and WebP are accepted.
- File signatures are checked, not only MIME or extension.
- Server-generated names are used.
- Media serving is restricted to the profile subtree and approved extensions.
- Database and filesystem compensation is explicit when a write fails.

### Errors and operations

- A typed application error maps expected failures to stable JSON codes.
- Internal error details remain server-side.
- The server sets request, header and keep-alive timeouts.
- Firebase and SMTP initialize lazily so unrelated routes can start without those providers.

## Database design

- The baseline schema is made reproducible for new environments.
- A versioned security migration supports existing installations.
- `token_blacklist` stores `expires_at` and is indexed for cleanup.
- Recovery codes use `code_hash` instead of plaintext `code`.
- Duplicate 2FA fields in `users` are removed from the baseline.
- `user_photos` enforces one row per user and position.
- Message and chat-member indexes support authorization and history queries.
- Constraints prevent self-like, self-dislike and self-match records.

The migration invalidates existing plaintext recovery codes. Existing users with 2FA must generate a new recovery-code set after migration. This is documented as an intentional security trade-off.

## Deprecated and unused removal

- Remove `src/controllers/message.controller.js` because it references an obsolete conversation model.
- Remove `src/sockets/socketHandler.js` and the unused Socket.IO dependency because realtime transport is not connected and uses the old `match_id` schema.
- Remove redundant `/api/user/byToken` and broken `/api/user/byEmailPassword` routes.
- Remove unused imports and packages such as `path`, `qrcode`, `uuid` and Socket.IO when confirmed by repository-wide search.
- Replace UUID package usage with `node:crypto.randomUUID`.
- Remove duplicate or obsolete documentation claims.

## API compatibility

Security takes priority over preserving unsafe behavior. Intentional breaking changes are:

- Login with enabled 2FA returns a challenge instead of an access token.
- The final 2FA login endpoint accepts a challenge token and returns the access token.
- 2FA status becomes an authenticated GET for the current user.
- Redundant credential-to-user-id and token-in-GET-body endpoints are removed.
- Error responses become JSON with stable `code` and `message` fields.
- Internal user columns disappear from feed and match responses.

All changes are reflected in `docs/api-reference.md` and `docs/openapi.yaml`.

## CI design

`.github/workflows/ci.yml` runs on pull requests and pushes to long-lived branches:

1. Checkout.
2. Node.js 22 setup with npm cache.
3. PostgreSQL 16 service with health checks.
4. `npm ci`.
5. `npm run lint`.
6. `npm run test:coverage`.
7. PostgreSQL schema integration tests.
8. OpenAPI-route consistency check.
9. `npm audit --omit=dev --audit-level=high`.

No deployment job, credentials or server address is included.

## Documentation outputs

- Updated README and documentation index.
- Updated architecture, code map, code reference, database, runtime, testing and security review.
- Updated API reference and OpenAPI contract.
- New `docs/future-vps-deployment.md` containing the future Debian, Hostinger, PM2, nginx, permissions, secrets, backup and deployment context.
- Updated repository agent guidance so future work preserves the new test and security rules.

## Acceptance criteria

- All local tests and lint checks pass.
- Coverage thresholds pass for security-critical modules.
- The PostgreSQL integration suite passes with Docker or CI service PostgreSQL.
- No route returns password hashes, authentication secrets or private contact data in public DTOs.
- Blacklisted tokens remain invalid across repeated requests.
- 2FA blocks access-token issuance until the second factor succeeds.
- Chat resources reject authenticated non-members.
- Invalid or oversized uploads are rejected without touching `src/assets` in tests.
- Express routes and OpenAPI operations match.
- GitHub Actions contains checks only and has no deployment behavior.
- All previously documented application findings are marked resolved or explicitly classified as infrastructure follow-up.
