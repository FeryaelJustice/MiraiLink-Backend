# Fotos en Cloudinary y migracion reversible a un VPS

Esta guia cubre nuevas subidas, fotos antiguas referenciadas en Neon y la vuelta a carpetas persistentes. Se conserva el modo local como codigo activo seleccionable; no hay que descomentar funciones. Las fotos nunca se copian automaticamente al disco de Render si Cloudinary falla.

## 1. Crear la clave de Cloudinary

En el entorno de producto correcto de Cloudinary, abrir Settings > API Keys > Generate New API Key:

| Campo | Valor |
| --- | --- |
| Key name | `mirailink-backend-production` |
| Roles | `Master Admin` entre las opciones Master Admin, Media Library User, Reports y Viewer del dialogo descrito |
| How will you use this key? | `Standard development` |

Es una clave dedicada al backend y al entorno de producto, no una Account Management Key. La usa Node en ejecucion, aunque un asistente haya escrito el codigo. Reports y Viewer no permiten gestionar archivos. Media Library User necesita permisos adicionales sobre carpetas; una clave sin estos permisos no sustituye una clave con acceso de subida y borrado. Si la cuenta permite configurar un rol mas limitado con todas las operaciones necesarias sobre la carpeta de MiraiLink, puede restringirse tras comprobar subida, descarga y borrado.

Guardar Cloud name, API key y API secret en el servidor. No enviar el secreto a Android ni copiarlo a esta documentacion, Git o conversaciones. No se necesita un preset de subida unsigned. Se usan el SDK oficial `cloudinary` 2.11.0 y las APIs v2 de subida autenticada y borrado.

Key name es una etiqueta descriptiva, no el valor de CLOUDINARY_API_KEY. Despues de crear la clave, copiar el campo API Key de la pareja generada y su API Secret; ambos deben pertenecer al mismo Cloud name. Si la API responde 401 unknown api_key, revisar esos tres campos y que la clave este activa. El proceso puede leer correctamente el .env y aun asi tener una pareja de credenciales equivocada.

Fuentes oficiales: [SDK Node](https://cloudinary.com/documentation/node_integration), [credenciales](https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials), [roles](https://cloudinary.com/documentation/dam_admin_permissions) y [Upload API](https://cloudinary.com/documentation/image_upload_api_reference).

## 2. Variables y despliegue en Render

```dotenv
PHOTO_STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
CLOUDINARY_FOLDER=mirailink/profiles
# Opcional: URL HTTPS publica del avatar de reserva que hayas subido.
DEFAULT_AVATAR_URL=
```

Son marcadores, no credenciales reales. El proveedor por defecto es Cloudinary; para desarrollo local sin cuenta, seleccionar explicitamente `PHOTO_STORAGE_PROVIDER=local`. La configuracion Cloudinary incompleta impide el arranque en vez de guardar silenciosamente en disco temporal.

En Render, usar `main` cuando esta rama este integrada, `npm ci` para construir y `node src/server.js` para iniciar. En Environment copiar estas variables y las existentes de PostgreSQL, JWT, Firebase y demas servicios. DB_URL debe seguir siendo la conexion directa de Neon por las migraciones y LISTEN del backend. No cambiarlo por una base vacia ni ejecutar db:reset.

Aplicar una vez `npm run db:migrate` desde un entorno con DB_URL apuntando a Neon. El servidor tambien aplica migraciones pendientes al arrancar. La nueva `022_photo_storage.sql` solo crea tablas de registro y limpieza; no borra ni reescribe usuarios, catalogos ni fotos existentes. No volver a ejecutar db.sql, db_inserts.sql o db:seed en una base ya inicializada.

Las nuevas subidas guardan en user_photos.url una URL publica HTTPS de Cloudinary. El registro photo_storage_objects conserva el cloud, public_id y asset_id para borrado y migracion; no se extrae un identificador fragil de la URL. La interfaz HTTP existente mantiene url, position e identificadores como antes. Se respetan firma binaria, JPEG/PNG/WebP y UPLOAD_MAX_BYTES.

Si falla Cloudinary, se devuelve 503 PHOTO_STORAGE_UNAVAILABLE y se conserva la referencia anterior. No hay transaccion distribuida entre SQL y Cloudinary: los recursos preparados se registran antes de enviarse y se recuperan con la limpieza diferida. La eliminacion posterior al COMMIT no destruye la nueva foto confirmada si falla el proveedor.

## 3. Donde estan las fotos antiguas

Cambiar el proveedor afecta a nuevas subidas. No convierte las referencias antiguas ni recupera archivos que ya se hayan perdido.

El programa consulta user_photos y agrupa referencias compartidas: una imagen de reserva usada por varios usuarios se sube una sola vez y se actualizan todas sus filas. Reconoce rutas relativas con prefijo `assets/img/profiles/` o `img/profiles/`. Las URLs remotas sin registro del proveedor se informan como no migrables automaticamente.

No lee ni recorre src/assets. El operador debe aportar una copia externa de los originales en una carpeta autorizada. Si no hay archivos antiguos, la herramienta informa cero cambios. Si existen referencias sin archivo, se informa un error por entrada en el manifiesto y no se aplica ningun cambio de referencias hasta resolverlo. No elimina filas para ocultar fotos que falten.

## 4. Importar las fotos antiguas a Cloudinary

Ejecutar desde la raiz del repositorio con Node >=22 y npm ci. El .env debe apuntar a la base objetivo y contener Cloudinary. Los comandos de migracion no necesitan que el servidor web este arrancado.

Preparar dos carpetas externas: una para fotos y otra para manifiestos. Ejemplo en Windows:

```powershell
New-Item -ItemType Directory -Force C:\MiraiLinkMedia\profiles
New-Item -ItemType Directory -Force C:\MiraiLinkMedia\manifests
```

Colocar en profiles una copia externa de los originales con esta estructura:

```text
C:\MiraiLinkMedia\profiles\
    Goku.webp
    <user-id>\
        <archivo>.jpg
```

Asi `assets/img/profiles/<user-id>/<archivo>.jpg` encuentra `<user-id>/<archivo>.jpg` dentro de profiles. No pasar la raiz del proyecto ni src/assets a --root. Se rechazan symlinks y rutas que escapen del directorio.

Primero simular, sin subir ni modificar archivos o filas:

```powershell
npm run photos:storage -- plan --target cloudinary --root C:\MiraiLinkMedia\profiles --manifest C:\MiraiLinkMedia\manifests\to-cloudinary.json
```

Preparar las subidas y guardar un manifiesto reanudable:

```powershell
npm run photos:storage -- prepare --target cloudinary --root C:\MiraiLinkMedia\profiles --manifest C:\MiraiLinkMedia\manifests\to-cloudinary.json
```

La preparacion modifica Cloudinary y su registro de recursos, pero no cambia user_photos.url. Verifica las imagenes descargadas contra SHA-256 y tamano del original. Revisar que errors sea cero y leer el manifiesto local si hay problemas. Repetir prepare con el mismo manifiesto para reanudar. No editarlo a mano ni compartirlo publicamente: contiene identificadores de usuarios y URLs, aunque no contiene secretos de API.

Los recursos preparados que no lleguen a aplicarse quedan recuperables para limpieza. Las entradas preparadas correctamente para migracion tienen una ventana de siete dias; completar apply antes de ese plazo. Si la limpieza se ejecuta despues y elimina un original sin referencias, prepare lo detectara al verificarlo; generar un nuevo manifiesto para volver a prepararlo.

Detener temporalmente las escrituras desde API y workers. No basta con cerrar una app movil si otros usuarios pueden seguir subiendo o borrando. En Render puede utilizarse una ventana de mantenimiento del servicio o un corte de trafico de escritura controlado. Con writes-stopped se declara que este paso manual ya se ha realizado:

```powershell
npm run photos:storage -- apply --manifest C:\MiraiLinkMedia\manifests\to-cloudinary.json --writes-stopped
```

La aplicacion comprueba de nuevo los archivos y cambia las referencias dentro de una transaccion. Conserva IDs, propietarios y posiciones; rechaza filas modificadas, fotos nuevas fuera del manifiesto o transferencias incompletas. Es repetible si ya se aplicaron las mismas referencias.

Mantener los originales locales para rollback, reactivar el servicio y comprobar fotos de usuarios antiguos y una subida nueva. No ejecutar cleanup durante el corte de migracion ni en paralelo con apply o rollback.

### Avatar de reserva sin fila propia

Las fotos existentes en user_photos, incluido Goku si esta referenciado, se migran como el resto. El avatar que aparece para una persona sin ninguna foto es una referencia de reserva del codigo, no un archivo detectado por un recorrido de carpetas. Si se quiere servir tambien desde Cloudinary, subir manualmente una copia externa del avatar en Media Library y configurar su URL publica en DEFAULT_AVATAR_URL. Si el mismo original figura en el manifiesto, puede usarse la URL ya subida en entry.photo.url. Conservar este ajuste en un registro de despliegue privado para restaurarlo al volver a local.

## 5. Migrar Neon y todas las fotos a un VPS

Hay dos cosas distintas que respaldar: PostgreSQL y los archivos. Un pg_dump no contiene las imagenes de Cloudinary.

### A. Preparar y respaldar PostgreSQL

Instalar PostgreSQL compatible y el runtime de Node del proyecto en el VPS. Usar un cliente pg_dump de la misma version mayor que Neon o mas reciente. Mantener una copia privada de variables y de los manifiestos.

Detener las escrituras del backend antiguo y los workers y crear un respaldo final de Neon usando su conexion directa. Ejemplo en bash en el VPS: leer la conexion sin guardarla en el historial ni mostrarla:

```bash
read -r -s -p 'Conexion directa Neon: ' NEON_DATABASE_URL
echo
export NEON_DATABASE_URL
pg_dump --dbname="$NEON_DATABASE_URL" --format=custom --no-owner --no-acl --file=mirailink-neon.dump
unset NEON_DATABASE_URL
```

Crear una base vacia en el PostgreSQL del VPS y restaurar el dump. Adaptar rol, host y autenticacion al servidor propio; no utilizar una base con datos que se quieran conservar:

```bash
createdb -h 127.0.0.1 -U mirailink mirailink
pg_restore -h 127.0.0.1 -U mirailink --dbname=mirailink --no-owner --no-acl --exit-on-error mirailink-neon.dump
```

No usar --clean, db:reset ni db:seed para este traslado. La base ya incluye esquema, migraciones, catalogos, usuarios y registro de recursos. Poner en el .env del VPS DB_URL de la base restaurada; ejecutar npm ci y npm run db:migrate para verificar pendientes.

### B. Descargar fotos de Cloudinary a disco del VPS

Mantener las credenciales Cloudinary en el .env del VPS durante la exportacion. Crear carpetas fuera del checkout, con permisos para el usuario del backend:

```bash
mkdir -p /srv/mirailink/uploads/profiles /srv/mirailink/migration
```

Ejecutar desde el checkout del backend en el VPS, con DB_URL apuntando ya al PostgreSQL restaurado:

```bash
npm run photos:storage -- plan --target local --root /srv/mirailink/uploads/profiles --manifest /srv/mirailink/migration/to-local.json
npm run photos:storage -- prepare --target local --root /srv/mirailink/uploads/profiles --manifest /srv/mirailink/migration/to-local.json
```

La herramienta descarga un original por URL registrada y comprueba firma, tamano y hash; rechaza otros dominios, clouds y redirecciones. Solo migra recursos propios registrados. Las descargas se guardan en `migrated/<uuid>.<extension>` dentro de profiles y el manifiesto conserva la correspondencia original. Si errors no es cero, resolver el problema antes de continuar. No se toca Neon desde estos comandos si DB_URL apunta al VPS.

Las referencias locales heredadas se conservan. Si aun hay fotos locales no migradas previamente, copiar tambien sus originales desde su respaldo externo a la estructura correspondiente en el VPS. Las imagenes de reserva configuradas solo mediante DEFAULT_AVATAR_URL no forman parte de user_photos: conservar tambien una copia externa y alojarla manualmente en profiles/Goku.webp, o mantener su URL Cloudinary mientras se decide.

### C. Aplicar referencias y activar modo local

Con API y workers del VPS aun detenidos:

```bash
npm run photos:storage -- apply --manifest /srv/mirailink/migration/to-local.json --writes-stopped
```

Configurar el backend del VPS:

```dotenv
PHOTO_STORAGE_PROVIDER=local
UPLOAD_ROOT=/srv/mirailink/uploads/profiles
DEFAULT_AVATAR_URL=assets/img/profiles/Goku.webp
```

Express ya sirve UPLOAD_ROOT bajo `/assets/img/profiles`. Una URL guardada como `assets/img/profiles/migrated/abc.jpg` debe responder desde `https://tu-backend/assets/img/profiles/migrated/abc.jpg`. Las nuevas subidas locales se guardaran en `<user-id>/<uuid>.<extension>` dentro del mismo directorio. No mover los archivos a src/assets ni editar controladores.

Arrancar Node supervisado con systemd o equivalente y HTTPS mediante un proxy. Conservar el dominio/base URL del backend si se quiere evitar cambiar el cliente. Verificar /healthz, perfiles antiguos, nueva subida, sustitucion, orden y borrado antes de redirigir trafico y reanudar escrituras. /healthz solo comprueba liveness.

Conservar Cloudinary y los respaldos hasta cerrar la ventana de rollback. Una vez que no quede ninguna referencia remota y se haya verificado la restauracion, se pueden retirar las credenciales Cloudinary del VPS en modo local. No eliminarlas mientras sigan existiendo recursos remotos que el backend deba borrar.

## 6. Rollback

Las herramientas no borran originales del proveedor anterior al aplicar una migracion. Para volver a las referencias anteriores, detener las escrituras y ejecutar en la misma base migrada:

```bash
npm run photos:storage -- rollback --manifest /srv/mirailink/migration/to-local.json --root /srv/mirailink/uploads/profiles --writes-stopped
```

Para deshacer local a Cloudinary, usar el manifiesto to-cloudinary y --root con la copia externa local original. Se verifican destinos y origenes antes de cambiar referencias. Volver a configurar el proveedor para nuevas subidas y DEFAULT_AVATAR_URL segun el entorno, reiniciar y validar.

El rollback es estricto: si una fila se borro o cambio despues de la migracion, se rechaza el lote. No sobrescribir los cambios nuevos a mano ni borrar esos usuarios para forzarlo. Crear un manifiesto de recuperacion revisado o restaurar el respaldo apropiado con una estrategia para conservar escrituras nuevas. La opcion mas sencilla es hacer la validacion y cualquier rollback antes de reabrir escrituras.

## 7. Limpieza y recursos pendientes

Las sustituciones y borrados crean photo_cleanup_jobs en la transaccion SQL. Se intenta limpiar tras confirmar la operacion. Si hay caida del proveedor, el cliente no pierde su foto nueva: el trabajo queda pendiente y reintentable.

```bash
npm run photos:storage -- cleanup
```

Cada ejecucion trata hasta 100 trabajos vencidos; repetir para vaciar un backlog. Si falla un recurso, se reintenta a partir de una hora despues. Puede programarse este comando en el cron del VPS. En Render Free no se garantiza un worker ni un temporizador continuo: ejecutar manualmente cuando corresponda. Las subidas inciertas dejan el ID previsto registrado y un trabajo diferido de una hora. No ejecutar cleanup en paralelo con una migracion.

Consulta de estado sin secretos:

```sql
SELECT attempts, error_code, next_attempt_at, COUNT(*)
FROM photo_cleanup_jobs
GROUP BY attempts, error_code, next_attempt_at;
```

Las fotos compartidas o aun referenciadas no se eliminan. Los avatares locales globales tampoco se borran como consecuencia de una operacion de usuario. Los recursos originales conservados deliberadamente por una migracion no se borran automaticamente: revisar su manifiesto y referencias antes de cualquier limpieza manual en Media Library.

## 8. Validacion y limites

- Cloudinary elimina la dependencia del disco temporal de Render, pero no ofrece almacenamiento infinito ni reemplaza respaldos. Revisar cuota, cuenta y copias externas.
- Las URLs son publicas por decision aprobada. Ocultar o velar una foto en Capsula no revoca una URL ya conocida; CDN y caches pueden retener copias tras un borrado.
- Las URLs HTTPS deben usarse tal como llegan de la API; el cliente no debe anteponer la base del backend a una URL absoluta. La revision de esta rama cubre el backend; la comprobacion visual en Android requiere el cliente.
- El uso de Cloudinary no resuelve el bloqueo SMTP de Hostinger ni la suspension por inactividad de Render Free.
- Nunca usar la base real para la suite de pruebas de esquema. PHOTO_DATABASE_TEST_URL habilita pruebas aisladas solo en PostgreSQL local desechable.
- Sin credenciales de Cloudinary disponibles, los tests del SDK usan mocks. La validacion de cuenta real debe confirmar subida, descarga y borrado de una imagen temporal de prueba, ademas de visualizarla desde la app.
