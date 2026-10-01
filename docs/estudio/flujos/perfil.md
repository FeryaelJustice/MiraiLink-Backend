# Perfil, atributos, geografía y fotos

[Guía maestra](../../guia-maestra.md) | [Mapa de funcionalidades](../funcionalidades.md)

## Responsabilidad y recorrido

user router autentica cuenta verificada y valida entradas. updateProfile coordina campos, intereses, listas y archivos multipart. IDs de geografía se contrastan con país/región/ciudad; textos legacy no sustituyen su jerarquía. Las proyecciones públicas limitan datos; no exponer password_hash/secret.

## Alternativas y efectos

Zod elimina campos fuera de su contrato; listas JSON necesitan validación posterior. Un campo null, vacío u omitido no siempre tiene mismo efecto. Reordenar posiciones y cuatro archivos exige revisar original->destino y constraints. photo.controller hace staging, lock, cambio de fila, rename y COMMIT; no hay transacción distribuida con filesystem.

DeletePhoto por photoId y deleteUserPhoto por posición son rutas diferentes. El primero mantiene al menos una foto y renumera; archivos pueden quedar huérfanos o una limpieza posterior al commit fallar. No inspeccionar src/assets para este estudio.

## Fuentes para estudiar

- [user.routes.js](../../../src/routes/user.routes.js)
- [user.controller.js](../../../src/controllers/user.controller.js)
- [photo.controller.js](../../../src/controllers/photo.controller.js)
- [photoStorage.js](../../../src/utils/photoStorage.js)

Revisión: 2026-10-01, por inspección del código. Consultar [verificación](../desarrollo-y-verificacion.md) para resultados ejecutados.
