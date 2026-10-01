# Login, 2FA y autorización

[Índice](indice.md) | [Guía maestra](../guia-maestra.md)

Tipo: UML de secuencia. Revisión: 2026-10-01. Fuentes: [src/controllers/auth.controller.js](../../src/controllers/auth.controller.js), [src/services/tokenService.js](../../src/services/tokenService.js), [src/services/twoFactorService.js](../../src/services/twoFactorService.js), [src/middleware/auth.middleware.js](../../src/middleware/auth.middleware.js).

```mermaid
sequenceDiagram
    actor Cliente
    participant Auth as AuthController
    participant DB as PostgreSQL
    participant Crypto as bcrypt y tokenService
    Cliente->>Auth: login con identidad y password
    Auth->>DB: usuario y estado 2FA
    Auth->>Crypto: compare(password,password_hash)
    alt Credencial inválida o eliminado
        Auth-->>Cliente: 401 INVALID_CREDENTIALS
    else 2FA habilitado
        Auth->>Crypto: challenge purpose 2fa-login, 5m
        Auth-->>Cliente: requires2FA y challengeToken
        Cliente->>Auth: challengeToken y código
        Auth->>Crypto: firma y TOTP
        opt Recovery en lugar de TOTP
            Auth->>DB: transacción y SELECT FOR UPDATE
            Auth->>Crypto: compare recovery hash
            Auth->>DB: marcar used y COMMIT
        end
        Auth-->>Cliente: access token 24h o error
    else Sin 2FA
        Auth-->>Cliente: access token 24h e isVerified
    end
    Cliente->>Auth: recurso con Bearer access
    Auth->>DB: blacklist y usuario actual
    Auth-->>Cliente: autorizado o 401/403
```

La última fase de autorización representa middleware, no otra ejecución del handler login. La verificación de cuenta sigue siendo requisito de las rutas protegidas; no confundir autenticación con resource authorization.
