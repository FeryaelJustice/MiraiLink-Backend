# UML: tiempo-tokens

[Índice](indice.md) | [Fuente editable PlantUML](tiempo-tokens.puml)

Vista derivada del código versionado, revisada el 2026-10-01. No contiene datos reales. Ver [arquitectura](../estudio/arquitectura.md), [seguridad](../estudio/autenticacion-y-seguridad.md) y [mensajería](../estudio/flujos/chat.md) para fuentes, comportamiento y alternativas.

```plantuml
@startuml
robust "Challenge 2FA" as Challenge
robust "Access JWT" as Access
@0
Challenge is Emitido
Access is NoEmitido
@300
Challenge is Expirado
@0
Access is Emitido
@86400
Access is Expirado
note bottom of Access
Vistas de TTL independientes desde emisión.
Access no se emite necesariamente en t=0 del challenge.
Revocación puede invalidarlo antes de su TTL.
end note
@enduml
```

Para visualizar, abrir el archivo .puml en un editor/renderer PlantUML local. No enviar código privado a servicios públicos. La vista de overview es una actividad que agrupa interacciones; estructura compuesta es una vista de componentes internos. No se presentan como un metamodelo UML formal validado.
