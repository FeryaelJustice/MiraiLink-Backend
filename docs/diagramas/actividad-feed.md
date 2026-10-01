# Actividad de descubrimiento

[Índice](indice.md) | [Guía maestra](../guia-maestra.md)

Tipo: actividad representada como flowchart. Revisión: 2026-10-01. Fuentes: [src/controllers/swipe.controller.js](../../src/controllers/swipe.controller.js), [src/utils/geoSearch.js](../../src/utils/geoSearch.js).

```mermaid
flowchart TD
    Inicio["Cuenta autenticada"] --> Preferencias["Resolver scope y preferencias"]
    Preferencias --> Origen["Residencia o ubicación activa fresca"]
    Origen --> Candidatos["Excluir propio, borrados y votos previos"]
    Candidatos --> Filtro["Aplicar radio o país según scope"]
    Filtro --> Ranking["Intereses, distancia y random"]
    Ranking --> Pagina["LIMIT y OFFSET"]
    Pagina --> Vacia{"Hay candidatos"}
    Vacia -->|no| ListaVacia["Respuesta vacía válida"]
    Vacia -->|sí| Enriquecer["Fotos, intereses y atributos localizados"]
    Enriquecer --> DTO["Proyección pública"]
```

Ranking aleatorio no garantiza orden estable entre páginas. El flujo describe SQL/controlador, no un SLA de rendimiento ni autorización Premium certificada por proveedor.
