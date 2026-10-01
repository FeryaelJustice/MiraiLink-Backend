# UML: objetos

[Índice](indice.md) | [Fuente editable PlantUML](objetos.puml)

Vista derivada del código versionado, revisada el 2026-10-01. No contiene datos reales. Ver [arquitectura](../estudio/arquitectura.md), [seguridad](../estudio/autenticacion-y-seguridad.md) y [mensajería](../estudio/flujos/chat.md) para fuentes, comportamiento y alternativas.

```plantuml
@startuml
object "chat : chats" as Chat {
 type = private
}
object "miembroA : chat_members" as A {
 role = admin
}
object "miembroB : chat_members" as B {
 role = member
}
object "mensaje : messages" as M {
 text = ejemplo sin datos reales
}
A --> Chat : chat_id
B --> Chat : chat_id
M --> Chat : chat_id
note bottom of Chat
Instancias conceptuales del esquema.
No contiene registros de una base real.
end note
@enduml
```

Para visualizar, abrir el archivo .puml en un editor/renderer PlantUML local. No enviar código privado a servicios públicos. La vista de overview es una actividad que agrupa interacciones; estructura compuesta es una vista de componentes internos. No se presentan como un metamodelo UML formal validado.
