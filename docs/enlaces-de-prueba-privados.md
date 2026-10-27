# Enlaces privados de prueba

Esta función sirve para comprobar el registro, el reenvío de verificación y la recuperación cuando el correo no llega. No arregla la entrega SMTP. Está desactivada por defecto y no devuelve enlaces a solicitudes normales.

1. Genera una clave aleatoria larga y única, por ejemplo 32 bytes aleatorios codificados como hexadecimal. No la compartas ni la incluyas en el repositorio.
2. En las variables de entorno del servicio de pruebas de Render configura `DEBUG_SECURITY_LINKS=true`, `DEBUG_SECURITY_LINK_KEY` con esa clave y `DEBUG_SECURITY_LINK_EMAILS` con una lista separada por comas de las direcciones de prueba expresamente autorizadas.
3. En el `local.properties` local de Android configura `mirailink.debugSecurityKey` con la misma clave y `mirailink.baseUrl` con el origen HTTPS del backend. No subas este archivo ni compartas la compilación debug: contiene una clave que permite recuperar enlaces para las cuentas autorizadas.
4. Compila una versión debug. La versión release siempre usa una clave vacía y no ejecuta esta función. Si el correo falla, la respuesta mantiene el error 503 y añade el enlace solo para la petición autorizada. El aviso indica que el correo no se envió, permite copiar el enlace durante 10 segundos y muestra una confirmación de copia durante tres segundos.
5. Abre el enlace copiado en el dispositivo para continuar el flujo. El código original en la URL es temporal y tiene los mismos límites y caducidad que el código de correo.
6. Al terminar, desactiva `DEBUG_SECURITY_LINKS`, elimina la clave de Render y de `local.properties` y recompila la app de prueba. Si la clave o el APK se comparten, desactiva y cambia la clave inmediatamente.

El acceso privado permite obtener enlaces de cualquier dirección incluida en la lista, por lo que debe limitarse a cuentas de prueba y utilizarse solo durante la prueba. En producción, el servidor no registra el enlace ni la clave y la app evita registrar el cuerpo de las respuestas HTTP. En desarrollo, el simulador de correo existente puede escribir códigos en la consola del servidor. No pegues capturas, trazas de red ni enlaces en sitios públicos: contienen credenciales temporales. Los enlaces y la clave no se escriben deliberadamente en Logcat.
