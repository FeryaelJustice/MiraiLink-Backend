# er-geografia

[Índice de diagramas](indice.md) | [Diccionario del esquema](../estudio/diccionario-esquema.md).

Tipo: entidad-relación, no UML. Incluye entidades de la vista y relaciones SQL declaradas. Padre obligatorio: ||; padre opcional: |o; hijos: o{ o un máximo de uno cuando la FK es única. Las tablas puente usan PK compuesta descrita en el diccionario.

```mermaid
erDiagram
    users {
        UUID id PK
        VARCHAR username UK
        VARCHAR nickname
        VARCHAR email UK
        VARCHAR phone_number UK
        TEXT password_hash
        auth_provider auth_provider
        BOOLEAN is_verified
        TEXT bio
        VARCHAR gender
        DATE birthdate
        DOUBLE residence_latitude
        DOUBLE residence_longitude
        DOUBLE current_latitude
        DOUBLE current_longitude
        TIMESTAMP last_location_updated_at
        TIMESTAMP created_at
        TIMESTAMP updated_at
        BOOLEAN is_deleted
        UUID residence_country_id FK
        UUID residence_region_id FK
        UUID residence_city_id FK
        VARCHAR profession
        UUID religion_id FK
        UUID zodiac_sign_id FK
        UUID political_stance_id FK
        UUID smoking_habit_id FK
        UUID drinking_habit_id FK
        UUID sexual_orientation_id FK
        UUID education_level_id FK
    }
    user_location_history {
        UUID id PK
        UUID user_id FK
        DOUBLE latitude
        DOUBLE longitude
        VARCHAR city
        VARCHAR country_code
        TIMESTAMP recorded_at
    }
    supported_languages {
        UUID id PK
        VARCHAR code UK
        VARCHAR english_name
    }
    countries {
        UUID id PK
        CHAR iso_code UK
        BIGINT geonames_id UK
        DOUBLE latitude
        DOUBLE longitude
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }
    country_name_translations {
        UUID country_id PK, FK
        UUID language_id PK, FK
        VARCHAR name
        VARCHAR normalized_name
    }
    regions {
        UUID id PK
        UUID country_id FK
        BIGINT geonames_id UK
        VARCHAR catalog_key UK
        VARCHAR admin_code
        DOUBLE latitude
        DOUBLE longitude
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }
    region_name_translations {
        UUID region_id PK, FK
        UUID language_id PK, FK
        VARCHAR name
        VARCHAR normalized_name
    }
    cities {
        UUID id PK
        UUID country_id FK
        UUID region_id FK
        BIGINT geonames_id UK
        VARCHAR catalog_key UK
        DOUBLE latitude
        DOUBLE longitude
        BIGINT population
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }
    city_name_translations {
        UUID city_id PK, FK
        UUID language_id PK, FK
        VARCHAR name
        VARCHAR normalized_name
    }
    user_search_preferences {
        UUID user_id PK, FK
        INT search_radius_km
        VARCHAR search_scope
        UUID search_target_country_id FK
        BOOLEAN search_match_live_location
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }
    countries |o--o{ users : "residence_country_id"
    regions |o--o{ users : "residence_region_id"
    cities |o--o{ users : "residence_city_id"
    users |o--o{ user_location_history : "user_id"
    countries ||--o{ country_name_translations : "country_id"
    supported_languages ||--o{ country_name_translations : "language_id"
    countries ||--o{ regions : "country_id"
    regions ||--o{ region_name_translations : "region_id"
    supported_languages ||--o{ region_name_translations : "language_id"
    countries ||--o{ cities : "country_id"
    regions |o--o{ cities : "region_id"
    cities ||--o{ city_name_translations : "city_id"
    supported_languages ||--o{ city_name_translations : "language_id"
    users ||--o| user_search_preferences : "user_id"
    countries |o--o{ user_search_preferences : "search_target_country_id"
```

El esquema contiene tablas y columnas legacy conservadas; su presencia no acredita uso activo en todos los handlers. Ver las fuentes y los hallazgos.
