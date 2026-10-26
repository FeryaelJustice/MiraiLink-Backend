# [APROBADO] Especificacion funcional: fotos persistentes con Cloudinary y retorno a disco

- Fecha: 2026-10-26
- Estado: APROBADO por el usuario el 2026-10-26; incluye fotos existentes y nuevas
- Rama: codex/cloudinary-photo-storage, creada desde origin/main
- Modulos auditados: src/utils/photoStorage.js, src/controllers/photo.controller.js, src/controllers/user.controller.js, src/middleware/capsulePresentation.middleware.js, src/config/env.js, src/database/db.sql

## 1. Problema y objetivo

Las fotos subidas a carpetas locales de Render Free desaparecen al reiniciar, redesplegar o suspender el servicio. Guardar las nuevas fotos en la cuenta Cloudinary del usuario y conservar en Neon referencias persistentes y migrables. Mantener el almacenamiento local operativo como alternativa configurable para un futuro VPS.

Cloudinary evita depender del disco temporal de Render, pero no garantiza conservacion ilimitada ni sustituye las copias de seguridad. Documentar cuotas, exportacion y restauracion.

## 2. Situacion actual comprobada

- photoStorage.js escribe archivos validados en staging, los promueve y elimina los anteriores.
- photo.controller.js gestiona subida individual y borrado. user.controller.js tambien sube y elimina fotos al modificar el perfil. Deben cubrirse ambos flujos.
- PostgreSQL almacena referencias en user_photos.url. Hay referencias locales heredadas y avatares por defecto; la base existente y sus inserts deben conservarse.
- La transaccion SQL no incluye filesystem ni un futuro proveedor remoto. La limpieza posterior al COMMIT no debe borrar accidentalmente la foto nueva ya confirmada.
- La presentacion de fotos en Capsula aplica reglas propias que deben seguir funcionando. Una URL publica no constituye control de acceso al archivo.
- El trabajo no puede leer, inventariar, modificar, documentar contenidos ni migrar directamente src/assets. Las pruebas usaran directorios temporales. Para una transferencia futura, el operador aportara una copia externa en un UPLOAD_ROOT autorizado.

## 3. Alcance

### Incluido

- SDK oficial vigente de Cloudinary, configurado exclusivamente con variables de entorno y credenciales en servidor.
- Cloudinary como almacenamiento principal de nuevas fotos en el despliegue configurado.
- Modo local conservado como codigo ejecutable y comprobable, seleccionable por configuracion. Documentar el cambio a disco persistente en VPS.
- Lectura compatible con referencias antiguas locales y nuevas referencias remotas. No reescribir filas existentes al arrancar.
- Compatibilidad con Neon y la base inicializada: cualquier cambio de esquema sera una migracion aditiva, sin reset ni repeticion de inserts.
- Subida, sustitucion, orden y borrado con autorizacion existente, limites de imagen y errores sanitizados.
- Identificacion del recurso remoto suficiente para eliminarlo y exportarlo sin depender de extraer datos fragiles de la URL.
- Exportacion de fotos remotas a un directorio externo, manifiesto verificable, simulacion previa y actualizacion controlada de referencias para volver a disco. Mantener IDs, propietarios y posiciones. No eliminar originales remotos por defecto.
- Guia Neon a PostgreSQL en VPS mediante respaldo y restauracion, copia separada de fotos, validacion, corte de escrituras durante la migracion y rollback.
- .env.example, documentacion operativa, referencia de codigo y contrato API sincronizados.

### Fuera de alcance

- Cambiar proveedor de correo, alojamiento del backend o facturacion.
- Cambios en el repositorio Android o publicacion del servicio.
- Modificar cuentas, crear suscripciones o introducir tarjetas.
- Copiar automaticamente archivos existentes desde src/assets.
- Ejecutar escrituras de migracion sobre Neon o la cuenta Cloudinary real antes de disponer de configuracion y aprobacion de su alcance.

## 4. Reglas y casuisticas

- Preservar JPEG, PNG y WebP, comprobacion binaria y limite vigente por foto. Credenciales nunca en respuestas, logs, manifiestos ni Git.
- Mantener las rutas y formas de respuesta usadas por Android, auditando que una URL HTTPS absoluta se entregue sin prefijos locales adicionales.
- Cloudinary no disponible o cuota agotada: devolver error recuperable, sin confirmar referencia inexistente, eliminar la foto anterior ni cambiar automaticamente al disco local.
- El modo local debe seguir disponible sin quitar comentarios ni reescribir controladores.
- Fallo SQL despues de subir: compensar recurso remoto creado cuando corresponda. Fallo de borrado tras confirmar SQL: no deshacer ni destruir la nueva foto confirmada; definir recuperacion y evidencia de pendientes.
- No considerar una subida como idempotente sin verificar el comportamiento de los reintentos.
- Entrega publica HTTPS aprobada por el usuario. Mantener explicitamente los limites de privacidad de Capsula.
- Las referencias heredadas solo pueden seguir mostrando sus imagenes si los archivos originales existen y son servidos. Un registro SQL o un cambio de proveedor no recupera archivos perdidos.

## 5. Contrato y configuracion

- Conservar endpoints existentes de fotos y perfil y su autorizacion.
- Mantener url como referencia de presentacion compatible, sin exponer secretos.
- Variables propuestas para revision: PHOTO_STORAGE_PROVIDER=cloudinary|local, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_FOLDER y UPLOAD_ROOT para local.
- Seleccion de Cloudinary con configuracion incompleta debe fallar de forma clara; no cambiar silenciosamente de proveedor.
- Identificacion remota, politica de borrado, errores especificos y detalle de migraciones se concretaran en el plan posterior a la aprobacion de esta especificacion.

## 6. Criterios de aceptacion

1. Dado Cloudinary configurado, al subir una foto valida desde cualquiera de los flujos existentes, Neon conserva una referencia remota verificable; la foto no depende del disco de Render.
2. Dada una base existente, activar Cloudinary no borra usuarios, fotos, posiciones ni catalogos, ni exige reinicializar Neon.
3. Dada una caida del proveedor o fallo de persistencia, no se pierde la imagen anterior y la respuesta no expone errores ni credenciales del proveedor.
4. Dado modo local y un UPLOAD_ROOT temporal o persistente autorizado, subir, sustituir y borrar siguen funcionando sin Cloudinary.
5. Dada una exportacion, se verifican integridad y correspondencia entre archivos y filas antes de actualizar referencias. Un fallo no deja rutas apuntando a archivos ausentes. Rollback conserva referencias originales.
6. Dada la migracion a VPS, restaurar el dump y las fotos, actualizar las referencias y seleccionar local basta para servirlas sin reconstruir datos de usuario. Documentar verificaciones y restricciones de corte.
7. Tests cubren ambos proveedores, errores y compensaciones, mas contratos de perfil y fotos. Lint, cobertura, contrato OpenAPI y pruebas de base cuando exista PostgreSQL desechable. Diferenciar mocks de prueba real de subida, descarga, borrado y reinicio.

## 7. Decisiones aprobadas

- Error recuperable si falla Cloudinary y seleccion local explicita para VPS, evitando disco efimero de Render.
- Entrega publica HTTPS.
- Incluir fotos existentes y nuevas, con importacion desde una copia externa autorizada de las fotos locales. Informar referencias ausentes sin borrar ni sustituirlas.
- Documentar operaciones automaticas y pasos manuales para ambos sentidos de migracion, incluyendo Neon a PostgreSQL en VPS.

## 8. Fuentes verificadas y limites

- Context7 no esta expuesto en esta sesion; no se ha afirmado haberlo consultado.
- npm view cloudinary version deprecated --json consultado el 2026-10-26: ultima version 2.11.0; sin campo deprecated devuelto. Revalidar al instalar.
- SDK Node oficial: https://cloudinary.com/documentation/node_integration
- Subidas Node: https://cloudinary.com/documentation/node_image_and_video_upload
- Referencia Upload API: https://cloudinary.com/documentation/image_upload_api_reference
- La implementacion verificara metodos vigentes y dependencias; una consulta de version no certifica ausencia de toda vulnerabilidad o API deprecada.

Especificacion aprobada. El plan tecnico se prepara por separado y requiere aprobacion conforme a la politica SDD del repositorio.
