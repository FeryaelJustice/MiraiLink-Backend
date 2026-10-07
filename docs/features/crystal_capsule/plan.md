# [APROBADO] Integración Cápsula de Cristal

Autorizado el 2026-10-06. Rama `codex/crystal-capsule` en Android desde `master` y backend desde `main`, inicialmente limpias y actualizadas. Conservar arquitectura y dependencias actuales.

## Secuencia

1. Especificación, plan y tareas aprobados.
2. Persistencia, catálogo y motor del servidor.
3. Matching, chat, proyecciones fotográficas y API aditiva.
4. Android: contratos, caché, Demo y estado reactivo.
5. Descubrimiento, cristal, chat, accesibilidad y ayuda.
6. Pruebas, recorridos y documentación de evidencias.
7. Backend y migración primero; Android después. Activar bandera tras validar compatibilidad. Desactivar nuevas cápsulas conserva lectura y salida de existentes.

## Backend y API

Migración aditiva `014_crystal_capsule.sql` (esquema base) y migración `015_crystal_capsule_v2.sql` (regla de 4 puntos compartidos, preguntas personalizadas y desacople del chat ordinario). Versionar reglas (`rulesVersion = 2`) y revisión.

Reglas del motor v2:
- Progreso 0..4, level = progress (0..4).
- Los mensajes convencionales de chat no otorgan progreso y se bloquean con 403 (`CAPSULE_CHAT_LOCKED`) mientras `status != 'revealed'`.
- 1 punto bilateral exacto al completar ambos usuarios la misma pregunta. Al llegar a 4 puntos, transición automática a `revealed`.
- Máximo 1 pregunta activa simultánea; intento concurrente devuelve 400 (`TURN_BUSY`).
- Proponer pregunta requiere respuesta del proponente (`answer`, máx 300 caracteres); si `isCustom: true`, texto libre (`customQuestion`, máx 120 caracteres).
- Archivo en `completedQuestions` con texto, respuestas y timestamp, desocupando `question = null`.

| Contrato | Ampliación compatible |
| --- | --- |
| Preferencias y swipes | `discovery_mode`; omisión conserva preferencia existente |
| Feed, likes, perfiles y fotos | `photoPresentation` por pareja |
| Envío de mensajes | Bloqueado (`CAPSULE_CHAT_LOCKED`) hasta revelar conexión |
| Historial | `include_capsule=true` devuelve envelope con snapshot v2 |
| `GET /capsules/config` | Disponibilidad, rulesVersion: 2 y catálogo |
| `POST /capsules/{id}/actions` | UUID, revisión esperada, preguntas activas/personalizadas y respuestas bilaterales |

Android declara capacidad `crystal-capsule-v1`. Clientes antiguos reciben proyecciones sin fotografías veladas. Conflictos de revisión incluyen estado actualizado. Android acepta historial/confirmaciones antiguos durante despliegue escalonado.

## Android

Mantener `:app`, Koin, Retrofit y Navigation 3. Versiones verificadas: Kotlin 2.4.20, AGP 9.4.1, Gradle 9.8, Compose BOM 2026.09, Coil 2.7, Room 2.8.5, Retrofit 3 y Koin 4.2.2. SDK mínimo efectivo 30. Skills Android compartidas y CLI local para inspección, instalación y captura.

Modelos inmutables, repositorio/casos de uso, implementaciones remota/Demo con delegación existente. `StateFlow` observado con `collectAsStateWithLifecycle`. Efectos efímeros separados sin replay. Polling único y secuencial, protegido contra solapamientos y ligado a pantalla activa.

Snapshots cifrados con clave entorno/cuenta/pareja. Borradores y UUID pendientes restaurables. Servidor prevalece; fallo de caché no transforma una confirmación del servidor en fallo. Room Demo 5 a 6 añade tabla sin borrar datos; reinicio explícito limpia cápsulas. Interlocutor simulado identificado.

`CrystalPhoto` compartido: blur API 31+, mosaico API 30, fracturas, placeholder y vista ampliada. Sin detector decorativo de gestos. Holo recupera preferencia al revelar. Swipe acumula desplazamiento síncronamente para no perder deltas rápidos, conservando el umbral existente.

Permiso de notificaciones solo para sesión real autenticada API 33+, ofrecido una vez. Demo no queda bloqueado por ese diálogo ni por intersticiales de la sesión real.

## Validación y entrega

Unitarios Android/backend, PostgreSQL desechable, OpenAPI y lint. Instrumentación API 35 y recorrido manual API 30. Documentar por separado vibración física, accesibilidad completa, rendimiento comparativo y despliegue. La compilación no acredita comportamiento visual; las capturas no acreditan rendimiento.

[Especificación](spec.md) - [Tareas](tasks.md) - [Evidencia](evidence.md) - [Android](https://github.com/FeryaelJustice/MiraiLink/blob/codex/crystal-capsule/docs/features/crystal_capsule/plan.md).
