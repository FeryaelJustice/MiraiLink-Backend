# Render App Links y confirmacion de 2FA por correo

Fecha: 2026-10-26. Rama local en ambos repositorios: codex/render-app-links.

## Cambios

- Los correos de registro/verificacion y recuperacion usan HTTPS en el dominio
  de Render como enlace principal. La verificacion del registro es la misma
  operacion de verificar cuenta, no un endpoint de registro publico nuevo.
- GET /.well-known/assetlinks.json publica la asociacion Android.
- Las paginas /verify, /verification, /reset-password, /recover_password y
  /recover-password ofrecen Abrir MiraiLink, acceso a Google Play e
  instrucciones para usar el codigo del correo. No confirman operaciones.
- Activar 2FA requiere codigo de correo y TOTP del autenticador. Desactivarlo
  requiere otro codigo de correo. Estos correos no contienen URLs.
- El login posterior mantiene TOTP y recovery codes.
- Cada codigo de correo 2FA dura cinco minutos, permite cinco intentos y
  queda asociado a usuario y operacion. Reenviar sustituye el anterior.
- El codigo se guarda como hash. El estado no cambia si falla SMTP.
  En produccion no se admite simular un envio de 2FA.
- El modo demo no envia correos ni cambia el backend.

## Lo que debes cambiar en Render

1. Subir los cambios de la rama del backend al repositorio remoto y desplegar
   esa revision en el servicio existente. El despliegue no se ha realizado desde esta tarea.
2. En Environment del servicio, fijar:

```dotenv
APP_BASE_URL=https://mirailink-backend.onrender.com
ANDROID_APP_SHA256_FINGERPRINTS=16:A5:40:D3:FA:11:EE:8D:E0:D9:77:C2:93:AA:7D:DA:4B:0F:68:14:97:78:D3:81:C5:28:34:B5:C2:90:0A:6E
```

3. Conservar DB_URL y las credenciales SMTP ya configuradas. No necesitas
   cambiar la URL de Neon para los App Links.
4. Revisar el arranque: el migrador existente aplicara
   023_two_factor_email_challenges.sql a Neon cuando despliegues el backend.
   La prueba de esta migracion se hizo en PostgreSQL local desechable.
   No se ha ejecutado contra Neon en esta tarea.
5. Comprobar que el endpoint siguiente responde HTTP 200, application/json,
   sin autenticacion ni redireccion, con el paquete y huella de Play:

```text
https://mirailink-backend.onrender.com/.well-known/assetlinks.json
```

## Pruebas antes de publicar en Play

La APK debug de este equipo esta firmada con esta huella publica:

```text
6C:2C:A7:69:6F:47:70:47:7A:AA:38:61:F5:93:F0:B5:73:44:E2:7B:E2:7C:22:53:63:99:E9:D1:93:6B:A8:46
```

Para comprobar apertura automatica con esa APK, configura temporalmente
ambas huellas en Render, separadas por una coma:

```dotenv
ANDROID_APP_SHA256_FINGERPRINTS=16:A5:40:D3:FA:11:EE:8D:E0:D9:77:C2:93:AA:7D:DA:4B:0F:68:14:97:78:D3:81:C5:28:34:B5:C2:90:0A:6E,6C:2C:A7:69:6F:47:70:47:7A:AA:38:61:F5:93:F0:B5:73:44:E2:7B:E2:7C:22:53:63:99:E9:D1:93:6B:A8:46
```

Retira la huella debug cuando termines esas pruebas; para usuarios de Google
Play utiliza la huella de firma de Play, no la de subida del AAB.

Despues de desplegar, instalar la APK actualizada y dar tiempo al verificador:

```powershell
adb shell pm verify-app-links --re-verify com.feryaeljustice.mirailink
adb shell pm get-app-links com.feryaeljustice.mirailink
```

Esperar a que mirailink-backend.onrender.com figure como verified.
No usar set-app-links para forzar aprobacion y confundirla con verificacion.

Probar pulsando un enlace recibido en un cliente de correo real. Las pruebas
con -n MainActivity solo acreditan el enrutamiento dentro de la app.
Algunos clientes abren primero un navegador integrado; la pagina de respaldo
permite continuar con Abrir MiraiLink.

El manifest declara Render como unico host HTTPS verificable. Se retiraron
del filtro los cuatro hosts antiguos cuya asociacion no pudo validarse:
Android 11 puede bloquear todos los App Links si uno de ellos falla.
El esquema mirailink:// sigue admitido para los botones de correos antiguos.
El parser mantiene los hosts anteriores para recepcion explicita, pero Android
no los registra como dominios HTTPS de apertura automatica.

La app de Play anterior no declara Render. Debes instalar la APK nueva para
las pruebas y publicar despues la version actualizada. Las versiones antiguas
no aportan emailCode al activar/desactivar 2FA; desplegar el backend endurecido
impide esas dos operaciones desde clientes antiguos. Coordina su despliegue
con la nueva app. No se mantiene una via sin codigo para evitar ese bloqueo.

La APK debug compilada en esta tarea apunta al backend de Render. Si usas
otra configuracion local, comprueba mirailink.baseUrl en local.properties
antes de generar tu release. No se han modificado propiedades locales ni
credenciales de firma.

## Contratos de 2FA

- POST /api/auth/2fa/email/request con sesion y { "action": "enable" } o disable.
- POST /api/auth/2fa/setup prepara el autenticador sin habilitarlo.
  Rechaza reemplazar el secreto de un 2FA que ya este activo.
- POST /api/auth/2fa/verify con { "token": "TOTP", "emailCode": "CODIGO_CORREO" }.
- POST /api/auth/2fa/disable con { "emailCode": "CODIGO_CORREO" }.
- POST /api/auth/2fa/loginVerifyLastStep conserva challengeToken y code.
- Todos los codigos anteriores se indican como marcadores, no valores validos.
- Sin sesion: 401. Sin verificacion: 403. Codigo invalido, caducado o agotado:
  400 INVALID_CODE. Limite de solicitudes: 429. Fallo SMTP: 503.
- No reenviar repetidamente para probar: el limite actual es de cinco correos
  por hora por IP; confirmar usa el limite de autenticacion existente.

## Validacion realizada

Consultar el informe verification.md junto a spec.md, plan.md y tasks.md en
docs/features/render_app_links. Las pruebas locales no acreditan entrega SMTP
ni asociacion del dominio desplegado. No se envio correo a personas reales,
no se altero Neon y no se publico una release.

La APK debug y la app de Play tienen firmas distintas. Para probar sin desinstalar tu app de Play ni perder sus datos, utiliza el emulador o un canal interno de Play firmado por Play. No desinstales la app de uso personal solo para esta comprobacion.
