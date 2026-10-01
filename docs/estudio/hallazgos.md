# Hallazgos backend y límites de evidencia

[Guía maestra](../guia-maestra.md) | [Cobertura](cobertura.md)

Revisión de fuentes: 2026-10-01. Las observaciones estáticas no certifican el servidor desplegado ni el comportamiento en dispositivo.


| Hallazgo | Fuente | Implicación |
| --- | --- | --- |
| verifySubscription no consulta Google Play | subscription.controller.js | Derecho premium basado en datos enviados y vencimiento calculado; no verifica propiedad/estado real de purchaseToken |
| Repetición de verify desplaza expiración | upsert NOW()+interval | No describir esta operación como idempotente en tiempo |
| Mailer simula sin SMTP o al fallar | mailer.js | La respuesta no confirma entrega; logs pueden exponer códigos y destinatarios |
| Optional auth omite revocación y usuario actual | auth.middleware.js | No es equivalente a la guarda obligatoria |
| Fallback verification sin userId compara 20 códigos | auth.controller.js | Identidad inferida del primer código coincidente; revisar seguridad en otro alcance |
| Reset no revoca todos los tokens existentes | confirmPasswordReset | Cambio de contraseña no implica logout global |
| Ficheros y SQL no son transacción distribuida | photo.controller.js/photoStorage.js | Error post-COMMIT o interrupción puede dejar inconsistencias |
| Renumeración de fotos con UNIQUE inmediata | deletePhoto UPDATE posiciones | Revisar colisiones según filas/orden de actualización; requiere test específico, no afirmar reproducción |
| Historial privado no pagina | getChatHistory | No equivale a la ruta paginada getMessages |
| Envío no exige match/idempotency key | sendMessage | No atribuir limitación a match previo ni entrega exactamente una vez |
| SQL freshness no descarta futuro como helper JS | geoSearch.js | Semántica temporal discrepante |
| Migración registra filename después de SQL | migrator.js | Interrupción tras COMMIT puede reejecutar archivo no registrado |
| Base vacía no recibe baseline desde server | migrator/server | Auto-migration no inicializa todo desde cero |
| Healthz y shutdown limitados | app/server | No comprueba proveedores ni cierra explícitamente pool |
| Expresiones/config fuera de Zod | ORIGIN_REGEX, PUBLIC_ORIGIN, APP_BASE_URL | Algunas invalidaciones aparecen después de parseEnv |
| Tablas/rutas citadas históricamente difieren | messages, token_blacklist, prefijos singular | Usar contratos del código y no nombres antiguos |

Sin correcciones de runtime en esta entrega. Un riesgo observado no equivale a incidente confirmado. Fuentes exactas: [referencia](referencia-codigo.md) y documentos por tema.
