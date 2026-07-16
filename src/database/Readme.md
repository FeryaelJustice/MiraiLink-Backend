# Base de datos de MiraiLink

PostgreSQL es la persistencia principal.

- `db.sql` crea el esquema inicial. No es idempotente ni sustituye un sistema de migraciones.
- `db_inserts.sql` contiene datos de desarrollo y no debe ejecutarse en producción.
- La documentación completa de tablas, relaciones, restricciones y brechas está en [`../../docs/database.md`](../../docs/database.md).

Inicialización local desde la raíz del repositorio:

```powershell
psql -U postgres -d mirailink -f src/database/db.sql
psql -U postgres -d mirailink -f src/database/db_inserts.sql
```
