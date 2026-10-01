# UML: overview-interaccion

[Índice](indice.md) | [Fuente editable PlantUML](overview-interaccion.puml)

Vista derivada del código versionado, revisada el 2026-10-01. No contiene datos reales. Ver [arquitectura](../estudio/arquitectura.md), [seguridad](../estudio/autenticacion-y-seguridad.md) y [mensajería](../estudio/flujos/chat.md) para fuentes, comportamiento y alternativas.

```plantuml
@startuml
start
:Validar entrada de login;
if (Credencial correcta?) then (sí)
 if (2FA enabled?) then (sí)
  :Interacción de challenge y código;
  if (Segundo factor válido?) then (sí)
   :Interacción de emisión access JWT;
  else (no)
   :Responder error;
   stop
  endif
 else (no)
  :Interacción de emisión access JWT;
 endif
 :Interacción de autorización de recursos;
else (no)
 :Responder INVALID_CREDENTIALS;
endif
stop
@enduml
```

Para visualizar, abrir el archivo .puml en un editor/renderer PlantUML local. No enviar código privado a servicios públicos. La vista de overview es una actividad que agrupa interacciones; estructura compuesta es una vista de componentes internos. No se presentan como un metamodelo UML formal validado.
