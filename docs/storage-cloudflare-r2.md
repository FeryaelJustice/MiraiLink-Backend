# Almacenamiento de Fotos en Cloudflare R2 y Modo Local

Este documento detalla la arquitectura de almacenamiento de fotos de perfil en MiraiLink-Backend, su integracion con Cloudflare R2 mediante el SDK de S3, y el procedimiento para alternar o revertir al almacenamiento en disco local cuando se despliegue en un VPS.

## 1. Arquitectura y Ubicacion en el Codigo

El manejo de fotos esta desacoplado y centralizado:

- `src/services/r2StorageService.js`:
  - Inicializa el cliente `S3Client` con la region `auto` y las credenciales de Cloudflare R2.
  - Implementa `uploadToR2(userId, file, customKey)` con `PutObjectCommand`.
  - Implementa `deleteFromR2(keyOrUrl)` con `DeleteObjectCommand`.
  - Provee `isR2Url(url)` y `extractR2Key(keyOrUrl)` para distinguir fotos remotas de rutas locales de forma retrocompatible.

- `src/utils/photoStorage.js`:
  - Actua como el adaptador principal utilizado por los controladores.
  - Detecta el driver activo mediante `getStorageDriver()`.
  - Si el driver es `r2`: delega la subida a Cloudflare R2 y genera la URL publica permanente.
  - Si el driver es `local`: escribe en el sistema de archivos local (`assets/img/profiles` o `UPLOAD_ROOT`) con permisos restrictivos `0600`.
  - Mantiene intacta la interfaz transaccional requerida por los controladores (`stagePhoto`, `finalizePhoto`, `cleanupStagedPhoto`, `removePhotoFile`).

- `src/controllers/photo.controller.js` y `src/controllers/user.controller.js`:
  - No requieren modificaciones. Siguen consumiendo `stagePhoto`, `finalizePhoto`, `removePhotoFile` y `cleanupStagedPhoto`. Si la transaccion PostgreSQL falla, `cleanupStagedPhoto` compensa eliminando el archivo tanto en local como en R2.

- `src/config/env.js`:
  - Valida las variables en el arranque mediante Zod. Si `STORAGE_DRIVER=r2`, exige que los 5 parametros de R2 esten definidos y no vacios.

## 2. Variables de Entorno

### Opcion A: Modo Cloudflare R2

En el archivo `.env`:

```env
# Driver de almacenamiento
STORAGE_DRIVER=r2

# Credenciales y bucket de Cloudflare R2
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=tu_r2_access_key_id
R2_SECRET_ACCESS_KEY=tu_r2_secret_access_key
R2_BUCKET_NAME=tu_nombre_de_bucket
R2_PUBLIC_URL=https://pub-tu-bucket.r2.dev
```

> Nota: `R2_PUBLIC_URL` puede ser el subdominio `r2.dev` o un dominio personalizado (ej. `https://media.mirailink.xyz`).

### Opcion B: Modo Disco Local (VPS o Desarrollo sin Cloud)

Para volver al modo de disco local sin necesidad de desinstalar dependencias ni modificar codigo:

```env
# Cambiar driver a local
STORAGE_DRIVER=local

# Opcional en VPS: directorio persistente fuera del repositorio
UPLOAD_ROOT=/var/lib/mirailink/uploads
```

Al configurar `STORAGE_DRIVER=local`:
- Las imagenes se guardan en la carpeta local (`UPLOAD_ROOT` o `src/assets/img/profiles`).
- Las URLs en base de datos vuelven a ser rutas relativas locales (`assets/img/profiles/...`).
- El servidor Express las sirve directamente bajo `/assets/img/profiles/...`.

## 3. Compatibilidad Mixta

El metodo `removePhotoFile(url)` inspecciona el formato de la URL:
- Si la URL comienza con `http://` o `https://` y no corresponde a una ruta local de desarrollo, se comunica con R2 y ejecuta `DeleteObjectCommand`.
- Si la URL es una ruta relativa local (`assets/img/profiles/...`), ejecuta `fs.unlink` en el disco local.

Esto garantiza que al migrar o probar entre entornos no se produzcan excepciones si existen usuarios con fotos locales y otros con fotos en Cloudflare R2.

## 4. Como Revertir Completamente via Git

Este cambio se encuentra aislado en la rama git `feature/cloudflare-r2-storage`.

Si en algun momento decides descartar esta implementacion y volver a la version previa sin la dependencia `@aws-sdk/client-s3`:

```bash
# 1. Regresar a la rama main
git checkout main

# 2. (Opcional) Eliminar la rama local de prueba
git branch -D feature/cloudflare-r2-storage
```
