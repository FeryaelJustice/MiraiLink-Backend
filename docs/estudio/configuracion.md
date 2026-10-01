# Configuración backend y efecto de ausencia/invalidez

[Guía maestra](../guia-maestra.md) | [Cobertura](cobertura.md)

Revisión de fuentes: 2026-10-01. Las observaciones estáticas no certifican el servidor desplegado ni el comportamiento en dispositivo.


[env.js](../../src/config/env.js) valida al arrancar server. Los consumidores también leen process.env directamente; los defaults de parseEnv no se escriben de vuelta al entorno. Ver [índice de lectores](lectores-configuracion.md), incluidos lectores fuera del esquema central.

| Variable | Uso, requisito y default | Ausencia o invalidez |
| --- | --- | --- |
| NODE_ENV | development/test/production, default development | Inválido bloquea parseEnv. test omite migraciones/sync automáticos; producción cambia CORS de desarrollo |
| PORT | Entero 1..65535, default 3000 | Default sin variable; inválido bloquea arranque; puerto ocupado produce error HTTP |
| DB_URL | URL que empieza postgres, requerida | Ausencia/invalidez bloquea server; scripts comprueban por separado. URL válida no prueba conectividad ni permisos |
| JWT_SECRET | Requerida, mínimo 32 caracteres | Bloquea arranque o emisión si inválida; cambiarla invalida firma de tokens existentes |
| ORIGIN | Lista de orígenes o *, requerida | Ausencia/invalidez bloquea parseEnv; web no permitida recibe CORS_REJECTED. Sin Origin se acepta petición nativa |
| ORIGIN_REGEX | Regex opcional de CORS | Ausente deja listas/política dev; patrón inválido puede fallar al construir la app, no está compilado por Zod |
| TRUST_PROXY | loopback/linklocal/uniquelocal, default loopback | Inválido bloquea arranque. Afecta IP/rate limits y URL construida con req.protocol |
| GLOBAL_RATE_LIMIT_MAX | Entero >=10, default 1000 | Ausente usa default en middleware; inválido en server bloquea parseEnv |
| GLOBAL_RATE_LIMIT_WINDOW_MS | Entero >=1000, default 900000 | Define ventana; inválido bloquea parseEnv |
| SALT_ROUNDS | Entero 4..15, default 12 | Controla costo bcrypt; inválido bloquea server; scripts pueden leerlo directamente |
| UPLOAD_MAX_BYTES | 1024..20971520, default 5242880 | Rechazo de upload que excede límite. Middleware lee env al importar |
| UPLOAD_ROOT | Directorio opcional | Default en código apunta al almacenamiento de perfiles; sin permisos falla escritura. No inspeccionar contenido de src/assets |
| SECRET_2FA_KEY | Requerida, 64 caracteres hex | Bloquea server; clave distinta impide decrypt de secretos anteriores |
| SECRET_2FA_IV | Opcional, 32 hex | Necesaria solo para leer secretos CBC legacy; inválida bloquea server si está definida |
| EMAIL_HOST | Opcional; mailer default smtp.hostinger.com | Host erróneo falla al enviar y mailer simula como fallback |
| EMAIL_PORT | 1..65535, default 587 | Inválido bloquea parseEnv; consumidor mailer default propio |
| EMAIL_SECURE | true/false, default false | Define TLS del transporte; inválido bloquea parseEnv; TLS del proveedor puede requerir otro puerto |
| EMAIL_USER / EMAIL_PASSWORD | Opcionales | Sin uno de ellos se simula en consola; no hay entrega real. Fallo SMTP también activa simulación y puede imprimir códigos |
| FIREBASE_SERVICE_ACCOUNT_FILE_NAME | Archivo opcional | Default de código src/serviceAccountKey.json; ausencia del archivo falla al primer uso FCM, no necesariamente al arrancar |
| RAWG_API_KEY | Opcional | Catálogo games depende de clave del proveedor; Jikan se procesa aparte |
| CATALOG_SYNC_INTERVAL_HOURS | Entero >=1, default 24 | Frecuencia; inválido bloquea parseEnv. Además hay ejecución inicial a 10 s |
| PUBLIC_ORIGIN | Fuera del esquema central, URL media | Default req.protocol/host; falta detrás de proxy puede devolver origen incorrecto. URL inválida falla al resolver media |
| APP_BASE_URL | Fuera del esquema central, enlaces de correo | Default https://mirailink.xyz; valor incorrecto produce enlaces rotos aunque SMTP envíe |
| REQUIRE_DATABASE_TESTS | Switch de suite, true activa | Ausente omite prueba PostgreSQL destructiva. No activarlo contra datos reales |

## Fases y operación

Los scripts de migración/seed/reset pueden cargar .env por su cuenta y no siempre invocan parseEnv. No trasladarles todas las garantías del arranque. No publicar valores reales en ejemplos.

Una URL pública de fotos afecta allowlist/origen del cliente; una URL de email afecta deep links y disponibilidad web; un cambio de JWT/DB afecta sesiones y contratos. Antes de cerrar cambios, revisar [configuración cliente](https://github.com/FeryaelJustice/MiraiLink/blob/codex/documentacion-integral/docs/estudio/configuracion.md).
