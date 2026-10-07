# Tareas SDMD

- [x] Auditar convenciones, aprobar spec y plan y crear ramas.
- [x] Migración 014 y esquema inicial, catálogo es/en de 40 preguntas y sembrado idempotente.
- [x] Motor bilateral, ráfagas, misiones, pausa/salida y acuerdos; pruebas unitarias y PostgreSQL.
- [x] Matching concurrente, modos cruzados, autorización y revalidación de preferencias.
- [x] UUID idempotente para mensajes/acciones y conflictos de revisión.
- [x] Historial aditivo, proyección de fotos y compatibilidad de clientes antiguos.
- [x] Modelos, repositorios delegados, Koin, caché cifrada y aislamiento cuenta/entorno.
- [x] Migración Demo Room 5 a 6 conservadora, persistencia y reinicio explícito.
- [x] Polling secuencial, borradores/acciones restaurables y efectos sin replay.
- [x] Selector, cristal compartido, chat, misiones, ayuda y traducciones.
- [x] Corregir bloqueo gris del permiso de notificaciones en Demo y relanzamiento.
- [x] Build y 504 unitarios Android; 126 backend y 6 PostgreSQL; OpenAPI 63 operaciones.
- [x] 12 pruebas instrumentadas API 35 de swipe, fotos, vista ampliada, Holo y heartbeat.
- [x] Recorrido visual API 30: mosaico y descubrimiento sin bloqueo.
- [x] Recorrido HTTP autenticado de dos cuentas sobre PostgreSQL desechable.
- [x] Lint global del backend tras incorporar la base main actualizada.
- [x] Rediseño v2: Migración 015 (regla de 4 puntos 0..4, misiones personalizadas y respuestas desacopladas).
- [x] Rediseño v2: Motor de estados bilateral con gestión estricta de turnos (1 sola pregunta activa, error 400 TURN_BUSY).
- [x] Rediseño v2: Preguntas con respuesta obligatoria del proponente (máx 300 caracteres) y personalizadas (máx 120 caracteres).
- [x] Rediseño v2: Histórico completedQuestions y desocupación de turno activo al completar bilateralmente.
- [x] Rediseño v2: Bloqueo de envío de mensajes ordinarios (403 CAPSULE_CHAT_LOCKED) mientras la cápsula no esté revelada.
- [x] Rediseño v2: Pruebas unitarias de máquina de estados y controlador de chat.
- [ ] Cerrar lint Android: error previo CredManMissingDal.
- [ ] Recorrido Android remoto completo con dos cuentas y backend desplegado.
- [ ] Confirmación háptica en teléfono físico, TalkBack y prueba completa de texto ampliado.
- [ ] Comparativa controlada de fluidez/memoria Normal frente a Cápsula.
- [ ] Despliegue backend, migración/seed productivos y activación de bandera; publicar Android después.

No se marca verificada una fase por revisión estática. [Evidencia y límites](evidence.md), [spec](spec.md), [plan](plan.md).
