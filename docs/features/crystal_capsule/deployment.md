# Despliegue y reversión

Esta guía no acredita que producción esté desplegada. Mantener `CRYSTAL_CAPSULE_ENABLED=false` hasta cerrar validación integrada.

1. Respaldar PostgreSQL y el directorio de imágenes `UPLOAD_ROOT` por separado. Mantener dominio/base URL existente.
2. Desplegar backend compatible con clientes anteriores, con bandera desactivada.
3. Ejecutar `npm run db:migrate` y `npm run db:seed:capsules` contra el entorno objetivo. El sembrado es específico e idempotente. No ejecutar `db:reset`.
4. Confirmar `GET /api/capsules/config`, lectura de chats antiguos, proyecciones antiguas y compatibles, cuotas y filtros.
5. Instalar Android compatible en dos cuentas de prueba. Comprobar cápsula completa, cambios de modo, timeout/reintento, pausa, salida, reanudación y revelación.
6. Activar `CRYSTAL_CAPSULE_ENABLED=true` y reiniciar backend según su plataforma. Distribuir Android después de validación.
7. Para frenar activación, volver bandera a false. No borrar tablas ni reiniciar conversaciones. Cápsulas existentes conservan consulta y acciones de salida/revelación; nuevas preguntas y nuevas entradas quedan deshabilitadas.

SDK/servicios existentes y configuración de URLs permanecen. No se introducen servicios de pago nuevos, aunque persistencia y operaciones usan el backend existente.

[Evidencia](evidence.md) - [Plan](plan.md).
