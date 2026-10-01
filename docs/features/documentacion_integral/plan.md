# [APROBADO] Plan técnico de documentación integral backend

- Fecha: 2026-10-01.
- Estado: APROBADO por el usuario el 2026-10-01.
- Especificación: [spec.md](spec.md), aprobada.
- Rama: `codex/documentacion-integral`.
- Ámbito: documentos, fuentes propias y configuración versionada del backend.

## 1. Hechos verificados

Las siguientes son declaraciones de `package.json`, no versiones resueltas de paquetes ni certificación de compatibilidad del entorno.

| Área | Declaración |
| --- | --- |
| Runtime | Node >=22, módulos ES, versión del proyecto 2.0.0 |
| HTTP | Express ^5.2.1, Helmet ^8.3.0, CORS ^2.8.6, express-rate-limit ^8.7.0 |
| Datos y validación | pg ^8.23.0, Zod ^4.6.5 |
| Seguridad | bcrypt ^6.0.0, jsonwebtoken ^9.0.3, speakeasy ^2.0.0 |
| Integraciones | firebase-admin ^14.4.0, nodemailer ^10.0.10, multer ^2.4.0 |
| Pruebas | Vitest/coverage-v8 ^5.0.1, Supertest ^7.3.0, ESLint ^10.11.0 |
| Configuración | Validación central en `src/config/env.js`; pool en `src/models/db.js` |

Contrastar las versiones resueltas en el lockfile al completar el inventario. No inferir la versión del servidor PostgreSQL desde una plantilla. El backend usa SQL directo, y el esquema versionado incluye baseline y migraciones posteriores.

## 2. Diseño documental

Mantener `README.md` como entrada del proyecto y añadir enlace a `docs/guia-maestra.md`. No crear otro README dentro de `docs/`, conforme a AGENTS.md.

Actualizar los documentos existentes en `docs/` cuando ya sean la referencia correcta. La guía maestra ofrecerá recorridos de lectura, un índice por dominio/tecnología y enlaces al cliente para responsabilidades ajenas al backend.

| Destino | Contenido |
| --- | --- |
| `docs/guia-maestra.md` | Mapa del sistema, rutas de estudio, documentos y diagramas |
| `docs/architecture.md` | Arranque, pipeline HTTP, componentes, autorización, transacciones y límites reales |
| `docs/codebase-map.md`, `docs/code-reference.md` | Inventario de fuentes propias, contratos, parámetros, efectos y consumidores |
| `docs/api-reference.md`, `docs/openapi.yaml` | Rutas y contratos contrastados con routers; corregir documentación si diverge, preservando el runtime |
| `docs/database.md` | Esquema final derivado de baseline y migraciones, relaciones, índices, restricciones y borrados |
| `docs/runtime-and-configuration.md` | Opciones y variables: lector, validación, propósito, obligatoriedad, defaults y ausencia/invalidez |
| `docs/security-review.md` | Contraseñas, verificación, JWT, 2FA, revocación, recuperación, cifrado, privacidad y controles |
| `docs/testing-strategy.md` | Pruebas existentes, comandos, evidencia nueva y límites |
| `docs/estudio/tecnologias.md` | Uso concreto de cada dependencia y archivos consumidores |
| `docs/estudio/flujos/` | Documentos individuales por dominio con casos normales, errores y recuperación |
| `docs/estudio/operacion.md` | Migraciones, seeds, despliegue, backups, cierre, proveedores y fallos operativos |
| `docs/estudio/cobertura.md` | Matriz dominio/tecnología -> fuente -> documento -> diagrama -> evidencia -> límites |
| `docs/estudio/hallazgos.md` | Defectos funcionales y contradicciones documentales; separar observación de hipótesis |

Cada explicación tendrá fuentes verificables, fecha de revisión y límites de evidencia. Las referencias al cliente se basarán en rutas remotas y señalarán publicación pendiente cuando corresponda. No prometer acceso a una rama que solo existe localmente.

## 3. Inventario y contratos

- Revisar `src/server.js`, `src/app.js`, rutas, controllers, middleware, services, utils, validation, DTO, config, models, database, scripts y pruebas relevantes.
- Excluir por completo el contenido de `src/assets`: no leerlo, listarlo, inventariarlo ni modificarlo.
- Trazar operaciones desde ruta y validación hasta autorización, SQL/transacción, DTO y respuesta; documentar parámetros, reglas, límites y errores reales.
- Documentar cada dominio presente: autenticación, 2FA, versiones, perfil, fotos, catálogos, geografía, preferencias, descubrimiento, categorías, likes, matches, chats, moderación, feedback y otros detectados.
- Documentar las integraciones realmente presentes, sin deducir un servidor Socket.IO solo porque el cliente tenga esa dependencia.
- Revisar configuración tanto en el esquema central como en consumidores de `process.env`, scripts y arranque; distinguir validación de inicio de fallos posteriores del proveedor.
- Documentar contratos públicos para consumidores externos. El backend no explica Compose, ViewModels, Koin ni persistencia Android.

No cambiar rutas, middleware, validación de requests, consultas, transacciones, esquema, dependencias ni comportamiento. Los fallos funcionales encontrados quedan registrados para otro alcance.

## 4. Esquema y diagramas

Ubicación: `docs/diagramas/`, con un índice `indice.md` enlazado desde la guía maestra y cada documento relacionado.

El ER representará el resultado de aplicar las migraciones al baseline, mediante inspección estática de los archivos versionados. Identificar claves, cardinalidades, restricciones, referencias y políticas de borrado. Diferenciar relaciones lógicas de claves foráneas declaradas. No ejecutar migraciones ni consultar datos de producción para dibujarlo.

Generar una vista general y vistas por dominio para que el modelo completo sea legible. Añadir diagramas de contexto, componentes, paquetes, modelos/DTO, despliegue, secuencia, actividad, estados y casos de uso según el comportamiento real.

Usar Mermaid dentro de Markdown. Emplear archivos `.puml` cuando PlantUML sea necesario para tipos UML no expresables adecuadamente en Mermaid; acompañarlos de explicación de lectura y representación disponible. No instalar herramientas nuevas sin necesidad ni enviar fuentes privadas a renderizadores externos.

Cubrir en los diagramas relevantes: registro/verificación, login/2FA, recuperación, revocación, autorización de recursos, actualización de perfil/fotos, descubrimiento/match y envío/lectura de mensajes, con alternativas implementadas y errores. Indicar fuente, tipo, alcance y qué representa cada archivo.

## 5. Comentarios en código

Añadir o mejorar JSDoc y comentarios explicativos en español en fuentes propias y scripts. Explicar contratos, invariantes, transacciones, liberación de recursos, orden de efectos, decisiones de seguridad, algoritmos y variables no evidentes.

Traducir comentarios anteriores en inglés conservando identificadores y términos técnicos. Mantener directivas de herramientas y evitar comentarios que repitan literalmente una operación sencilla. Enlazar documentos para explicaciones largas.

En SQL, traducir o añadir comentarios léxicos cuando proceda; no modificar sentencias `COMMENT ON`, que alteran metadatos de base de datos, ni el contenido ejecutable de migraciones. Revisar el diff para confirmar que no hay cambios de runtime.

## 6. Secuencia posterior a aprobación

1. Generar `tasks.md` con fases y cobertura por dominio/tecnología.
2. Completar inventario de código, contratos, configuración y esquema.
3. Redactar la guía maestra y sincronizar documentación existente.
4. Completar recorridos individuales, operación y casuística.
5. Crear y contrastar ER y diagramas UML con código versionado.
6. Revisar y traducir comentarios por grupos de archivos sin alterar comportamiento.
7. Revisar enlaces, matriz de cobertura, contratos, diff y verificaciones; registrar resultados y límites.

## 7. Verificación

- Revisar cobertura completa de dominios, tecnologías, configuración y fuentes propias con exclusiones explícitas.
- Comprobar enlaces locales y anclas; revisar referencias cruzadas y publicación pendiente.
- Contrastar cada relación del ER con baseline/migraciones y cada flujo UML con handlers y servicios reales.
- Revisar sintaxis de diagramas mediante herramientas disponibles; registrar si no se pudo renderizar.
- Revisar diff y ejecutar `git diff --check`.
- Tras cambios de comentarios en fuentes: `npm run build`, `npm run lint`, `npm run test:coverage`, `npm run check:routes`. Revisar antes la configuración de pruebas para evitar servicios o datos reales.
- Las pruebas PostgreSQL solo se ejecutarán contra una base desechable cuya identidad y autorización se hayan confirmado. No ejecutar resets, seeds, migraciones ni sincronizaciones externas como parte de esta documentación.
- No añadir tests que solo comprueben comentarios. Registrar resultados, fecha y límites sin convertir una inspección en certificación de producción.

## 8. Riesgos y mitigaciones

- ER incompleto por migraciones posteriores: reconstruir esquema y revisar restricciones e índices además del baseline.
- Divergencia OpenAPI/runtime: validar routers y documentar diferencias; corregir el contrato documental sin cambiar handlers.
- Exposición de secretos: obtener semántica desde lectores versionados, sin leer `.env` ni credenciales.
- Regresión por comentarios: preservar directivas y SQL ejecutable; revisar diff y checks pertinentes.
- Operaciones destructivas involuntarias: excluir comandos de mantenimiento y bases no desechables de la ejecución.
- Duplicación con Android: cada detalle tiene un repositorio propietario y una referencia cruzada.

## 9. Aprobación y ampliación de mantenimiento

Plan aprobado explícitamente el 2026-10-01. El usuario añade un disclaimer obligatorio en el maestro y un protocolo de mantenimiento conectado entre frontends/apps y backend para temas cruzados.
