# Prompts Inicializadores y de Flujo SDMD (MiraiLink Backend)

Este documento recopila las directrices y plantillas de prompts para iniciar y ejecutar el ciclo de vida SDMD (Spec-Driven Mobile Development) en MiraiLink Backend, tanto para desarrolladores como para asistentes de IA.

- - -

## 1. Traductor Automatico de Intencion (Prompt Interceptor)

Cuando el usuario formule peticiones informales de nueva funcionalidad como:
- *"Quiero hacer ahora esta caracteristica: ..."*
- *"Quiero resolver esto: ..."*
- *"Quiero implementar el endpoint de ..."*
- *"Anade la logica para ..."*

Cualquier asistente de IA configurado en el proyecto debe interceptar dicha peticion y traducirla internamente al **Prompt Inicializador SDMD (Fase Spec)**, bloqueando de forma tajante cualquier generacion de codigo de produccion hasta contar con una especificacion aprobada.

- - -

## 2. Prompt Inicializador SDMD (Fase Spec)

```text
Actua como un arquitecto de software backend y de integracion movil senior siguiendo la metodologia SDMD.
Quiero implementar la funcionalidad: [DESCRIPCION_DE_LA_FUNCIONALIDAD].

Instrucciones estrictas:
1. Revisa AGENTS.md, docs/generic_rules.md y docs/mobile_guidelines.md.
2. Inspecciona el codigo existente del proyecto en src/ y el contrato docs/openapi.yaml para entender la arquitectura actual (Express 5, Zod, PostgreSQL, JWT/2FA, DTOs).
3. Copia docs/spec_template.md en docs/features/<nombre_feature>/spec.md y rellena un primer borrador con los hechos comprobables en el codigo.
4. No asumas decisiones no especificadas: marca cualquier duda con la etiqueta [PENDIENTE].
5. Hazme un maximo de 3 a 5 preguntas concretas por turno para resolver las decisiones pendientes, prestando especial atencion a:
   - Contrato de API: metodo HTTP, ruta, cabeceras requeridas y formato de payload.
   - Restricciones moviles: tamano de payload (< 100 KiB), paginacion, resiliencia y reintentos.
   - Seguridad: requerimientos de autenticacion Bearer JWT, autorizacion o 2FA.
   - Manejo de errores: codigos de error de dominio para que la app movil los mapee en strings.xml.
   - Notificaciones push o efectos secundarios asincronos con Firebase Cloud Messaging.
6. ESTA ESTRICTAMENTE PROHIBIDO generar codigo de produccion o planes tecnicos en esta fase.
```

- - -

## 3. Prompt para el Plan Tecnico de Arquitectura (Fase Plan)

```text
La especificacion en docs/features/<nombre_feature>/spec.md ha sido [APROBADO].
Ahora genera el plan tecnico en docs/features/<nombre_feature>/plan.md copiando docs/plan_template.md.

Instrucciones estrictas:
1. Inspecciona package.json para verificar las librerias y versiones reales del proyecto (Node 22, Express 5, Zod 4, PostgreSQL, Vitest). No inventes dependencias externas.
2. Define las rutas y middlewares en src/routes/, esquemas de validacion Zod en src/validation/, controladores y transacciones en src/controllers/, y consultas SQL parametrizadas.
3. Especifica los cambios DDL de base de datos en src/database/migrations/ y las proyecciones en src/dto/.
4. Detalla los cambios requeridos en el contrato OpenAPI (docs/openapi.yaml).
5. Disena la estrategia de testing (pruebas unitarias, integracion HTTP con Supertest y tests de esquema).
6. NO generes codigo de produccion todavia. Espera mi aprobacion explicita del plan.
```

- - -

## 4. Prompt para el Desglose de Tareas (Fase Tasks)

```text
El plan tecnico en docs/features/<nombre_feature>/plan.md ha sido aprobado.
Genera ahora docs/features/<nombre_feature>/tasks.md desglosando el plan en fases secuenciales con checkboxes atomicos.
Incluye la verificacion de linter (npm run lint), ejecucion de pruebas (npm test) y comprobacion de rutas contra OpenAPI (npm run check:routes) en cada fase.
```

- - -

## 5. Prompt para la Implementacion Secuencial (Fase Codigo)

```text
Implementa unicamente la siguiente tarea pendiente en docs/features/<nombre_feature>/tasks.md.
Una vez implementada:
1. Ejecuta el linter y las pruebas asociadas: npm run lint && npm test && npm run check:routes.
2. No avances a la siguiente tarea hasta que la actual pase limpiamente todas las verificaciones.
3. Marca la tarea con [x] en tasks.md cuando este verificada.
```
