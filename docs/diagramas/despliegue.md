# UML: despliegue

[Índice](indice.md) | [Fuente editable PlantUML](despliegue.puml)

Vista derivada del código versionado, revisada el 2026-10-01. No contiene datos reales. Ver [arquitectura](../estudio/arquitectura.md), [seguridad](../estudio/autenticacion-y-seguridad.md) y [mensajería](../estudio/flujos/chat.md) para fuentes, comportamiento y alternativas.

```plantuml
@startuml
node "Dispositivo cliente" as Cliente
node "TLS proxy opcional" as Proxy
node "Host backend" {
 artifact "Proceso Node / Express" as API
 folder "Fotos en filesystem" as Media
}
database "PostgreSQL" as DB
cloud "SMTP / Firebase / RAWG / Jikan" as Proveedores
Cliente --> Proxy : HTTPS
Proxy --> API : HTTP interno
API --> DB : pg
API --> Media : staging y entrega
API --> Proveedores : llamadas externas
note right of Proxy
Topología orientativa.
No confirma infraestructura desplegada.
end note
@enduml
```

Para visualizar, abrir el archivo .puml en un editor/renderer PlantUML local. No enviar código privado a servicios públicos. La vista de overview es una actividad que agrupa interacciones; estructura compuesta es una vista de componentes internos. No se presentan como un metamodelo UML formal validado.
