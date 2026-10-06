# Afinidades: despliegue y operación

La función permanece desactivada por defecto. El código no configura Play Console, Firebase ni el VPS automáticamente.

1. Antes del despliegue, guardar PostgreSQL con pg_dump y el directorio UPLOAD_ROOT por separado. Ensayar restauración, manteniendo el dominio que utiliza Android.
2. Configurar GOOGLE_PLAY_SERVICE_ACCOUNT_FILE con un fichero externo al repositorio, accesible por el usuario del backend y del worker. Darle permisos Android Publisher en Play Console. Configurar Pub/Sub RTDN con push autenticado a /api/subscription/google-play-notifications y variables GOOGLE_PLAY_RTDN_AUDIENCE y GOOGLE_PLAY_RTDN_EMAIL. El paquete es com.feryaeljustice.mirailink y los productos son mirailink_plus y mirailink_premium.
3. Desplegar primero el backend y ejecutar las migraciones con AFFINITIES_ENABLED=false. No ejecutar db:reset. La migración 015 invalida derechos antiguos no verificados: reconciliar compras reales antes de habilitar funciones de pago. La migración 018 añade rotación de evaluaciones y linaje de tokens.
4. Adaptar rutas y usuario de deploy/systemd, copiar las unidades, ejecutar systemctl daemon-reload y habilitar los tres timers. El entorno externo debe contener DB_URL, configuración Firebase existente, AFFINITIES_ENABLED y configuración Play. Nginx termina TLS y sirve el dominio estable; API y workers usan el mismo PostgreSQL. No hace falta Redis ni un modelo de IA.
5. Validar una compra de prueba, renovación, cancelación, gracia, revocación, restauración y cambio Plus/Premium en una pista interna de Google Play. La verificación y el acknowledgement suceden en el servidor. Los tokens se vinculan a una cuenta con SHA-256 del ID; los tokens antiguos reemplazados no sobrescriben el nuevo plan.
6. Desplegar Android y comprobar Free, Plus, receptor gratuito y origen del chat en dispositivo. Habilitar AFFINITIES_ENABLED=true solo tras estas comprobaciones. Usuarios existentes necesitan siete días de observación efectiva. La última actividad se registra al abrir la aplicación, no se deduce de la ubicación.

Generación: cada hora, hasta 100 propietarios y 500 candidatos activos por propietario. Evaluaciones sin candidatos rotan por last_evaluated_at para no bloquear a otros usuarios. Esta cota limita carga; no pretende explorar exhaustivamente catálogos enormes. Ranking Jaccard de intereses, mínimo dos, con preferencias mutuas y objetivos compatibles. Los participantes en Crystal Capsule se excluyen de Afinidades para conservar su ocultación de identidad.

Pagos: reconciliación horaria de hasta 100 compras no revisadas en una hora; RTDN verificado acelera cambios. No se confía en duración o precio enviados por Android. Una caída de Play no inventa derechos ni extiende vencimientos.

Notificaciones: outbox transaccional, minuto, lotes de 50 con SKIP LOCKED, reintento a cinco minutos y descarte de recursos obsoletos. Solo se envían tipo y ID de recurso; Android traduce el mensaje. FCM puede entregar duplicados y la notificación del dispositivo usa el mismo ID para reemplazarlos. No se promete entrega exactamente una vez.

Supervisión: journalctl -u 'mirailink-affinity@*', systemctl list-timers y recuento de outbox pendiente/antiguo, intentos y errores Play. Los workers devuelven código de error si fallan. Revisar tiempos de ejecución antes de aumentar las cotas. Ejecutar el test de PostgreSQL con AFFINITY_TEST_DB_URL apuntando únicamente a localhost desechable; crea y elimina su propio esquema.

Rollback: desactivar AFFINITIES_ENABLED y detener generate/notify. Mantener billing y backend compatible con los nuevos chats. No retirar tablas ni mensajes: solicitudes aceptadas y conversaciones existentes permanecen. Restaurar una copia solo dentro de un procedimiento probado.
