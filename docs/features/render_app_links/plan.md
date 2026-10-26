# [APROBADO] Plan tecnico: enlaces Render y confirmacion de 2FA por correo

- Especificacion: [spec.md](spec.md), APROBADA el 2026-10-26.
- Estado: APROBADO por el propietario el 2026-10-26 (respuesta: si).
- Repositorios: MiraiLink y MiraiLink-Backend.
- Rama de cada repositorio: codex/render-app-links.
- Fecha: 2026-10-26.

## 1. Hechos verificados

Android: un modulo :app; Kotlin 2.4.21, AGP 9.4.1, Java 17,
Compose BOM 2026.09.00, Navigation 3 1.2.0, Koin 4.2.2,
Retrofit 3.0.0, OkHttp 5.5.1. minSdk 30, compileSdk y targetSdk 37.
Fuentes: gradle/libs.versions.toml y app/build.gradle.kts.

Backend: package.json declara Node >=22, Express ^5.2.1, pg ^8.23.1,
Zod ^4.6.5, bcrypt ^6.0.0, speakeasy ^2.0.0, nodemailer ^10.0.14,
Vitest ^5.0.3 y Supertest ^7.3.1. Reutilizar dependencias existentes.
No cambiar versiones ni instalar paquetes para esta funcionalidad.

La tabla verification_tokens restringe type a email/sms. Password reset
dispone de su propia tabla. No reutilizar estos codigos para confirmar 2FA.
El migrador aplica SQL de src/database/migrations al arrancar el servidor.
No ejecutar migraciones contra Neon durante las pruebas locales.

## 2. Dominio y enlaces publicos

- Un modulo de configuracion valida APP_BASE_URL como origen HTTPS y las
  huellas SHA-256 como 32 pares hexadecimales separados por dos puntos.
- Valor por defecto del origen publico:
  https://mirailink-backend.onrender.com.
- Variable ANDROID_APP_SHA256_FINGERPRINTS con lista separada por comas.
  Incluir como huella publica predeterminada la proporcionada por el
  propietario; permitir configurar adicionalmente la de pruebas.
- Paquete fijo com.feryaeljustice.mirailink.
- GET /.well-known/assetlinks.json devuelve application/json,
  sin autenticacion ni redirecciones, relacion delegate_permission/common.handle_all_urls.
  No publicar huellas ficticias.
- GET /verify, /verification, /reset-password y aliases de recuperacion
  usados por Android: paginas de respaldo con boton mirailink:// construido
  con parametros permitidos y escapados, enlace fijo a Google Play e
  instrucciones para introducir el codigo del correo.
- Los GET no consultan ni consumen codigos y no modifican ninguna cuenta.
- Aplicar Cache-Control: no-store y Referrer-Policy: no-referrer a las paginas
  con parametros sensibles; sin scripts ni recursos de terceros.
- Limitar longitudes de parametros, aceptar valores escalares y rechazar
  duplicados y estructuras de query inesperadas. No aceptar redirect arbitrario.
- Escapar HTML de todo parametro interpolado. Mantener Helmet.
- Documentar estas rutas publicas, los contratos de error y la configuracion.

## 3. Correos existentes

- Centralizar construccion de enlaces desde el origen validado.
- Cambiar el boton principal y texto plano de verificacion/registro y reset
  a HTTPS. Mantener los codigos manuales y el respaldo mirailink:// en la
  pagina web para clientes anteriores.
- Conservar userId en verificacion y email en recuperacion.
- Los enlaces no incluyen access tokens, contrasenas, secretos TOTP ni
  recovery codes. No registrar sus valores en nuevas trazas.
- Corregir documentacion historica de deep links solo donde sea pertinente
  para esta funcionalidad.

## 4. Confirmacion de activacion y desactivacion de 2FA

### Persistencia y limites

- Nueva migracion con el siguiente numero libre para tabla
  two_factor_email_challenges: user_id, action (enable/disable), token_hash,
  expires_at TIMESTAMPTZ, attempts y created_at.
- Clave unica por usuario y accion, referencia al usuario con ON DELETE CASCADE,
  restricciones de accion e intentos. Un reenvio invalida el codigo anterior.
- Codigo aleatorio criptografico de seis cifras; almacenar solo hash bcrypt.
  Vigencia de cinco minutos. Maximo cinco intentos por codigo.
- Aplicar emailLimiter a solicitudes de correo y authLimiter a confirmaciones.
  Requerir sesion valida y cuenta elegible, no aceptar un userId arbitrario.
- Confirmaciones serializadas con bloqueo de fila y actualizacion de 2FA
  en una sola transaccion para impedir doble consumo y carreras.
- Un intento fallido incrementa el contador y se confirma en base de datos;
  no revertir accidentalmente el incremento al devolver el error.
- Invalidar el codigo tras su consumo, agotamiento de intentos o sustitucion.
- En fallo SMTP real no afirmar entrega ni permitir cambio de estado.
  El simulador de desarrollo queda identificado como simulacion y nunca
  acredita una prueba de entrega real. No imprimir codigos 2FA en produccion.

### Contratos HTTP

- POST /api/auth/2fa/email/request, body { action: enable | disable }:
  solicita o reenvia el codigo al correo registrado, con sesion y rate limit.
  Respuesta minima con metadatos de expiracion, sin devolver el codigo.
- POST /api/auth/2fa/setup conserva QR y material de configuracion, sin
  habilitar 2FA; rechaza regenerar secreto si 2FA ya esta activo.
- POST /api/auth/2fa/verify, body { token, emailCode }:
  exige TOTP valido y codigo de correo para enable antes de habilitar 2FA.
- POST /api/auth/2fa/disable, body { emailCode }:
  exige codigo de correo para disable antes de borrar secreto y recovery codes.
- POST /api/auth/2fa/loginVerifyLastStep permanece con challengeToken y
  TOTP/recovery code como ahora; el codigo de correo no inicia sesion.
- Errores usan AppError, contrato normalizado y mapeo localizado Android;
  distinguir fallo de correo, codigo invalido/expirado y limite de intentos.
- Actualizar docs/openapi.yaml, api-reference.md y code-reference.md.
- Los correos 2FA contienen solo instrucciones, accion y codigo, sin URLs.
  No enviar secreto de autenticador ni recovery codes por correo.

## 5. Android por capas

### Navegacion y manifest

- Anadir filtro HTTPS autoVerify para el host exacto de Render y las rutas
  soportadas, sin capturar rutas /api ni destinos de 2FA.
- Verificar filtros resultantes y los hosts anteriores: en Android 11 o
  inferior todos los hosts declarados pueden afectar a la verificacion.
  Documentar el resultado; no dar por validos dominios que no se comprobaron.
- Extraer o delimitar el parser de URI con allowlist de esquema, host, ruta
  y parametros antes de convertirlos en AppScreen.
- Mantener Intent.data en arranque y onNewIntent; probar cola del enlace
  durante Splash, carga de sesion y cambio de autenticacion.
- Reinicializar formularios si llega otro enlace mientras la app esta
  abierta. Evitar efectos con clave Unit que retengan el token anterior.
- No persistir tokens recibidos en preferencias, ni emitirlos a analitica.

### Data y dominio

- Ampliar TwoFactorApiService, TwoFactorRemoteDataSource, TwoFactorRepository,
  implementacion y casos de uso para pedir codigos y confirmar con emailCode.
- Mantener MiraiLinkResult y AppError tipados, dispatchers y DI Koin.
- Adaptar dobles y repositorio demo al contrato. El modo demo no envia
  correos ni realiza cambios en el backend real.

### Presentacion

- ConfigureTwoFactorViewModel expone con StateFlow estado de solicitud,
  envio, errores, codigo de correo, TOTP y reenvio.
- Activacion: configurar autenticador, solicitar correo, introducir
  codigo de correo y TOTP, confirmar y mostrar recovery codes.
- Desactivacion: solicitar correo, introducir codigo y confirmar.
- No enviar correo desde recomposiciones; deshabilitar confirmacion mientras
  falta un codigo o hay solicitud activa; permitir reintento explicito.
- Limpiar codigos al cancelar/completar, no guardar secretos en SavedStateHandle.
  Tras muerte del proceso, permitir reiniciar el flujo de forma segura.
- Mensajes y etiquetas en recursos, conservar placeholders y cobertura de
  idiomas del proyecto. IME, desplazamiento, TalkBack y areas tactiles.
- Sin red, informar error recuperable sin afirmar activacion o desactivacion.

## 6. Pruebas y evidencias

Backend:
- Probar HTML/texto enviado por nodemailer con transporte simulado, enlaces
  HTTPS, codificacion de parametros y ausencia de URLs en correos 2FA.
- Supertest para assetlinks y respaldos: content type, sin redirecciones,
  cabeceras, escape HTML, parametros duplicados, origen y errores.
- Pruebas de 2FA: solicitar, reenviar, activar con ambas pruebas,
  desactivar, proposito incorrecto, otro usuario, expirado, repetido,
  intentos agotados, falta de sesion y fallo SMTP.
- Prueba de migracion y consumo concurrente con PostgreSQL desechable si
  existe un entorno local disponible. Nunca usar Neon como base de pruebas.
- Ejecutar npm run check, distinguir fallos previos y tests de DB omitidos.
  Usar UPLOAD_ROOT temporal; no leer ni inventariar src/assets.

Android:
- Tests de parser con URI reales de ejemplo y origen/parametros invalidos;
  tests de ViewModels y contrato remoto de confirmacion 2FA.
- Ejecutar testDebugUnitTest, assembleDebug y lintDebug.
- Validar UI y enlaces con emulador o dispositivo si hay uno disponible.
  Actualmente adb devices no lista ninguno; comprobar AVD disponibles.
- Probar inicio frio, app abierta, nuevo enlace, sesion presente/ausente,
  error offline y confirmaciones de 2FA con servicios de prueba.
- No ejecutar AppE2ETest ni otros tests que alteren cuentas reales.
- La apertura automatica requiere dominio desplegado y certificado coincidente.
  Abrir una Activity explicitamente o forzar aprobacion del dominio solo prueba
  el enrutamiento y no acredita Android App Links verificado.

## 7. Entrega y configuracion operativa

- Mantener los cambios en codex/render-app-links de cada repositorio.
- Documentar variables exactas: APP_BASE_URL y
  ANDROID_APP_SHA256_FINGERPRINTS con la huella publica de Play:
  16:A5:40:D3:FA:11:EE:8D:E0:D9:77:C2:93:AA:7D:DA:4B:0F:68:14:97:78:D3:81:C5:28:34:B5:C2:90:0A:6E.
- Para debug, obtener solo la huella publica del certificado de la APK
  construida, sin leer ni volcar propiedades de firma o credenciales.
- Documentar despliegue de backend y migracion automatica de Neon al arrancar.
  No ejecutarlos durante este trabajo ni publicar un nuevo release.
- Advertir compatibilidad: la app anterior no aporta emailCode y no abre
  Render automaticamente. Coordinar backend y nueva version antes de probar
  activacion/desactivacion en produccion; no admitir una via antigua que
  desactive 2FA sin codigo para conservar compatibilidad.
- No modificar credenciales SMTP existentes ni asumir entrega por simulacion.
  Proporcionar pasos de comprobacion del proveedor en Render.
- Informe final separa build/tests locales, PostgreSQL local, UI,
  SMTP real y dominio publico; marcar lo pendiente sin afirmar exito completo.
- Un fallo de verificacion publica solo puede resolverse despues de desplegar
  el backend actualizado. Facilitar comandos de consulta/reverificacion
  Android y comprobar estado verified sin aprobacion manual forzada.

## 8. Siguiente paso SDMD

Esperar aprobacion explicita de este plan. Despues crear tasks.md y ejecutar
las tareas en orden, con pruebas y evidencias antes de marcar completado.


## Ajuste verificado durante la implementacion

El emulador devolvio 1024 para los cuatro hosts antiguos y no se obtuvo una respuesta HTTPS valida al consultar sus assetlinks. Para evitar el bloqueo de Render en Android 11 se retiran esos hosts del filtro del manifest; se conserva mirailink:// y el parser de recepcion explicita de enlaces anteriores.
