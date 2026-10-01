# Escritura de mensaje y notificación

[Índice](indice.md) | [Guía maestra](../guia-maestra.md)

Tipo: UML de secuencia. Revisión: 2026-10-01. Fuentes: [src/controllers/chat.controller.js](../../src/controllers/chat.controller.js), [src/services/notificationService.js](../../src/services/notificationService.js).

```mermaid
sequenceDiagram
    actor Cliente
    participant Handler as sendMessage
    participant DB as PostgreSQL
    participant Push as notificationService
    Cliente->>Handler: toUserId y text
    Handler->>DB: BEGIN y advisory lock por pareja
    Handler->>DB: buscar o crear chat y miembros
    Handler->>DB: INSERT messages
    alt Fallo antes de commit
        Handler->>DB: ROLLBACK y liberar cliente
        Handler-->>Cliente: error
    else Confirmado
        Handler->>DB: COMMIT y liberar cliente
        Handler-->>Cliente: 201 y chatId
        Handler->>Push: envío asíncrono
        Push->>DB: token y datos remitente
        Push-->>Push: FCM o fallo capturado
    end
```

No exige match previo ni recibe clave idempotente. La notificación puede fallar después de que el mensaje ya esté guardado. El historial y last_read_at son consultas/marcas distintas del envío.
