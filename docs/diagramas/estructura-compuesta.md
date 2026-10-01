# UML: estructura-compuesta

[Índice](indice.md) | [Fuente editable PlantUML](estructura-compuesta.puml)

Vista derivada del código versionado, revisada el 2026-10-01. No contiene datos reales. Ver [arquitectura](../estudio/arquitectura.md), [seguridad](../estudio/autenticacion-y-seguridad.md) y [mensajería](../estudio/flujos/chat.md) para fuentes, comportamiento y alternativas.

```plantuml
@startuml
component "Express app" {
 component "requestId / CORS / JSON / Helmet" as Global
 component "routers API" as R
 component "controllers" as C
 component "errorHandler" as E
 Global --> R
 R --> C
 R --> E : next(error)
 C --> E : next(error)
}
interface "HTTP" as HTTP
HTTP --> Global
note bottom of R
Composición interna de createApp.
Vista estructural; no representa procesos separados.
end note
@enduml
```

Para visualizar, abrir el archivo .puml en un editor/renderer PlantUML local. No enviar código privado a servicios públicos. La vista de overview es una actividad que agrupa interacciones; estructura compuesta es una vista de componentes internos. No se presentan como un metamodelo UML formal validado.
