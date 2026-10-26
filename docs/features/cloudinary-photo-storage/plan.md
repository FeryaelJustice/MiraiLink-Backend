# [APROBADO] Plan tecnico: Cloudinary y migracion reversible a disco

- Fecha: 2026-10-26
- Estado: APROBADO por el usuario el 2026-10-26
- Especificacion: [spec.md](spec.md), aprobada por el usuario
- Rama: codex/cloudinary-photo-storage

## 1. Hechos y dependencias verificadas

package.json usa ESM, Node >=22, Express ^5.2.1, pg ^8.23.1, multer ^2.4.0, Zod ^4.6.5, Vitest ^5.0.3 y ESLint ^10.0.1. La ultima migracion local es 021_subscription_confirmation.sql.

La consulta npm view cloudinary version deprecated --json devolvio 2.11.0 sin marca deprecated. Instalar el SDK oficial cloudinary, fijando la resolucion en package-lock.json y revalidando la version en el momento de instalar. No actualizar dependencias ajenas ni ejecutar npm audit fix indiscriminadamente.

Context7 no esta disponible. Referencias primarias consultadas:

- https://cloudinary.com/documentation/node_integration
- https://cloudinary.com/documentation/node_image_and_video_upload
- https://cloudinary.com/documentation/image_upload_api_reference
- https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials
- https://cloudinary.com/documentation/dam_admin_permissions

## 2. Configuracion y almacenamiento

- PHOTO_STORAGE_PROVIDER=cloudinary sera el modo principal por defecto. Los entornos de pruebas declararan local explicitamente donde corresponda.
- Credenciales independientes: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET; carpeta configurable CLOUDINARY_FOLDER=mirailink/profiles.
- PHOTO_STORAGE_PROVIDER=local activara el comportamiento local conservado y UPLOAD_ROOT indicara el directorio persistente externo. No comentar ni eliminar el codigo local.
- Configuracion central valida proveedor y presencia de las credenciales cuando corresponda. No leer ni imprimir secretos para diagnosticos.
- Cliente Cloudinary propio del modulo, usando la interfaz v2 del SDK; subida autenticada con upload_stream desde buffer validado, resource_type=image, type=upload, identificador UUID no predecible, overwrite=false, sin transformaciones destructivas.
- Persistir secure_url, asset_id, public_id, tipo de recurso, tipo de entrega, formato y proveedor. No deducir public_id de la URL para borrar.
- Mantener byte original cuando sea posible para una exportacion verificable. No convertir ni comprimir silenciosamente fotos ya existentes.
- Timeout acotado y errores sanitizados de almacenamiento, con respuesta recuperable y sin fallback automatico a disco.

## 3. Persistencia compatible con Neon

Crear migracion aditiva 022_photo_storage.sql, sin reset ni modificacion del baseline desplegado:

- Tabla photo_storage_objects, indexada por URL, con proveedor y metadatos remotos, propietario cuando proceda, integridad y estado de limpieza. Independiente de IDs de user_photos para tolerar el flujo actual de reordenacion que reinserta filas.
- No agregar automaticamente filas remotas para referencias locales heredadas; su ausencia indica almacenamiento local heredado.
- Registro duradero de recursos pendientes de eliminar, con reintentos y diagnostico sanitizado; reintentar mediante comando operativo, sin prometer un worker permanente en Render Free.
- Conservar user_photos.url y el contrato JSON actual. Consultas publicas mantienen sus proyecciones explicitas y no exponen metadatos internos.
- Guardar el registro remoto antes de que una fila empiece a apuntar a su URL, con compensacion si falla la escritura. Revalidar referencias antes de eliminar recursos compartidos o heredados.

El disenador de migracion comprobara claves, restricciones y transacciones reales antes de fijar el SQL definitivo. El objetivo es conservar usuarios, posiciones, IDs y catalogos existentes.

## 4. Integracion en todos los flujos de fotos

- photoStorage.js sera la fachada comun para staging/subida, confirmacion y limpieza. Mantener adaptador local con confinamiento de rutas y adaptador Cloudinary con metadatos propios.
- Cubrir photo.controller.js y todas las operaciones de user.controller.js que suben, sustituyen, reordenan o borran fotos.
- Mantener validacion binaria, limite vigente, propiedad del recurso y maximo de fotos existente.
- Separar fallo anterior al COMMIT de limpieza posterior: una limpieza fallida no debe disparar la compensacion de la foto nueva ya confirmada.
- Persistir trabajos de limpieza con la mutacion SQL cuando se sustituyan o eliminen referencias. El borrado remoto sera posterior y repetible, comprobando que ninguna fila siga usando el objeto.
- Si falla una subida, conservar las referencias anteriores. Una solicitud reintentada puede volver a subir si no existe contrato de idempotencia previo; no prometer exactly-once. Proteger contra sobreescrituras con IDs unicos.
- Resolver imagen por el proveedor del recurso, no por el proveedor activo para nuevas subidas. Permitir convivencia local/remoto durante transicion.
- No cambiar rutas ni respuestas Android. Documentar url como ruta relativa heredada o URL HTTPS absoluta. Revisar las consultas de perfil, descubrimiento, afinidades y fotos sin tocar el otro repositorio.
- Los avatares por defecto tambien requieren una decision operativa de alojamiento cuando son referenciados sin fila en user_photos: documentar y proporcionar configuracion para referencia remota del avatar de reserva, conservando la referencia local para VPS.

## 5. Herramientas de migracion en ambos sentidos

Proporcionar un comando de migracion con modos de simulacion, preparacion, aplicacion y rollback; la ayuda y la guia incluiran los comandos exactos implementados. Todo manifiesto incluira version, identificadores de filas, referencia anterior/nueva, proveedor, tamano y SHA-256, sin credenciales.

### Local a Cloudinary, incluidas fotos antiguas

1. Revisar referencias SQL, agrupando recursos compartidos. No inventariar src/assets.
2. El operador aporta una copia externa en un directorio indicado explicitamente. Rechazar rutas que resuelvan dentro de src/assets, traversal y enlaces que escapen del origen autorizado.
3. Simular con listado de cantidades y errores. Informar archivos ausentes, formatos invalidos y URLs externas no reconocidas; no descargarlas arbitrariamente.
4. Subir recursos validos, verificar respuesta y descarga/integridad, generar manifiesto y metadatos. Reanudar sin duplicar objetos ya preparados.
5. Aplicar actualizaciones transaccionales condicionadas a la referencia antigua; si alguna fila cambio, rechazar y conservar la base anterior. No borrar originales locales.
6. Permitir ejecucion sin fotos: resumen de cero cambios, sin error por no tener fotos.

### Cloudinary a disco persistente en VPS

1. Usar recursos propios registrados y URLs HTTPS verificadas del cloud configurado. Limitar descargas, redirecciones y bytes; no seguir destinos arbitrarios desde la base o un manifiesto manipulado.
2. Descargar al destino externo autorizado y verificar firma binaria, tamano y SHA-256. No escribir en src/assets.
3. Preparar rutas locales compatibles con el servicio Express, sin sobrescribir otros archivos. El manifiesto permite reanudar y comprobar archivos ya descargados.
4. Solo aplicar las referencias cuando los archivos de todo el lote esten completos y verificados; usar transaccion y comparacion con la referencia anterior para evitar conflictos.
5. Activar PHOTO_STORAGE_PROVIDER=local y UPLOAD_ROOT en el VPS; reiniciar y comprobar nuevas subidas, borrado y referencias antiguas.
6. Conservar originales Cloudinary por defecto y permitir rollback de referencias mientras existan. Limpieza del proveedor original se ejecutara solo como operacion separada tras revisar respaldo y referencias.

## 6. Guia manual y operacion

Crear docs/cloudinary-storage-and-vps-migration.md enlazada desde README y configuracion:

- Crear clave dedicada mirailink-backend-production en el product environment: Standard development, operaciones autenticadas del backend. Entre Master Admin, Media Library User, Reports y Viewer, Master Admin habilita todas las operaciones requeridas; no usar clave de administracion global de cuenta. Documentar su alcance y posibilidad de reducir permisos si la cuenta permite roles y acceso a carpetas suficientes.
- Copiar cloud name, API key y API secret a variables de entorno sin publicarlos. No hacen falta presets unsigned.
- Pasos Render: variables, despliegue, migracion aditiva y comprobacion. Recordar que esto no resuelve SMTP bloqueado ni suspension del plan gratuito.
- Importacion de todas las fotos antiguas mediante copia externa, tratamiento de ausentes, sin resubir automaticamente todo al arrancar.
- Neon a VPS: pausar escrituras, dump directo de Neon, restauracion en PostgreSQL compatible, migraciones, descarga de archivos, cambio transaccional de referencias, variables, comprobacion y reanudacion de trafico.
- Exportar la base despues de cortar escrituras o realizar la conversion en la base restaurada del VPS; no convertir rutas de produccion antes de tener el almacenamiento local sirviendo.
- Mantener URL base/dominio del backend cuando sea posible para evitar cambios Android. Mostrar formatos de carpetas y comandos exactos de cada paso.
- No ejecutar db:reset ni db:seed para migrar una base con usuarios. Copia SQL y copia de archivos son respaldos distintos.
- Pruebas de rollback, tratamiento de caches y CDN, cuotas, copias externas y uso de limpieza pendiente.

Actualizar docs/runtime-and-configuration.md, docs/database.md, docs/code-reference.md, docs/architecture.md, docs/api-reference.md y docs/openapi.yaml donde cambie el contrato, ademas de .env.example.

## 7. Verificacion y entrega

- Unitarias de adaptadores con SDK simulado y filesystem temporal, rechazo de configuracion incompleta, fallos y compensaciones.
- Pruebas de ambos controladores, reordenacion, recursos compartidos, error post-COMMIT y metadatos internos no expuestos.
- Pruebas de migracion: cero fotos, referencias heredadas, archivos ausentes, integridad, reanudacion, conflicto concurrente, rollback y bloqueo de rutas/URLs no autorizadas.
- PostgreSQL desechable: migracion aditiva y aplicacion de referencias si hay runtime disponible. No utilizar la base Neon real para tests.
- Lint, cobertura y contrato API; comparar fallos con baseline y reportar separadamente los ya observados en capsulas y scripts de reset.
- Prueba real con una imagen de prueba temporal: subir, descargar y borrar de una carpeta de pruebas si hay credenciales disponibles y alcance confirmado. No afirmar validacion real con mocks.
- Mantener clara la diferencia entre herramientas listas y migracion de la cuenta real ejecutada.

Plan aprobado e implementado. Ver [tasks.md](tasks.md) y [verification.md](verification.md) para pruebas ejecutadas y operaciones reales pendientes.
