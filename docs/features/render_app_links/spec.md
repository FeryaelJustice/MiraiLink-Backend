# [APROBADO] Enlaces de seguridad y Android App Links en Render

- Fecha: 2026-10-26
- Estado: APROBADO por el propietario el 2026-10-26 (respuesta: si)
- Rama en ambos repositorios: codex/render-app-links

## 1. Problema y objetivo

Abrir los enlaces HTTPS de los correos de MiraiLink desde el dominio
https://mirailink-backend.onrender.com en la pantalla Android correspondiente,
antes de preparar la siguiente release de Google Play. Entregar instrucciones
concretas de configuracion de Render y validacion de firma.

## 2. Situacion comprobada

- Android procesa Intent.data al arrancar y en onNewIntent.
- NavWrapper admite verificacion y recuperacion mediante token, userId y email.
- El manifest declara dominios mirailink.xyz y mirailink.com, sin Render.
- El backend envia correos al registrar, reenviar verificacion y pedir reset.
- Sus botones principales usan mirailink:// y los enlaces HTTPS usan APP_BASE_URL,
  con valor predeterminado https://mirailink.xyz.
- No existen rutas publicas de asociacion assetlinks ni paginas de respaldo.
- 2FA usa TOTP y recovery codes. No envia correos al activar ni desactivar.
- La desactivacion actual exige sesion autenticada. Un enlace nunca debe
  efectuar esta accion por si mismo.
- La documentacion historica Android que indica ausencia de procesamiento de
  deep links esta desactualizada frente al codigo inspeccionado.

## 3. Alcance solicitado

- Asociacion publica del dominio con el paquete com.feryaeljustice.mirailink.
- Huellas SHA-256 configurables para la firma de Play y pruebas autorizadas.
- Enlaces HTTPS principales en todos los correos de seguridad existentes.
- 2FA sin URLs ni deep links, segun respuesta del propietario.
- Activar y desactivar 2FA requiere un codigo temporal propio enviado al
  correo de la cuenta, con caducidad y uso unico, sin enlaces.
- El login con 2FA conserva TOTP de autenticador y recovery codes.
- Aprobado: el codigo de correo dura 5 minutos; al activar,
  tambien se comprueba un TOTP para acreditar que el autenticador quedo
  configurado antes de exigirlo en futuros inicios de sesion.
- Respaldo aprobado: pagina con Abrir MiraiLink, acceso a Google Play
  y codigo manual del correo como alternativa.
- Validacion de parametros, origen y destinos admitidos.
- Documentacion y pruebas en ambos repositorios.
- Entrega en ramas separadas de master/main; no publicar la app ni desplegar.
- La asociacion de dominios no requiere cambios de esquema de Neon.
- Los codigos de verificacion existentes se almacenan como hash con caducidad.
  La confirmacion de correo de 2FA debe aislar sus propositos de verificacion
  de cuenta y reset. Su persistencia se concretara en el plan aprobado.

## 4. Reglas y casos de error

- Abrir una URL publica no confirma ni desactiva operaciones sensibles.
- La verificacion de cuenta mantiene la validacion del codigo en backend.
- Reset requiere confirmar una nueva contrasena y validar el codigo vigente.
- No incluir secretos TOTP, recovery codes ni access tokens en URL o correo.
- Mantener compatibilidad con codigos manuales y enlaces anteriores.
- Sin conexion, mostrar el error recuperable habitual y permitir reintento.
- Probar arranque en frio, app abierta, usuario desconectado y conectado.
- Evitar que el arranque o login pierda un destino de seguridad pendiente.
- No persistir nuevos tokens en disco, analitica o registros.
- Paginas publicas sin dependencias de terceros ni filtrado de parametros
  sensibles por Referer, cache o contenido HTML sin escapar.
- Las pruebas usan dobles de correo/base de datos y almacenamiento temporal.
  No alteran usuarios ni datos de Neon.

## 5. Contrato y despliegue

- GET /.well-known/assetlinks.json: publico, JSON de Digital Asset Links;
  responder sin redireccion y con las huellas configuradas.
- GET /verify y /reset-password: respaldo publico de navegacion; sin mutacion.
- No crear un destino publico ni deep links de 2FA.
- Huella SHA-256 de Play facilitada por el propietario:
  16:A5:40:D3:FA:11:EE:8D:E0:D9:77:C2:93:AA:7D:DA:4B:0F:68:14:97:78:D3:81:C5:28:34:B5:C2:90:0A:6E.
- Configuracion publica: APP_BASE_URL y huellas Android, documentadas sin secretos.
- Conservar los contratos POST de verificacion y reset.
- Ampliar los contratos de 2FA para solicitar y confirmar codigos de correo
  separados por usuario y operacion. Conservar el login TOTP existente.
- Un codigo de activacion no puede desactivar 2FA, ni verificar una cuenta;
  tampoco son validos codigos caducados, usados o de otro usuario.
- Solicitar y reenviar codigos exige sesion y limites de frecuencia/intentos.
- Si SMTP no entrega el correo, no afirmar entrega real ni cambiar 2FA.
- No se considera asociacion verificada por aprobar manualmente el dominio:
  debe comprobarse el estado verified emitido por Android.
- La app antigua de Play no incluye Render; la apertura automatica requiere
  instalar una compilacion actualizada y despues distribuir la nueva release.

## 6. Criterios de aceptacion

1. Dada una app actualizada y firma autorizada, cuando Android consulta
   assetlinks, entonces reconoce el dominio como verified.
2. Dado un correo de verificacion, cuando se pulsa su enlace HTTPS,
   entonces abre Verificacion con el codigo y usuario correctos.
3. Dado un correo de reset, cuando se pulsa su enlace HTTPS,
   entonces abre Recuperar contrasena con email y codigo correctos,
   y exige nueva contrasena antes de cambiarla.
4. Dado un enlace invalido, expirado o de dominio ajeno, cuando se abre,
   entonces no ejecuta una accion ni concede una sesion incorrecta.
5. Dada la ausencia de app instalada, cuando se abre el enlace,
   entonces se muestra el respaldo aprobado sin consumir el codigo.
6. Dada una operacion 2FA, cuando se envia su correo,
   entonces no contiene URLs ni deep links; la confirmacion se hace en la app
   con el codigo temporal de correo, validando finalidad, caducidad y uso unico.
   El login posterior sigue exigiendo TOTP o recovery code, como ahora.
7. Dadas las ramas completas, cuando se ejecutan las pruebas,
   entonces se informa por separado de pruebas locales, dispositivo,
   SMTP real y asociacion publica de Render.

## 7. Decisiones pendientes

- Confirmado: codigo temporal por correo para activar y desactivar 2FA,
  sin enlaces; TOTP de autenticador para el login normal.
- Aprobado por el propietario: caducidad de
  5 minutos y prueba TOTP durante la activacion para evitar bloqueos.
- Respaldo aprobado por el propietario el 2026-10-26.
- Huella de Play recibida el 2026-10-26; falta comprobarla en la asociacion real.
- [PENDIENTE] Dispositivo disponible. ADB no pudo iniciar su servicio en la
  primera comprobacion; no se acredita prueba funcional en dispositivo.
- Especificacion aprobada. El plan tecnico requiere su propia revision
  conforme a CLAUDE.md y la skill SDMD.
