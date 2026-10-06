# Operación y configuración del sistema

[Guía maestra](../guia-maestra.md) | [Cobertura](cobertura.md)

Revisión de fuentes: 2026-10-01. Las observaciones estáticas no certifican el servidor desplegado ni el comportamiento en dispositivo.


## Ciclo del proceso

[server.js](../../src/server.js) valida entorno y aplica migraciones antes de escuchar, salvo test. Luego configura listener, timeouts y sync de catálogo. /healthz solo retorna ok del proceso; no consulta PostgreSQL, SMTP o FCM. shutdown cierra HTTP pero no termina explícitamente el pool.

## Cambios controlados

Antes de actualizar, revisar backup recuperable, versión de baseline/migraciones, nuevos lectores de configuración y compatibilidad de clientes. Aplicar migraciones solo con un entorno autorizado y backup probado. El migrador automático del arranque también puede escribir y bloquear: desplegar código implica ese efecto si se reinicia server.

La secuencia del catálogo/geografía requiere revisar migraciones antes del seed. db:seed importa geografía y actualiza datos; no equivale a un dry run. db:reset recrea la base y db:reset-interactions borra interacciones: no utilizarlos en producción ni como validación de documentación.

## Despliegue y recuperación

El [documento de VPS](../future-vps-deployment.md) describe una propuesta, no evidencia de un despliegue real. Un reverse proxy debe coordinar TLS, trust proxy, PUBLIC_ORIGIN, límites de upload y timeouts. Cambiar origen afecta clientes e imágenes; cambiar JWT_SECRET invalida tokens y cambiar SECRET_2FA_KEY rompe secretos si no se migra cifrado.

Con varias instancias, sincronización del catálogo se programa en cada proceso, rate limit/cache no se comparten y fotos locales requieren almacenamiento coordinado. No atribuir alta disponibilidad por usar PM2 o Nginx sin resolver esos puntos.

Backup debe contemplar PostgreSQL y almacenamiento de fotos por separado, con relación URL/archivo preservada. No se ha inspeccionado el almacenamiento multimedia ni se han probado backups/restauración en esta entrega.

Scripts y consumidores: [referencia](referencia-codigo.md). Errores/proveedores: [integraciones](integraciones.md).
