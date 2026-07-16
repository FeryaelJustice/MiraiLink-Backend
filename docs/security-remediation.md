# Estado de remediación de seguridad

Fecha: 2026-07-16.

| Hallazgo | Estado | Evidencia principal |
| --- | --- | --- |
| SEC-001 privacidad feed y matches | Resuelto | Proyección SQL explícita, DTO allowlist y test `user.dto.test.js` |
| SEC-002 blacklist de un solo uso | Resuelto | Consulta sin DELETE y regresión de dos intentos |
| SEC-003 membresía de chat | Resuelto | `requireChatMember`, filtros SQL y test unitario |
| SEC-004/005 bypass y enumeración 2FA | Resuelto | Challenge de cinco minutos, status autenticado y test de login |
| SEC-006 rate limiting | Resuelto localmente | Límites por operación; un despliegue horizontal requerirá store compartido |
| SEC-007 uploads | Resuelto | Memoria acotada, firma JPEG/PNG/WebP, UUID, staging y tests de spoofing |
| SEC-008 AES-CBC fijo | Resuelto | AES-256-GCM aleatorio y autenticado con lectura heredada temporal |
| SEC-009 recovery plaintext | Resuelto | bcrypt, consumo atómico y migración que invalida códigos antiguos |
| SEC-010 enumeración de correo | Resuelto | Respuesta neutra, códigos previos invalidados y envío esperado |
| SEC-011 validación | Resuelto | Schemas Zod en fronteras de auth, user, chat y social |
| SEC-012 secretos de ejemplo | Resuelto | Placeholders inequívocos; cualquier credencial histórica debe rotarse externamente |
| SEC-013 errores verbosos | Resuelto | Envelope estable y request id |
| SEC-014 privacidad de chat | Resuelto | Historial sin email ni SELECT user wildcard |
| SEC-015/016 atomicidad | Resuelto en flujos modificados | Transacciones, staging/compensación y bloqueo de chat privado |
| SEC-017 offset fijo | Resuelto | UTC nativo sin sumar dos horas |
| SEC-018 Firebase al arranque | Resuelto | Inicialización lazy |
| SEC-019 código muerto | Resuelto | Socket.IO, controlador huérfano y dependencias retirados |
| SEC-020 CORS y estáticos | Resuelto a nivel app | Allowlist, sin credentials, nosniff, CSP y dotfiles denegados |

## Evidencia automatizada

La suite contiene 29 casos descubiertos, uno de base se activa con PostgreSQL real. CI ejecuta lint, cobertura, esquema, contrato de rutas y audit de producción. El umbral inicial reproduce la cobertura actual y debe elevarse hacia 80 por ciento a medida que se agreguen fallos de proveedores, concurrencia y tests HTTP con fixtures completos.

## Riesgo residual operativo

- Rate limit compartido, logs estructurados, métricas, alertas y rotación de secretos dependen de infraestructura.
- La migración debe probarse en un clon de la base real y con backup restaurable.
- La compatibilidad de lectura AES-CBC debe retirarse después de migrar o regenerar todos los secretos 2FA.
- El despliegue y rollback están deliberadamente fuera de CI actual. Ver `future-vps-deployment.md`.
