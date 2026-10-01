# Contraseñas, JWT, verificación y 2FA en backend

[Guía maestra](../guia-maestra.md) | [Cobertura](cobertura.md)

Revisión de fuentes: 2026-10-01. Las observaciones estáticas no certifican el servidor desplegado ni el comportamiento en dispositivo.


## Password hash y login

[auth.controller.js](../../src/controllers/auth.controller.js) usa bcrypt.hash(password, SALT_ROUNDS) al registrar/cambiar contraseña y bcrypt.compare al acceder. Default rounds 12. PostgreSQL almacena `users.password_hash`; no hay contraseña recuperable por decrypt. El hash de password y el cifrado del secreto TOTP resuelven necesidades distintas.

Login busca email o username, comprueba hash y usuario no eliminado. Sin 2FA devuelve access token e isVerified; con 2FA devuelve challengeToken, requires2FA y expiresIn 300. [tokenService.js](../../src/services/tokenService.js) firma HS256: access 24 h con purpose access; challenge 5 min con purpose 2fa-login. No hay refresh-token flow implementado aquí.

## Autorización y revocación

[auth.middleware.js](../../src/middleware/auth.middleware.js) exige Bearer, consulta token_blacklist, verifica firma/purpose y comprueba usuario actual y verificación. allowUnverified solo habilita rutas concretas. Logout inserta token y vencimiento; una cuenta borrada también deja de autorizarse. La rama optionalAuthenticateToken verifica firma/purpose pero no repite blacklist/estado del usuario: no es equivalente a la guarda obligatoria.

## Códigos de correo

Registro genera código de seis dígitos con randomInt y guarda bcrypt hash, TTL 15 minutos. Recuperación invalida solicitudes previas, guarda un hash TTL 5 minutos y responde neutralmente. Confirmar reset compara el código, actualiza password_hash y borra solicitudes en una transacción. No revoca todas las sesiones JWT ya emitidas.

Confirmación de verificación busca por userId o, si no está disponible, compara hasta 20 códigos activos de ese tipo. Ese fallback no liga explícitamente código a identidad conocida del solicitante; ver [hallazgos](hallazgos.md). Código vencido o erróneo produce INVALID_CODE. No confundir aceptación HTTP con recepción efectiva de un email: el mailer puede simular.

## TOTP, recovery y cifrado

Setup genera secret base32 y ocho recovery codes; almacena secreto cifrado y hashes, inicialmente enabled=false. Verify activa después de TOTP correcto. [twoFactorService.js](../../src/services/twoFactorService.js) usa seis dígitos, step 30 s, window 1; recovery se consume con FOR UPDATE dentro de transacción y used=false en el UPDATE para evitar uso concurrente.

[cryptoUtils.js](../../src/utils/cryptoUtils.js) escribe v2:nonce:tag:ciphertext con AES-256-GCM, nonce aleatorio de 12 bytes y clave de 32 bytes. La lectura legacy CBC requiere IV de 16 bytes y no representa el formato nuevo. Una rotación de clave necesita migración de secretos; cambiar la variable sin reencrypt rompe lectura.

La API de disable2FA exige sesión autenticada y verificada, pero no exige otro TOTP/password en el handler revisado. Documentar ese comportamiento; no convertirlo en garantía de reautenticación.

Diagramas: [secuencia acceso/2FA](../diagramas/autenticacion.md), [estados de cuenta](../diagramas/estados.md). [Android](https://github.com/FeryaelJustice/MiraiLink/blob/codex/documentacion-integral/docs/estudio/autenticacion-y-seguridad.md) describe captura, envío y almacenamiento de sesión.
