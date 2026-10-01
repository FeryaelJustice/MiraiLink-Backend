# Contexto, componentes y despliegue

[Índice](indice.md) | [Guía maestra](../guia-maestra.md)

Tipo: vista de contexto y componentes. Revisión: 2026-10-01. Fuentes: [src/app.js](../../src/app.js), [src/server.js](../../src/server.js), [src/models/db.js](../../src/models/db.js).

```mermaid
flowchart LR
    Cliente["Apps u otros clientes"] -->|HTTP TLS vía proxy si existe| Proxy["Reverse proxy opcional"]
    Proxy --> Express
    subgraph ProcesoNode
        Express --> Middleware
        Middleware --> Rutas
        Rutas --> Controllers
        Controllers --> PoolPG
        Controllers --> JWTyTOTP
        Controllers --> FCM
        Controllers --> Mailer
        Controllers --> Staging
        Scheduler --> CatalogSync
        Migrador --> PoolPG
        LimiterMemoria --> Middleware
    end
    PoolPG --> PostgreSQL
    Staging --> Filesystem
    Express -->|entrega media| Filesystem
    FCM --> Firebase
    Mailer --> SMTP
    CatalogSync --> RAWG
    CatalogSync --> Jikan
```

Proxy es topología opcional, no despliegue confirmado. Las fotos y DB tienen persistencias diferentes; rate limit/cache no se comparten entre procesos. El servidor se basa en HTTP y no inicia Socket.IO en las fuentes revisadas.
