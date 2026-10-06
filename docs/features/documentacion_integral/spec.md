# [APROBADO] Documentación integral de MiraiLink Backend

- Fecha: 2026-10-01.
- Estado: APROBADO por el usuario el 2026-10-01.
- Repositorios: MiraiLink (Android) y MiraiLink-Backend (servidor).
- Rama de ambos: `codex/documentacion-integral`.
- Fuentes iniciales: Android `8f2d6c8`; backend `1c1f6e0`.
- Esta especificación recoge el resultado solicitado. No es la guía terminada ni un plan técnico aprobado.

## 1. Objetivo

Permitir estudiar el sistema completo en español desde un documento maestro por repositorio. Cada afirmación sobre comportamiento debe poder contrastarse con código, configuración versionada o evidencia de ejecución. Cada proyecto documenta sus propias responsabilidades y enlaza al otro cuando la explicación pertenece allí.

La documentación debe responder qué hace cada elemento, para qué existe, cómo funciona, dónde se usa, qué tecnologías intervienen y qué ocurre fuera del flujo normal. Los comentarios deben explicar decisiones y lógica no evidente sin repetir mecánicamente el nombre de una función o variable.

## 2. Auditoría inicial contrastada

| Evidencia | Observación | Consecuencia documental |
| --- | --- | --- |
| `app/build.gradle.kts` | min SDK 30, compile/target 37, versión 3.0.0, código 34 | Corregir referencias antiguas a min SDK 26 y versión 2.3.0 |
| `di/koin`, `ChatViewModel.kt` | Uso de Koin; consulta periódica con `delay(3000L)` | No describir Hilt ni atribuir al chat visible una integración Socket.IO sin comprobarla |
| `data/local/demo/MiraiLinkDemoDatabase.kt`, `data/demo/DemoModeManager.kt` | Room para demo; sesión demo distinguida mediante token local | Separar demo de caché remota y de sincronización offline de cuentas reales |
| `data/datastore/serializer/EncryptedJsonSerializer.kt` | Serializador local cifrado | Describir su contrato, corrupción y recuperación tras inspección completa |
| Backend `src/controllers/auth.controller.js` | Hash y comparación de contraseñas con bcrypt | Android explica entrada/envío y sesión; el detalle del almacenamiento del hash pertenece al backend |
| Backend `src/models/db.js` | Pool PostgreSQL configurado con `DB_URL` | Relaciones, SQL y transacciones pertenecen al servidor |
| Backend `src/config/env.js` | Validación Zod, variables requeridas, opcionales y valores predeterminados | Documentar ausencia e invalidez por separado; revisar consumidores además del esquema |
| `docs/ai/README.md`, backend `README.md` y `docs/` | Hay documentación previa con fechas y afirmaciones antiguas | Integrar y corregir; evitar dos fuentes contradictorias para un mismo tema |

Esta auditoría es inicial y de lectura. No acredita compilación, pruebas, producción ni comportamiento en dispositivo.

## 3. Alcance solicitado

### Documentos maestros y navegación

- Una entrada visible desde el README de cada repositorio para personas que desean estudiar el proyecto.
- Rutas de lectura por arquitectura, tecnología, funcionalidad, seguridad, configuración, operación y pruebas.
- Índice de documentos y diagramas con ubicación, propósito y enlaces válidos.
- Enlaces a archivos fuente relevantes y referencias al repositorio responsable de cada detalle compartido.
- Distinción explícita entre comportamiento implementado, documentación histórica, requisitos deseados y limitaciones.

### Límite con Android

La documentación del cliente se específica y mantiene en el [repositorio Android](https://github.com/FeryaelJustice/MiraiLink/blob/codex/documentacion-integral/docs/features/documentacion_integral/spec.md). Este proyecto documenta contratos que ofrece a sus clientes; no explica Compose, navegación, almacenamiento local ni detalles internos del cliente.

### Backend

- Node, módulos ES, Express, PostgreSQL, SQL parametrizado, Zod, seguridad HTTP y herramientas de prueba.
- Arranque, middleware, rutas, controladores, servicios, DTO, autorización y gestión de errores.
- Inventario de contratos HTTP y otros transportes realmente disponibles; consumidores descritos mediante contrato, sin explicar internals de Android.
- Contraseñas, verificación, recuperación, JWT, revocación, TOTP, códigos de recuperación y cifrado desde la implementación del servidor.
- Esquema base y migraciones: tablas, columnas, claves, relaciones, cardinalidades, restricciones, índices, borrados y transacciones.
- Catálogos, geografía, descubrimiento, matches, chat, fotos, moderación, configuración de versiones y demás dominios existentes.
- SMTP, Firebase, proveedores de catálogo, almacenamiento multimedia y otras integraciones existentes.
- Variables de entorno y opciones operativas: función, consumidores, validación, requisitos, valores predeterminados públicos y consecuencias de ausencia/invalidez.
- Migraciones, seeds, mantenimiento, copias de seguridad, despliegue, cierre y recuperación. Diferenciar instrucciones de operación de comprobaciones efectivamente ejecutadas.

### Diagramas

- Modelo entidad-relación completo del esquema versionado del backend, distribuido por dominios cuando ayude a leerlo. No usar una captura de una base de datos privada.
- Diagramas de contexto, componentes y despliegue con límites de responsabilidad.
- UML de clases o modelos, paquetes, secuencia, actividad, estados y casos de uso donde representen comportamiento real.
- Documentar qué tipo representa cada archivo, su ubicación y cómo visualizarlo. No inventar diagramas de tipos UML que no aportan información al sistema.
- Flujos normales y alternativas: entrada inválida, cuenta no verificada, 2FA, token vencido/revocado, ausencia de datos, pérdida de red, fallo de proveedor y errores de persistencia según soporte real.

### Comentarios en el código

- Revisar fuentes propias Android, backend, configuración y scripts mantenidos por el proyecto.
- Añadir o mejorar KDoc/JSDoc/comentarios en español para contratos, invariantes, algoritmos, efectos secundarios, concurrencia, transacciones, seguridad y variables no evidentes.
- Explicar propósito y consumidores cuando ayude a mantener el código; enlazar documentación extensa en vez de duplicarla.
- Conservar identificadores, nombres de protocolos y términos técnicos que faciliten localizar el código.
- Excluir archivos generados, dependencias, binarios y secretos. En backend está prohibido leer, inventariar o modificar `src/assets`.

## 4. Restricciones y casuística

- No cambiar comportamiento de producto como consecuencia de redactar comentarios.
- Documentar los problemas encontrados y su evidencia. El alcance de posibles correcciones funcionales queda pendiente.
- No ejecutar resets, migraciones, seeds ni operaciones sobre una base de datos real para obtener diagramas.
- No leer ni publicar `.env`, `local.properties`, `keystore.properties`, credenciales Firebase, keystores, tokens o datos personales. Obtener nombres y semántica desde sus lectores y plantillas saneadas.
- No equiparar demo offline con modo offline-first del usuario remoto ni prometer cola o sincronización si no existe.
- Diferenciar inspección estática, prueba automatizada, validación con dispositivo y comprobación del servidor desplegado.
- Los checks deben ser pertinentes al cambio; las pruebas que escriban en sistemas externos requieren revisar primero su alcance.
- Antes de aprobar la especificación no se modifica código de producción ni se genera un plan técnico, conforme a la política SDMD local.

## 5. Criterios de aceptación

1. Dado cualquiera de los dos repositorios, al abrir su README, el lector encuentra la guía maestra y puede navegar hasta cada dominio y tecnología de ese proyecto.
2. Dado un tema compartido como contraseñas, al seguir sus enlaces, se distingue qué sabe y hace el cliente y qué procesa y almacena el backend, sin duplicar responsabilidades.
3. Dada una afirmación técnica, el documento ofrece su fuente y diferencia implementación de objetivo o limitación.
4. Dada una opción de configuración, se puede localizar su consumidor, propósito, requisito, valor predeterminado si existe y consecuencia de ausencia o valor inválido, sin revelar secretos.
5. Dado el esquema versionado, las entidades y relaciones del diagrama coinciden con esquema y migraciones; relaciones lógicas sin clave foránea se identifican como tales.
6. Dado un flujo documentado, se explican estados relevantes, errores, recuperaciones y límites; no se describe un caso como verificado si solo se infirió del código.
7. Dada lógica no evidente, los comentarios explican su intención, restricciones y efectos en español; el diff no altera comportamiento.
8. Dada la entrega, existe una matriz de cobertura por dominio y tecnología, enlaces revisados y un registro de comprobaciones con resultado, fecha y límites.
9. Dado contenido anterior contradictorio, se corrige o marca como histórico y se enlaza la referencia vigente.

## 6. Decisiones aprobadas

- Los defectos funcionales encontrados se documentan; sus correcciones quedan para otro alcance.
- Diagramas Mermaid integrados en Markdown y PlantUML cuando sea necesario para UML que Mermaid no exprese adecuadamente.
- Traducir comentarios explicativos anteriores en código propio revisado, conservar términos técnicos e identificadores y evitar comentarios redundantes.
- Especificación coordinada aprobada con las respuestas afirmativas del usuario a las recomendaciones. El plan técnico requiere su propia aprobación conforme a SDMD.

## 7. Ampliación aprobada: mantenimiento conectado

La guía maestra debe advertir que se actualiza con el código y dar instrucciones para revisar juntos clientes (Android, otras apps o web) y backend en temas cruzados. Los documentos y diagramas permanecen enlazados, con responsabilidad y evidencia por extremo. Aprobado el 2026-10-01.
