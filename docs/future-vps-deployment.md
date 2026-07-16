# Futuro despliegue en VPS Debian

Este documento conserva contexto de una fase futura. El workflow actual solo realiza CI y no contiene permisos, secretos ni pasos de despliegue.

## Topología prevista

- VPS Linux Debian estable, posiblemente administrado desde Hostinger.
- Usuario de servicio dedicado `mirailink`, sin acceso root interactivo y sin compartir usuario con nginx o PostgreSQL.
- Node.js 22 LTS y PM2 ejecutando `src/server.js` desde un release inmutable.
- nginx como proxy inverso, terminación TLS, límites de body y cabeceras de seguridad.
- PostgreSQL accesible solo por red privada o socket local.
- Uploads persistentes fuera del checkout mediante `UPLOAD_ROOT`, con propietario y permisos mínimos.

## Preparación del servidor

1. Aplicar actualizaciones de seguridad, configurar zona horaria solo para presentación y mantener la aplicación en UTC.
2. Configurar SSH por clave, desactivar contraseña y login root, habilitar firewall para SSH, HTTP y HTTPS.
3. Crear usuario y grupo de servicio. El código debe ser de solo lectura para el proceso salvo directorios explícitos de logs y uploads.
4. Instalar nginx, Node.js 22 y PM2. Guardar la configuración PM2 en un archivo versionado cuando se implemente CD.
5. Provisionar certificados TLS con renovación automática y probar el reinicio de nginx.

## Secretos y datos

- Inyectar secretos con un almacén del proveedor o archivo root-owned fuera del repositorio. Nunca copiarlos al workflow o a PM2 ecosystem versionado.
- Rotar JWT, SMTP, Firebase y clave 2FA con un procedimiento que contemple compatibilidad y revocación.
- Ejecutar migraciones antes de cambiar tráfico y respaldar PostgreSQL. Probar restauraciones, no solo creación de backups.
- Respaldar uploads por separado, cifrados y con política de retención.

## Futuro job de CD

El CD debe depender del job `checks`, usar un environment protegido de GitHub y requerir aprobación. Entregará un artefacto identificado por commit, verificará checksum, instalará con `npm ci --omit=dev`, ejecutará migraciones con bloqueo, cambiará un symlink de release y hará `pm2 reload` con espera. Después comprobará `/healthz`. Si falla, restaurará symlink, proceso y migración compatible.

No debe abrir SSH con contraseña, ejecutar como root, transferir `.env`, compilar directamente en la carpeta activa ni mezclar despliegue con el workflow de PR.

## Checklist antes de habilitar CD

- Dominio, VPS, usuario, rutas persistentes y estrategia de red confirmados.
- Health check ampliado con dependencia de base de datos y observabilidad.
- Logs estructurados, rotación, métricas y alertas operativas.
- Runbook de rollback y restauración ensayado.
- Backups verificados y objetivos RPO y RTO acordados.
- PM2, nginx, systemd, permisos y límites de recursos revisados.
