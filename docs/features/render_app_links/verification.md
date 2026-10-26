# Verificacion: Render App Links y 2FA por correo

Fecha: 2026-10-26. Especificacion y plan aprobados.
Rama en cada repositorio: codex/render-app-links.

## Resultados comprobados

- Android: assembleDebug correcto.
- Android: 535 tests JVM, cero fallos en testDebugUnitTest.
- Incluye parser URI, contratos de 2FA, codigo obligatorio, fallo SMTP
  reflejado en el estado de UI, reenvio y limpieza al cancelar.
- Backend: 37 tests especificos de enlaces, correo y servicios 2FA correctos.
- PostgreSQL 17 local desechable: seis tests correctos.
  Cubren migracion repetible, activacion con correo y TOTP, desactivacion
  con correo, caducidad, cinco intentos, separacion de propositos y
  confirmaciones simultaneas. Incluyen peticiones HTTP con autenticacion
  real de prueba y login TOTP posterior.
- Backend: npm run lint correcto.
- Backend: npm run check:routes correcto, 84 operaciones documentadas.
- git diff --check sin errores de espacios en ambos repositorios.

## Emulador Pixel_10a

Se instalo la APK debug y se observaron las pantallas mediante android layout.

1. App cerrada, enlace Render /verify con codigo ficticio 123456:
   abre Verify your account y muestra 123456.
2. App abierta, enlace /reset-password con codigo ficticio 654321 y email
   codificado: abre Reset password y solicita nueva contrasena.
3. Segundo enlace al mismo destino con codigo 333333: actualiza el campo,
   sin conservar 654321.
4. URL de evil.test enviada explicitamente a la Activity: se rechaza,
   conserva la pantalla anterior y no introduce el codigo malicioso.
5. Captura reset-link.png inspeccionada visualmente: pantalla correcta,
   sin errores visuales observados en este formulario.

6. APK final reinstalada: mirailink://verify abre Verificacion desde la app
   cerrada mediante resolucion normal de Android, conservando el codigo 555555.

Las pruebas HTTPS usaron un componente explicito: no acreditan autoapertura del
dominio. No se pulsaron botones para confirmar cuentas ni cambiar contrasenas
en el backend real. No se inicio sesion con credenciales reales.

La UI de activacion/desactivacion de 2FA se cubrio con pruebas JVM de estado
y contratos; no se completo su recorrido visual autenticado en el emulador.

## Bloqueos y limites

- Render publico devuelve HTTP 404 en /.well-known/assetlinks.json antes
  del despliegue de esta rama.
- Android muestra 1024 para ese dominio con la version publicada del
  backend: no se atribuye estado verified y no se ha forzado su aprobacion.
- La firma debug es distinta de Play; la guia indica ambas huellas y
  cuando retirar la de debug.
- Se retiraron los hosts HTTPS antiguos del manifest para evitar el bloqueo
  de verificacion conjunto en Android 11. Se mantiene mirailink://.
- lintDebug queda bloqueado en generateDebugAndroidTestLintModel por conflictos
  de dependencias de instrumentacion: junit 1.3.0 frente a restriccion 1.1.5,
  espresso-core 3.7.0 frente a 3.5.0, runner 1.7.0 y coroutines-test 1.11.0.
  app/build.gradle.kts y libs.versions.toml no se cambiaron en esta tarea.
- Suite completa backend con cobertura: 243 correctos, tres fallos,
  27 omitidos (incluidos los seis tests locales opt-in cuando no se aporta URL).
  Los fallos son uno de capsule-matching.test.js y dos de
  reset-interactions.test.js. Sus modulos y tests no presentan diferencias
  respecto a main. npm run check no puede declararse correcto.
- No se probo entrega SMTP real ni se desplego, migro Neon o publico en Play.
- No se ha preparado AAB de release.
- Hay un cambio simultaneo ajeno a esta tarea en NetworkErrorMapper.kt;
  se ha conservado sin modificar. Las verificaciones Android usan el
  estado actual compartido del checkout, incluido ese cambio.

## Reproduccion

Android:

```powershell
.\gradlew.bat assembleDebug testDebugUnitTest --no-configuration-cache
.\gradlew.bat lintDebug --no-configuration-cache
```

Backend:

```powershell
npm run lint
npm run check:routes
npx vitest run tests/integration/app-links.test.js tests/integration/two-factor-email.test.js tests/unit/services/twoFactorEmailService.test.js tests/unit/services/twoFactorService.test.js tests/unit/utils/security-mail.test.js tests/unit/utils/mailer.test.js
npm run test:coverage
```

Los tests de PostgreSQL son opt-in con APPLINKS_TEST_DB_URL y solo admiten
127.0.0.1 y el nombre mirailink_app_links_test. Crean fixtures minimos,
limpian exclusivamente esa base de pruebas y nunca deben apuntar a Neon.
La base temporal de esta sesion se inicio en el puerto 55439.

Consultar [guia operativa](../../render-app-links.md) antes de desplegar
y completar verificacion publica y correo real. No declarar lista la release
hasta cerrar estas comprobaciones y los bloqueos de validacion.

La base PostgreSQL temporal se cerro y su directorio se elimino tras verificar su ruta dentro de Temp. La ejecucion final Android repitio assembleDebug y testDebugUnitTest correctamente.
