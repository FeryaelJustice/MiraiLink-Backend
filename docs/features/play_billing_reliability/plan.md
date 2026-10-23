# [APROBADO] Plan revisado por instrucción del usuario

1. Retirar la migración 021 anterior, la tabla y la vista nuevas, sin modificar migraciones históricas aplicadas.
2. Crear 021_subscription_confirmation.sql para añadir únicamente campos e índices a user_subscriptions. Mantener unicidad por usuario.
3. Integrar persistencia directamente en play-billing.js; retirar el servicio de proyección y el DTO de compra adicional.
4. Proteger cambios de plan con linkedPurchaseToken y rechazar sobrescrituras independientes de un plan vigente. Invalidar tokens anteriores para evitar restauraciones.
5. Conservar respuestas vacías de acknowledge, confirmación posterior al COMMIT y reintentos persistidos. Mantener todos los permisos leyendo la tabla original.
6. Adaptar pruebas, OpenAPI y documentación; validar con PostgreSQL temporal y reportar los fallos generales previos.
