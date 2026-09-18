# CLAUDE.md

@AGENTS.md

## Directrices para Asistentes y Claude Code

Este repositorio utiliza el estandar metodologico **SDMD (Spec-Driven Mobile Development)** adaptado al backend de MiraiLink (Spec-Driven Development con integracion estrecha al cliente movil Android).

### Principios Fundamentales

- **Arnes Documental Obligatorio**: Nunca generes codigo de produccion directamente a partir de una peticion informal de nueva funcionalidad.
- **Traduccion Automatica**: Sigue el protocolo de prompts definido en `docs/PROMPTS.md` y `docs/SDMD.md`.
- **Auditoria Previa**: Consulta siempre `AGENTS.md`, `docs/generic_rules.md` y `docs/mobile_guidelines.md` antes de proponer cambios.
- **Flujo de Especificaciones**:
  1. Especificacion funcional en `docs/features/<feature>/spec.md` (a partir de `docs/spec_template.md`).
  2. Plan tecnico en `docs/features/<feature>/plan.md` (a partir de `docs/plan_template.md`).
  3. Checklist de tareas en `docs/features/<feature>/tasks.md`.
- **Verificacion de Calidad**:
  - Pruebas automatizadas: `npm test`
  - Linter: `npm run lint`
  - Contrato OpenAPI: `npm run check:routes`
  - Suite integral: `npm run check`
- **Estilo**: Nunca uses em dashes (--) ni en dashes (-). Usa siempre un guion plano (-).
