# Prompts Inicializadores y de Flujo SDMD (MiraiLink Backend)

Este documento recopila las directrices y plantillas de prompts para iniciar y ejecutar el ciclo de vida SDMD (Spec-Driven Mobile Development) en MiraiLink Backend, tanto para desarrolladores como para asistentes de IA.

- - -

## 1. Traductor Automático de Intención (Prompt Interceptor)

Cuando el usuario formule peticiones informales de nueva funcionalidad como:
- *"Quiero hacer ahora esta característica: ..."*
- *"Quiero resolver esto: ..."*
- *"Quiero implementar el endpoint de ..."*
- *"Añade la lógica para ..."*

Cualquier asistente de IA configurado en el proyecto debe interceptar dicha petición y traducirla internamente al **Prompt Inicializador SDMD (Fase Spec)**, bloqueando de forma tajante cualquier generación de código de producción hasta contar con una especificación aprobada.

- - -

## 2. Prompt Inicializador SDMD (Fase Spec)

```text
Actúa como un arquitecto de software backend y de integración móvil senior siguiendo la metodología SDMD.
Quiero implementar la funcionalidad: [DESCRIPCION_DE_LA_FUNCIONALIDAD].

Instrucciones estrictas:
1. Revisa AGENTS.md, docs/generic_rules.md y docs/mobile_guidelines.md.
2. Inspecciona el código existente del proyecto en src/ y el contrato docs/openapi.yaml para entender la arquitectura actual (Express 5, Zod, PostgreSQL, JWT/2FA, DTOs).
3. Copia docs/spec_template.md en docs/features/<nombre_feature>/spec.md y rellena un primer borrador con los hechos comprobables en el código.
4. No asumas decisiones no especificadas: marca cualquier duda con la etiqueta [PENDIENTE].
5. Hazme un máximo de 3 a 5 preguntas concretas por turno para resolver las decisiones pendientes, prestando especial atención a:
   - Contrato de API: método HTTP, ruta, cabeceras requeridas y formato de payload.
   - Restricciones móviles: tamaño de payload (< 100 KiB), paginación, resiliencia y reintentos.
   - Seguridad: requerimientos de autenticación Bearer JWT, autorización o 2FA.
   - Manejo de errores: códigos de error de dominio para que la app móvil los mapee en strings.xml.
   - Notificaciones push o efectos secundarios asíncronos con Firebase Cloud Messaging.
6. ESTÁ ESTRICTAMENTE PROHIBIDO generar código de producción o planes técnicos en esta fase.
```

- - -

## 3. Prompt para el Plan Técnico de Arquitectura (Fase Plan)

```text
La especificación en docs/features/<nombre_feature>/spec.md ha sido [APROBADO].
Ahora genera el plan técnico en docs/features/<nombre_feature>/plan.md copiando docs/plan_template.md.

Instrucciones estrictas:
1. Inspecciona package.json para verificar las librerías y versiones reales del proyecto (Node 22, Express 5, Zod 4, PostgreSQL, Vitest). No inventes dependencias externas.
2. Define las rutas y middlewares en src/routes/, esquemas de validación Zod en src/validation/, controladores y transacciones en src/controllers/, y consultas SQL parametrizadas.
3. Especifica los cambios DDL de base de datos en src/database/migrations/ y las proyecciones en src/dto/.
4. Detalla los cambios requeridos en el contrato OpenAPI (docs/openapi.yaml).
5. Disena la estrategia de testing (pruebas unitarias, integración HTTP con Supertest y tests de esquema).
6. NO generes código de producción todavía. Espera mi aprobación explícita del plan.
```

- - -

## 4. Prompt para el Desglose de Tareas (Fase Tasks)

```text
El plan técnico en docs/features/<nombre_feature>/plan.md ha sido aprobado.
Genera ahora docs/features/<nombre_feature>/tasks.md desglosando el plan en fases secuenciales con checkboxes atómicos.
Incluye la verificación de linter (npm run lint), ejecución de pruebas (npm test) y comprobación de rutas contra OpenAPI (npm run check:routes) en cada fase.
```

- - -

## 5. Prompt para la Implementación Secuencial (Fase Código)

```text
Implementa únicamente la siguiente tarea pendiente en docs/features/<nombre_feature>/tasks.md.
Una vez implementada:
1. Ejecuta el linter y las pruebas asociadas: npm run lint && npm test && npm run check:routes.
2. No avances a la siguiente tarea hasta que la actual pase limpiamente todas las verificaciones.
3. Marca la tarea con [x] en tasks.md cuando este verificada.
```
