# [APROBADO] Cápsula de Cristal

Especificación y plan aprobados por el usuario el 2026-10-06 mediante `PLEASE IMPLEMENT THIS PLAN`. Descubrimiento por afinidad con estética otaku y gamer, conservando el swipe.

## Descubrimiento

- Normal (`classic`) es el valor predeterminado. Cápsula (`capsule`) es voluntaria y descubre únicamente participantes del mismo modo.
- Conservar filtros, cuotas, suscripciones, like/dislike, deshacer, navegación entre fotos y pulsación prolongada. Cada like conserva su modo; modos cruzados no crean un match ni borran likes pendientes.
- Revalidar ambos modos al confirmar el swipe. Explicar conflictos y recargar tarjetas desactualizadas.
- Velar fotografías también en likes, matches, chats, avatares, perfiles y vista ampliada. Biografía, gustos y controles permanecen legibles.
- Cambiar a Normal solo afecta al descubrimiento futuro. Matches anteriores mantienen su comportamiento. Explicar falta de candidatos y ofrecer cambio explícito.

## Progreso y consentimiento

| Progreso | Nivel | Presentación |
| --- | --- | --- |
| 0 | 0 | Cápsula sellada |
| 1 | 1 | Primera chispa |
| 2 | 2 | Resonancia |
| 3 | 3 | Casi cristal |
| 4 | 4 | Conexión revelada |

En v2, los mensajes convencionales de chat no otorgan puntos y permanecen estrictamente bloqueados hasta que la cápsula alcanza el estado `revealed` (progreso 4). El progreso avanza de forma bilateral y exclusiva respondiendo preguntas (1 punto compartido por cada pregunta respondida por ambos participantes). Al alcanzar 4 puntos compartidos, la cápsula transiciona automáticamente a `status = 'revealed'`.

Gestión de turnos e histórico:
- Solo puede existir 1 pregunta activa simultáneamente por cápsula. Si se intenta proponer una nueva pregunta mientras existe una activa pendiente de respuesta, se devuelve error 400 (`TURN_BUSY`).
- La acción de proponer pregunta incluye obligatoriamente la respuesta del proponente (`answer`, máx 300 caracteres). Si es personalizada (`isCustom: true`), se admite texto libre (`customQuestion`, máx 120 caracteres).
- Al responder el interlocutor, la pregunta se archiva en `completedQuestions` del snapshot con `questionId`, `instanceId`, `category`, texto, `authorId`, `authorAnswer`, `peerAnswer` y `completedAt`, desocupando el turno activo (`question = null`).

Estados: `active`, `paused`, `left`, `cancelled`, `revealed`. Reanudación y revelación anticipada requieren acuerdo bilateral. Revelar es irreversible. Deshacer cancela el vínculo y conserva historial/progreso; un reencuentro necesita nuevo acuerdo y no reinicia ni revela automáticamente.

## Catálogo, privacidad y estadísticas

40 preguntas, cinco por categoría, en español e inglés: anime, gaming, hobbies, vida cotidiana, cita ideal, proyectos personales, objetivos de relación y familia. Familia y temas personales requieren elección explícita. Selección sin repetir hasta agotar disponibles; repetir una pregunta completada no acredita progreso. Cambiar pregunta no resta progreso.

Respuestas vinculadas a mensajes, sin copiar texto a perfiles ni analítica. Registrar categoría, avance y ciclo de vida sin evaluar sentimientos ni inventar porcentajes de compatibilidad. Firebase respeta consentimiento existente. Panel estadístico fuera de alcance.

El cristal no garantiza anonimato, evita capturas ni protege imágenes previamente vistas o accesibles mediante enlaces conocidos.

## Experiencia y compatibilidad

Servidor como fuente de verdad, sin avance provisional offline. Caché cifrada separada por cuenta/entorno. Demo persistente con interlocutor simulado identificado y migración conservadora Room 5 a 6.

Android 12+: desenfoque dinámico y fracturas deterministas. Android 11: mosaico fuera del hilo principal. Decoración sin consumo de gestos. Holo suspendido solo en fotos veladas, conservando preferencia. Heartbeat y Ruleta mantienen sus disparadores.

Animación y confirmación háptica breves únicamente ante nuevo desbloqueo con pantalla activa. Restaurar, rotar o cargar historial no repite efectos. Respetar movimiento reducido, ajustes del sistema y ausencia de hardware. Placeholder velado durante carga; clientes antiguos reciben proyecciones sin fotografías veladas.

Tema claro/oscuro, TalkBack, texto ampliado, objetivos de 48 dp, panel compacto sin ocultar compositor al aparecer teclado, explicación inicial, ayuda contextual y FAQ.

## Aceptación

Verificar migraciones, concurrencia, autorización, idempotencia, revisión, consentimiento, deshacer/reencuentro, eliminación de cuenta y clientes antiguos. Android: contratos, repositorios, caché, Demo, restauración, efectos y gestos. Recorridos de dos cuentas, misiones y cambios de modo. La compilación no acredita comportamiento visual, fluidez ni vibración.

[Plan](plan.md) - [Tareas](tasks.md) - [Evidencia](evidence.md) - [Android](https://github.com/FeryaelJustice/MiraiLink/blob/codex/crystal-capsule/docs/features/crystal_capsule/plan.md).
