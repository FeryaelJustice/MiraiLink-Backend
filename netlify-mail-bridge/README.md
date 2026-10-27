# Puente SMTP de MiraiLink en Netlify

Render Free no permite conexiones salientes a los puertos SMTP habituales. Este proyecto independiente recibe mensajes por HTTPS, autentica la llamada con una clave privada y los envia usando Nodemailer y el SMTP de Hostinger por TLS en el puerto 465. No cambia el servidor de correo, los registros DNS ni la base de datos.

## Configuracion de Netlify

Crear un proyecto separado con `netlify-mail-bridge` como directorio base. Configurar `SMTP_USER` y `SMTP_PASSWORD` con el buzon de Hostinger y `BRIDGE_KEY` con una clave aleatoria de al menos 32 caracteres. Marcar `SMTP_PASSWORD` y `BRIDGE_KEY` como secretos. Las variables deben estar disponibles en Functions y en el contexto production. Publicar el proyecto y usar la ruta `/.netlify/functions/bridge`. Cada cambio de variables requiere un nuevo despliegue.

## Configuracion de Render

Una vez desplegado el backend que incluye el adaptador, establecer `EMAIL_USER` con el mismo buzon de Hostinger, `MAIL_BRIDGE_URL` con la URL HTTPS publicada de la funcion y `MAIL_BRIDGE_KEY` con la misma clave privada configurada en Netlify. Nunca incluir estas claves en Git, logs, Android ni el chat. En Render Free, quitar la URL del puente reactiva el SMTP directo, que no puede conectarse a los puertos bloqueados.

El puente procesa credenciales y mensajes en Netlify. Quien conozca la clave puede enviar correo mediante el buzon: usar una clave aleatoria, limitar su acceso y rotarla si se expone. El correo solo se considera aceptado cuando Hostinger confirma la entrega al servidor SMTP; comprobar por separado la llegada a la bandeja. Las cuotas gratuitas de Netlify se comparten entre los proyectos del equipo; si se agotan, los proyectos pueden quedar suspendidos hasta el siguiente periodo.

## Comprobaciones

Antes de habilitarlo para usuarios, comprobar que una llamada sin autorizacion devuelve 401, ejecutar la verificacion SMTP y enviar un correo a un buzon propio. Despues comprobar registro, reenvio, recuperacion y 2FA desde el backend desplegado y Android. No registrar tokens, contrasenas ni mensajes.
