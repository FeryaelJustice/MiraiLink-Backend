# CLAUDE.md

@AGENTS.md

## Directrices para Asistentes y Claude Code

Este repositorio utiliza el estándar metodológico **SDMD (Spec-Driven Mobile Development)** adaptado al backend de MiraiLink (Spec-Driven Development con integración estrecha al cliente móvil Android).

### Principios Fundamentales

- **Arnés Documental Obligatorio**: Nunca generes código de producción directamente a partir de una petición informal de nueva funcionalidad.
- **Traducción Automática**: Sigue el protocolo de prompts definido en `docs/PROMPTS.md` y `docs/SDMD.md`.
- **Auditoría Previa**: Consulta siempre `AGENTS.md`, `docs/generic_rules.md` y `docs/mobile_guidelines.md` antes de proponer cambios.
- **Flujo de Especificaciones**:
  1. Especificación funcional en `docs/features/<feature>/spec.md` (a partir de `docs/spec_template.md`).
  2. Plan técnico en `docs/features/<feature>/plan.md` (a partir de `docs/plan_template.md`).
  3. Checklist de tareas en `docs/features/<feature>/tasks.md`.
- **Verificación de Calidad**:
  - Pruebas automatizadas: `npm test`
  - Linter: `npm run lint`
  - Contrato OpenAPI: `npm run check:routes`
  - Suite integral: `npm run check`
- **Estilo**: Nunca uses em dashes (--) ni en dashes (-). Usa siempre un guion plano (-).
