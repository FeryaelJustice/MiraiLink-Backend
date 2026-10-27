# Correo y autenticación

El backend usa Nodemailer y el SMTP configurado de Hostinger. Los enlaces HTTPS de los correos abren la aplicación cuando Android tiene el dominio asociado; en caso contrario muestran una página con la opción de abrir la aplicación y Google Play. Abrir el enlace mediante GET no confirma por sí mismo una operación: la aplicación envía después la petición POST correspondiente.

## Registro y verificación

1. `POST /api/auth/register` recibe los datos de registro. Crea una cuenta pendiente y un código de seis dígitos que caduca a los 15 minutos.
2. Neon guarda un hash bcrypt del código en `verification_tokens.token_hash`. El correo contiene el código original y un enlace `GET /verify?token=CODIGO&userId=ID`.
3. La aplicación envía `POST /api/auth/verification/confirm` con `userId`, `type: "email"` y `token: "CODIGO"`. El backend compara el código original con el hash, marca la cuenta como verificada, elimina el código y devuelve un token de sesión.
4. También se puede solicitar otro correo con `POST /api/auth/verification/request` y `userId` y `type: "email"`. El código anterior deja de ser válido.

El hash almacenado no se puede convertir de vuelta en el código y no debe enviarse a la aplicación como si fuera el código. Si el envío falla después de crear la cuenta pendiente, volver a registrar exactamente el mismo nombre de usuario, correo y contraseña permite reanudar el registro pendiente. No hace falta borrar el usuario. Es necesario arreglar primero la entrega de correo.

## Recuperar contraseña

`POST /api/auth/password/request-reset` recibe `email`. Con correo operativo, la respuesta es neutra para no revelar si existe la cuenta. Para una cuenta apta se genera un código de seis dígitos, válido durante cinco minutos; Neon guarda su hash y el correo contiene el código original y el enlace `GET /reset-password?token=CODIGO&email=CORREO`.

La aplicación envía `POST /api/auth/password/confirm-reset` con `email`, `token: "CODIGO"` y `newPassword`. El backend comprueba el código, cambia la contraseña y elimina los códigos de recuperación. No se garantiza la revocación de todas las sesiones anteriores.

## Doble factor

Con una sesión autenticada, `POST /api/auth/2fa/setup` prepara el secreto, el QR y los códigos de recuperación. `POST /api/auth/2fa/email/request` con `action: "enable"` envía un código temporal por correo, sin enlace. `POST /api/auth/2fa/verify` recibe `token` de la aplicación autenticadora y `emailCode` del correo para terminar la activación.

Para desactivar, se solicita otro correo con `action: "disable"` y se envía `POST /api/auth/2fa/disable` con `emailCode`. El inicio de sesión habitual usa la aplicación autenticadora o un código de recuperación mediante `POST /api/auth/2fa/loginVerifyLastStep`; no envía un código TOTP por correo. Los códigos de correo caducan a los cinco minutos y se almacenan como hash.

## Diagnóstico de entrega

La aceptación de un mensaje por SMTP no demuestra que haya llegado a la bandeja del destinatario. Los registros de producción solo deben contener el código y la fase genérica del error SMTP, nunca contraseñas, destinatarios ni códigos de verificación.

Render Free bloquea las conexiones SMTP salientes por los puertos 25, 465 y 587. Hostinger documenta los puertos 465 y 587 para su SMTP y no admite 2525. Por tanto, con el backend en Render Free y una conexión directa al SMTP de Hostinger, el código no puede resolver el bloqueo de red. Una opción requiere cambiar el plan de Render; cualquier otra arquitectura requiere evaluar y autorizar su configuración. No se ha incorporado otro proveedor de correo.

- [Limitaciones de Render Free](https://render.com/docs/free)
- [Configuración SMTP de Hostinger](https://www.hostinger.com/support/1575756-how-to-get-email-account-configuration-details-for-hostinger-email/)
- [Puertos SMTP de Hostinger](https://www.hostinger.com/ca/tutorials/smtp-port/)
