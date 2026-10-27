# Puente privado de SMTP Hostinger para Cloudflare Workers

El backend crea el mensaje MIME con Nodemailer y lo entrega mediante HTTPS autenticado al Worker. El Worker establece una conexión TLS directa con `smtp.hostinger.com:465` y envía el mensaje con la cuenta de Hostinger. Las rutas de correo de la aplicación siguen usando `sendGenericEmail`; este puente se activa solo cuando se configura `MAIL_BRIDGE_URL`. El modo SMTP directo sigue disponible sin esa variable.

El Worker devuelve éxito cuando Hostinger acepta el mensaje, no cuando llega a la bandeja. Si la conexión se corta después de enviar el contenido, el resultado puede ser incierto y una repetición puede producir duplicados. No se reintenta automáticamente. El plan gratuito de Workers tiene límites de uso y CPU que deben validarse con mensajes reales.

## Preparación

- Crear un Worker nuevo con `worker.mjs`, `worker-core.mjs` y `wrangler.jsonc`; no modificar la web existente.
- En las variables secretas del Worker configurar `SMTP_USER`, `SMTP_PASSWORD` y `BRIDGE_KEY`. El usuario y la contraseña corresponden al buzón SMTP de Hostinger. `BRIDGE_KEY` debe ser una clave aleatoria independiente de al menos 32 caracteres y mantenerse privada.
- En Render configurar `EMAIL_USER` con el mismo buzón y `MAIL_BRIDGE_URL` con la URL HTTPS del Worker, y guardar la misma `BRIDGE_KEY` en la variable secreta `MAIL_BRIDGE_KEY`.
- Aplicar estos valores solo después de desplegar el código nuevo del backend. Para desactivar el puente y volver al SMTP directo, quitar `MAIL_BRIDGE_URL` y `MAIL_BRIDGE_KEY` del backend. El SMTP directo seguirá bloqueado en Render Free.

El Worker no escribe contraseñas, destinatarios ni contenido de correo en sus registros. No enviar la clave ni el enlace de verificación por chat, ni subir archivos `.env` al repositorio. Cualquier persona que obtenga `BRIDGE_KEY` podría enviar correos desde el buzón, por lo que hay que revocarla o rotarla si se comparte. El propio contenido del correo y las credenciales serán procesados por Cloudflare para transmitirlos a Hostinger.

## Comprobación

Ejecutar `node --test workers/hostinger-smtp-bridge/worker-core.nodecheck.mjs`, las pruebas de `tests/unit/utils/workerMailTransport.test.js` y el análisis del backend. Antes de usarlo en producción, comprobar desde el Worker desplegado la conectividad TLS y la autenticación, enviar un mensaje a una cuenta de prueba propia y confirmar su recepción. Después probar registro, reenvío, recuperación y 2FA. Las pruebas locales con un SMTP simulado no sustituyen la prueba desde Cloudflare.
