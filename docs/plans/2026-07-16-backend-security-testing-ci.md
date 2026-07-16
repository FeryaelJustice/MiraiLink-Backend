# MiraiLink Backend Security, Testing and CI Implementation Plan

> **For agentic workers:** Use `mobiai-mobile-executing-plans-with-subagents` (recommended) or `mobiai-mobile-executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver a tested, security-hardened MiraiLink backend with synchronized API documentation and a checks-only GitHub Actions workflow.

**Architecture:** Split Express construction from process startup, inject external dependencies, validate all request boundaries, and fix security findings domain by domain behind tests. Preserve PostgreSQL and the existing route-controller organization where it remains safe.

**Tech Stack:** Node.js 22+, Express 5, PostgreSQL 16+, Vitest, Supertest, Zod, ESLint, GitHub Actions.

**Platform:** Node.js backend serving the MiraiLink Android client.

---

### Task 1: Establish reproducible tooling

**Files:**
- Modify: `package.json`
- Create: `package-lock.json`
- Create: `eslint.config.js`
- Create: `vitest.config.js`
- Create: `tests/setup/env.js`

- [ ] **Step 1: Add test and lint dependencies**

Install Vitest, V8 coverage, Supertest, ESLint, JavaScript ESLint rules, globals and Zod. Add `express-rate-limit` as a production dependency.

Run:

```powershell
npm install zod express-rate-limit
npm install --save-dev vitest @vitest/coverage-v8 supertest eslint @eslint/js globals
```

Expected: `package-lock.json` exists and dependency resolution succeeds.

- [ ] **Step 2: Replace placeholder scripts**

Define `test`, `test:unit`, `test:integration`, `test:coverage`, `lint`, `lint:fix`, `check:routes`, and `check` scripts. Use cross-platform Node commands rather than Windows `set` syntax.

- [ ] **Step 3: Configure lint and coverage**

Use ESLint flat config for `src`, `tests`, root configuration and workflow helper scripts. Exclude `src/assets`, coverage and node_modules. Set initial global coverage thresholds to 80 percent for statements, branches, functions and lines on security-critical modules.

- [ ] **Step 4: Verify tooling starts**

Run:

```powershell
npm run lint
npm test -- --run
```

Expected: lint reports existing actionable findings and Vitest starts even before test files are added.

### Task 2: Make the application testable

**Files:**
- Modify: `src/app.js`
- Create: `src/server.js`
- Create: `src/config/env.js`
- Modify: `src/config/firebaseAdmin.js`
- Modify: `src/utils/mailer.js`
- Test: `tests/unit/config/env.test.js`
- Test: `tests/integration/app.test.js`

- [ ] **Step 1: Write failing app-factory tests**

Test that importing `createApp` does not listen on a port, require Firebase credentials or connect to PostgreSQL. Test JSON 404 responses, body size limits, Helmet headers and disabled `x-powered-by`.

Run:

```powershell
npm test -- tests/integration/app.test.js
```

Expected: fail because `src/app.js` listens and imports Firebase eagerly.

- [ ] **Step 2: Add validated configuration**

Create an environment parser that checks `DB_URL`, `JWT_SECRET`, CORS origins, bcrypt rounds, upload limits, 2FA key material and provider configuration. Unit tests cover valid, missing and malformed values without reading `.env`.

- [ ] **Step 3: Extract `createApp` and `startServer`**

`createApp` receives database, notification, mail, upload root, clock and rate-limit options. `server.js` builds production dependencies, starts HTTP and configures request, header and keep-alive timeouts.

- [ ] **Step 4: Make integrations lazy**

Firebase and SMTP initialize only when their services are used. Missing provider configuration produces an operational error for that feature rather than preventing unrelated endpoints from starting.

- [ ] **Step 5: Run focused tests**

```powershell
npm test -- tests/unit/config/env.test.js tests/integration/app.test.js
```

Expected: all focused tests pass.

### Task 3: Add request validation and stable errors

**Files:**
- Create: `src/errors/AppError.js`
- Create: `src/middleware/validate.middleware.js`
- Modify: `src/middleware/error.middleware.js`
- Create: `src/validation/common.schemas.js`
- Create: `src/validation/auth.schemas.js`
- Create: `src/validation/user.schemas.js`
- Create: `src/validation/chat.schemas.js`
- Create: `src/validation/social.schemas.js`
- Modify: all files under `src/routes`
- Test: `tests/unit/middleware/validate.test.js`
- Test: `tests/integration/validation.test.js`

- [ ] **Step 1: Write failing validation tests**

Cover UUID params, scalar pagination, missing login identifiers, weak registration payloads, message length, feedback limits, report reasons, match id arrays and platform enum.

- [ ] **Step 2: Implement Zod boundary validation**

The middleware replaces request data with parsed values and converts validation errors to status 400 with code `VALIDATION_ERROR` and field details.

- [ ] **Step 3: Normalize errors and 404**

Expected failures use `AppError`. Unknown errors return status 500, code `INTERNAL_ERROR`, a generic message and request id. No stack or raw provider error is returned.

- [ ] **Step 4: Add global limits and CORS validation**

Set JSON limit to 100 KB. Parse a comma-separated origin allowlist. Keep `credentials` disabled because authentication uses Bearer headers.

- [ ] **Step 5: Run validation suite**

```powershell
npm test -- tests/unit/middleware/validate.test.js tests/integration/validation.test.js
```

Expected: all validation and error-envelope tests pass.

### Task 4: Secure authentication, JWT revocation and 2FA

**Files:**
- Modify: `src/controllers/auth.controller.js`
- Modify: `src/middleware/auth.middleware.js`
- Modify: `src/routes/auth.routes.js`
- Modify: `src/utils/cryptoUtils.js`
- Modify: `src/utils/dateUtils.js`
- Create: `src/services/tokenService.js`
- Create: `src/services/twoFactorService.js`
- Test: `tests/unit/utils/cryptoUtils.test.js`
- Test: `tests/unit/services/tokenService.test.js`
- Test: `tests/integration/auth.middleware.test.js`
- Test: `tests/integration/auth.routes.test.js`

- [ ] **Step 1: Reproduce blacklist and 2FA bypasses**

Write tests proving a blacklisted token remains rejected on repeated requests and login does not issue an access token when 2FA is enabled.

- [ ] **Step 2: Implement durable token revocation**

Store JWT expiry with the token. Authentication checks blacklist without deleting entries. Expired entries are cleanup candidates, not request-time revocation resets.

- [ ] **Step 3: Implement two-stage login**

Password login returns `{ requires2FA: true, challengeToken }` for 2FA users. The challenge has purpose `2fa-login` and a five-minute lifetime. Final verification returns the access token.

- [ ] **Step 4: Harden 2FA material**

Use AES-256-GCM with random nonce and authentication tag. Hash recovery codes with bcrypt. Setup replaces previous recovery codes. Status becomes authenticated and current-user scoped.

- [ ] **Step 5: Fix time and code lifecycle**

Use UTC timestamps without fixed offsets. Invalidate previous verification and reset codes when a new one is issued. Delete used codes atomically.

- [ ] **Step 6: Add auth rate limits**

Apply strict limits to login, registration, password reset, verification, public deletion and 2FA verification. Inject or disable stores in tests for determinism.

- [ ] **Step 7: Run auth suite**

```powershell
npm test -- tests/unit/utils/cryptoUtils.test.js tests/unit/services/tokenService.test.js tests/integration/auth.middleware.test.js tests/integration/auth.routes.test.js
```

Expected: blacklist, challenge, recovery-code and validation tests pass.

### Task 5: Secure user, social and chat resources

**Files:**
- Modify: `src/controllers/user.controller.js`
- Modify: `src/controllers/swipe.controller.js`
- Modify: `src/controllers/match.controller.js`
- Modify: `src/controllers/chat.controller.js`
- Modify: related route files
- Create: `src/dto/user.dto.js`
- Create: `src/middleware/chatMember.middleware.js`
- Test: `tests/unit/dto/user.dto.test.js`
- Test: `tests/integration/user.routes.test.js`
- Test: `tests/integration/social.routes.test.js`
- Test: `tests/integration/chat.routes.test.js`

- [ ] **Step 1: Write privacy and IDOR regression tests**

Assert that feed and matches never expose password, email, phone or 2FA data. Assert a non-member cannot read chat messages, history or members.

- [ ] **Step 2: Add explicit public DTOs and SQL projections**

Replace `SELECT *` user responses with allowlisted fields. Keep private self-profile fields separate from public profiles.

- [ ] **Step 3: Enforce chat membership**

Guard message, member, history and read routes. Fix the message pagination placeholder and require membership in the SQL query as defense in depth.

- [ ] **Step 4: Make chat writes atomic**

Create private chats, members and the first message in one transaction. Prevent duplicate private chats under concurrent requests.

- [ ] **Step 5: Fix social authorization and data integrity**

Reject self-like and self-dislike, validate targets exist, restrict match updates to participating users and paginate profile lists.

- [ ] **Step 6: Remove redundant user-id routes**

Delete `/api/user/byToken`, `/api/user/byEmailPassword` and their controller functions. Clients already receive user id through login and autologin.

- [ ] **Step 7: Run domain suites**

```powershell
npm test -- tests/unit/dto/user.dto.test.js tests/integration/user.routes.test.js tests/integration/social.routes.test.js tests/integration/chat.routes.test.js
```

Expected: privacy, authorization, pagination and transaction tests pass.

### Task 6: Harden uploads and PostgreSQL schema

**Files:**
- Modify: `src/routes/user.routes.js`
- Modify: `src/routes/userphotos.routes.js`
- Modify: `src/controllers/photo.controller.js`
- Modify: `src/controllers/user.controller.js`
- Modify: `src/utils/photoUploader.js`
- Create: `src/utils/imageValidation.js`
- Modify: `src/database/db.sql`
- Create: `src/database/migrations/002_security_hardening.sql`
- Test: `tests/unit/utils/imageValidation.test.js`
- Test: `tests/integration/photo.routes.test.js`
- Test: `tests/database/schema.integration.test.js`

- [ ] **Step 1: Write failing upload tests**

Cover valid JPEG, PNG and WebP signatures, spoofed MIME, executable content, oversized files, too many files, invalid positions and filesystem rollback. Use only OS temporary directories.

- [ ] **Step 2: Move Multer to bounded memory storage**

Limit each file to 5 MB and four files per profile update. Validate signatures and generate filenames with `randomUUID` before writing.

- [ ] **Step 3: Harden media serving**

Keep existing `/assets/img/profiles` URL compatibility while rejecting dotfiles, path traversal and non-image extensions before static serving.

- [ ] **Step 4: Update baseline schema**

Add blacklist expiry, hashed recovery codes, photo position uniqueness, self-reference checks and chat/message indexes. Remove duplicate user 2FA columns and redundant constraints.

- [ ] **Step 5: Add existing-installation migration**

The migration removes plaintext recovery codes, adds required constraints and documents the need for users to regenerate recovery codes.

- [ ] **Step 6: Run upload and database suites**

```powershell
npm test -- tests/unit/utils/imageValidation.test.js tests/integration/photo.routes.test.js
npm run test:database
```

Expected: temporary-upload tests pass and the schema applies to disposable PostgreSQL.

### Task 7: Remove dead code and dependencies

**Files:**
- Delete: `src/controllers/message.controller.js`
- Delete: `src/sockets/socketHandler.js`
- Modify: `src/app.js`
- Modify: `src/controllers/chat.controller.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`

- [ ] **Step 1: Prove modules and packages are unused**

Search imports and route registration for message controller, Socket.IO, qrcode, path package, uuid package and unused Firebase imports.

- [ ] **Step 2: Remove obsolete code**

Delete the disconnected conversation controller and incompatible Socket.IO prototype. Replace UUID package calls with `node:crypto.randomUUID`.

- [ ] **Step 3: Remove unused packages**

Run `npm uninstall` for confirmed unused dependencies and regenerate the lockfile.

- [ ] **Step 4: Verify import graph and syntax**

```powershell
rg "message.controller|socketHandler|socket.io|qrcode|from 'uuid'|from \"uuid\"" src package.json
npm run lint
npm test
```

Expected: search has no active references and checks pass.

### Task 8: Add CI and future deployment context

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `docs/future-vps-deployment.md`
- Create: `scripts/check-openapi-routes.js`
- Test: `tests/unit/scripts/check-openapi-routes.test.js`

- [ ] **Step 1: Add route-contract checker**

Compare every Express method and normalized path with OpenAPI and fail for missing, extra or duplicate operation ids.

- [ ] **Step 2: Add GitHub Actions CI**

Use Node.js 22 and PostgreSQL 16. Run `npm ci`, lint, coverage, database tests, route contract checks and production dependency audit. Do not add deployment permissions, secrets or jobs.

- [ ] **Step 3: Document future VPS deployment**

Record Debian hardening, dedicated service user, Hostinger access, PM2, nginx, TLS, firewall, secrets, PostgreSQL, backups, health checks, artifact delivery, rollback and the future CD job boundary.

- [ ] **Step 4: Validate workflow syntax and local equivalents**

Run every command listed in the workflow locally. Check YAML indentation and action versions against official GitHub documentation.

### Task 9: Synchronize documentation and complete verification

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `WARP.md`
- Modify: `.env.example`
- Modify: all relevant files under `docs`

- [ ] **Step 1: Update runtime and test commands**

Document cross-platform start commands, environment validation, real test scripts, coverage, lint and PostgreSQL requirements.

- [ ] **Step 2: Update API and OpenAPI**

Reflect 2FA challenge login, authenticated 2FA status, removed endpoints, stable errors, validation constraints, pagination and secure media rules.

- [ ] **Step 3: Close the security review**

Mark resolved findings with evidence and tests. Keep only external infrastructure items as residual or future work.

- [ ] **Step 4: Run the complete verification matrix**

```powershell
npm ci
npm run lint
npm run test:coverage
npm run test:database
npm run check:routes
npm audit --omit=dev --audit-level=high
git diff --check
git status --short -- src/assets
```

Expected: every check passes, dependency audit has no high production vulnerability, diff check is clean and `src/assets` has no changes.

- [ ] **Step 5: Review branch diff**

Confirm there are no secrets, real media, deployment credentials or unrelated generated artifacts. Summarize intentional API breaking changes and remaining infrastructure work.
