# UML: casos-de-uso

[Índice](indice.md) | [Fuente editable PlantUML](casos-de-uso.puml)

Vista derivada del código versionado, revisada el 2026-10-01. No contiene datos reales. Ver [arquitectura](../estudio/arquitectura.md), [seguridad](../estudio/autenticacion-y-seguridad.md) y [mensajería](../estudio/flujos/chat.md) para fuentes, comportamiento y alternativas.

```plantuml
@startuml
left to right direction
actor "Cliente autenticado" as Cliente
actor "Cliente sin sesión" as Visitante
actor "Operador autorizado" as Operador
rectangle "API MiraiLink" {
 usecase "Registrar o iniciar sesión" as Acceso
 usecase "Confirmar código o challenge" as Codigo
 usecase "Gestionar perfil y fotos" as Perfil
 usecase "Descubrir y votar" as Feed
 usecase "Enviar y consultar mensajes" as Chat
 usecase "Registrar purchaseToken" as Compra
 usecase "Migrar y mantener catálogos" as Mantenimiento
}
Visitante --> Acceso
Visitante --> Codigo
Cliente --> Perfil
Cliente --> Feed
Cliente --> Chat
Cliente --> Compra
Operador --> Mantenimiento
note right of Compra
El handler no verifica la compra
con Google Play Developer API.
end note
@enduml
```

Para visualizar, abrir el archivo .puml en un editor/renderer PlantUML local. No enviar código privado a servicios públicos. La vista de overview es una actividad que agrupa interacciones; estructura compuesta es una vista de componentes internos. No se presentan como un metamodelo UML formal validado.
