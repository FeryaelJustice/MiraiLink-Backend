# Verificación del modelo de plan único

El usuario corrigió el alcance: una fila por usuario en user_subscriptions. Se retiraron la tabla de compras, la vista, el servicio de proyección y la respuesta verifiedPurchase. La migración 021 anterior no se había aplicado en la base del proyecto y se sustituyó por 021_subscription_confirmation.sql, que solo amplía user_subscriptions.

Pruebas reales realizadas en PostgreSQL 17 temporal: 5 escenarios nuevos (plan único, sustitución Google y token antiguo, vencimiento a Free, recuperación de confirmación pendiente, intención sin alterar renovación y propiedad de token) y 6 pruebas existentes de Afinidades con todas las migraciones. Las pruebas de servicio y HTTP conservan respuestas vacías, errores normalizados y RTDN firmado simulado.

Suite completa tras la corrección: 175 pruebas pasan, 3 fallan y 7 quedan omitidas. Los 3 fallos son los mismos previamente contrastados con HEAD: uno en capsule-matching.test.js y dos en reset-interactions.test.js. No se declara la suite completa aprobada. Lint y contrato OpenAPI de 77 operaciones pasan.

La base configurada del proyecto no se modificó. Queda aplicar la nueva migración 021 antes de arrancar el backend y validar compra Google real, RTDN real y worker en el despliegue. Si un tercero aplicó la migración anterior por su cuenta, requiere revisión de ese entorno antes de ejecutar migraciones; no se borran tablas desplegadas automáticamente.

Comprobación adicional con exclusión explícita de esos dos archivos: 173 pruebas aprobadas, 7 omitidas y umbrales de cobertura superados (statements 68.49%, branches 63.24%, functions 71.42%, lines 71.54%). La configuración de Vitest no se cambió para ocultar los fallos. La instancia temporal se detuvo al terminar.

Corrección de reejecución: migración 021 usa IF NOT EXISTS en columnas e índices. Reproducida cancellation_intent_at preexistente y aplicada la migración dos veces conservando datos, en PostgreSQL temporal. Las 6 pruebas de compras pasan. No se ejecutó contra la base del proyecto.
