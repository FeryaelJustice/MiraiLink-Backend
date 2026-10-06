# Evidencia de Cápsula de Cristal

Fecha: 2026-10-06. Ambos repositorios en `codex/crystal-capsule`. Entrega preparada para revisión mediante PR. Despliegue productivo no verificado.

## Corrección del bloqueo gris

Se reprodujo Demo oscurecido por el diálogo de notificaciones después de reiniciar. La solicitud se lanzaba al entrar independientemente de la sesión. Ahora se ofrece una vez, solo en sesión real autenticada con API 33+. Demo no la solicita. El diálogo se cierra antes de delegar al permiso del sistema. Los intersticiales de sesión real tampoco interrumpen Demo.

Se reinstaló APK conservando datos y se verificó relanzamiento en API 35. La introducción voluntaria de Cápsula y el consentimiento publicitario siguen siendo diálogos visibles con controles; no deben confundirse con una capa de cristal sobre la fotografía.

## Resultados ejecutados

| Comprobación | Resultado |
| --- | --- |
| Android assembleDebug y assembleDebugAndroidTest | APK generado |
| Android testDebugUnitTest | 504 pruebas, cero fallos/errores |
| HoloGestureTest API 35, última compilación | 12 pruebas, 36.226 s, todas pasan |
| Backend npm test | 126 pasan, 7 condicionales omitidas sin DB |
| PostgreSQL capsule.integration.test.js | 6 pasan con DB obligatoria |
| PostgreSQL schema.integration.test.js | 1 pasa en ejecución específica anterior |
| OpenAPI | 63 operaciones documentadas, contrato válido |
| ESLint de componentes nuevos de cápsulas | Pasa |
| Android lintDebug | 1 error previo CredManMissingDal, 156 avisos y 1 hint |
| ESLint global | Pasa tras incorporar los arreglos de main antes de publicar la PR |

PostgreSQL 17 desechable local: migración desde esquema actual y creación desde cero, repetición de migración, likes simultáneos, modos, autorización, revisión y reintentos, misiones, pausa/salida, deshacer/reencuentro, reanudación y revelación bilateral. Recorrido HTTP con dos JWT de prueba a través de Express y comprobación de fotos compatibles/antiguas. Sin usar producción ni db:reset. Sembrado específico repetido devuelve 40 preguntas.

Unitarios Android cubren historial antiguo/envelope, repositorios, caché, ViewModel, Demo, ráfagas consecutivas entre consultas y migración Room. Instrumentación API 35 cubre swipe, botones, tap de fotos, pulsación larga, vista ampliada y preservación de Holo/heartbeat con cristal.

## Observación visual

- API 35: feed velado, selector, chat, misión gaming contestada y primer desbloqueo en progreso 2. Reinicio de Demo sin diálogo de notificaciones.
- API 30: mosaico sellado con controles y biografía legibles. La imagen del emulador tiene Google Play Services antiguo y puede mostrar su notificación; el recorrido Demo funciona.
- La instrumentación Holo en API 30 no se considera aprobada: el arnés MockK reflejó PictureInPictureUiState, ausente en ese SDK. La comprobación visual/manual se registra por separado.

Capturas de perfiles ficticios Demo: [API 30](https://github.com/FeryaelJustice/MiraiLink/blob/codex/crystal-capsule/docs/features/crystal_capsule/evidence/api30-sealed.png), [API 35](https://github.com/FeryaelJustice/MiraiLink/blob/codex/crystal-capsule/docs/features/crystal_capsule/evidence/api35-relaunch.png).

## Límites permanentes

No se deduce comportamiento visual, rendimiento o vibración a partir de compilación o unitarios. No había teléfono físico conectado al cierre. Falta comprobar sensación háptica, TalkBack/texto ampliado completos, comparación controlada de memoria/fluidez y recorrido Android remoto con dos cuentas. Una captura no acredita ausencia de flashes durante toda la carga ni estabilidad de FPS.

El informe gfxinfo exploratorio del emulador debug incluyó arranque y swipe, por lo que no acredita comparación Normal/Cápsula. El informe remoto de Kotzilla agregado incluye sesiones históricas y no acredita regresiones de esta rama.

La entrega no está activada en producción. Aplicar [despliegue](deployment.md) antes de habilitar Cápsula remota. El error lint DAL necesita configuración válida de asociación con el dominio, sin inventar una asociación ni ocultar la regla.

[Spec](spec.md) - [Plan](plan.md) - [Tareas](tasks.md) - [Android](https://github.com/FeryaelJustice/MiraiLink/blob/codex/crystal-capsule/docs/features/crystal_capsule/evidence.md).
