# er-catalogos-perfil

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
    supported_languages {
        UUID id PK
        VARCHAR code UK
        VARCHAR english_name
    }
    animes {
        UUID id PK
        VARCHAR name UK
        TEXT description
        TEXT image_url
        VARCHAR catalog_key UK
        TEXT image_path
    }
    games {
        UUID id PK
        VARCHAR name UK
        TEXT description
        TEXT image_url
        VARCHAR catalog_key UK
        TEXT image_path
    }
    anime_name_translations {
        UUID anime_id PK, FK
        UUID language_id PK, FK
        VARCHAR name
    }
    anime_biography_translations {
        UUID anime_id PK, FK
        UUID language_id PK, FK
        TEXT biography
    }
    game_name_translations {
        UUID game_id PK, FK
        UUID language_id PK, FK
        VARCHAR name
    }
    game_biography_translations {
        UUID game_id PK, FK
        UUID language_id PK, FK
        TEXT biography
    }
    user_anime_interests {
        UUID user_id PK, FK
        UUID anime_id PK, FK
    }
    user_game_interests {
        UUID user_id PK, FK
        UUID game_id PK, FK
    }
    relationship_goals {
        UUID id PK
        VARCHAR code UK
        TIMESTAMPTZ created_at
    }
    relationship_goal_translations {
        UUID goal_id PK, FK
        UUID language_id PK, FK
        VARCHAR label
    }
    family_options {
        UUID id PK
        VARCHAR code UK
        TIMESTAMPTZ created_at
    }
    family_option_translations {
        UUID option_id PK, FK
        UUID language_id PK, FK
        VARCHAR label
    }
    religions {
        UUID id PK
        VARCHAR code UK
        TIMESTAMPTZ created_at
    }
    religion_translations {
        UUID religion_id PK, FK
        UUID language_id PK, FK
        VARCHAR label
    }
    zodiac_signs {
        UUID id PK
        VARCHAR code UK
        TIMESTAMPTZ created_at
    }
    zodiac_sign_translations {
        UUID sign_id PK, FK
        UUID language_id PK, FK
        VARCHAR label
    }
    political_stances {
        UUID id PK
        VARCHAR code UK
        TIMESTAMPTZ created_at
    }
    political_stance_translations {
        UUID stance_id PK, FK
        UUID language_id PK, FK
        VARCHAR label
    }
    smoking_habits {
        UUID id PK
        VARCHAR code UK
        TIMESTAMPTZ created_at
    }
    smoking_habit_translations {
        UUID habit_id PK, FK
        UUID language_id PK, FK
        VARCHAR label
    }
    drinking_habits {
        UUID id PK
        VARCHAR code UK
        TIMESTAMPTZ created_at
    }
    drinking_habit_translations {
        UUID habit_id PK, FK
        UUID language_id PK, FK
        VARCHAR label
    }
    sexual_orientations {
        UUID id PK
        VARCHAR code UK
        TIMESTAMPTZ created_at
    }
    sexual_orientation_translations {
        UUID orientation_id PK, FK
        UUID language_id PK, FK
        VARCHAR label
    }
    education_levels {
        UUID id PK
        VARCHAR code UK
        TIMESTAMPTZ created_at
    }
    education_level_translations {
        UUID level_id PK, FK
        UUID language_id PK, FK
        VARCHAR label
    }
    spoken_languages {
        UUID id PK
        VARCHAR code UK
        TIMESTAMPTZ created_at
    }
    spoken_language_translations {
        UUID language_item_id PK, FK
        UUID language_id PK, FK
        VARCHAR label
    }
    profile_prompts {
        UUID id PK
        VARCHAR code UK
        TIMESTAMPTZ created_at
    }
    profile_prompt_translations {
        UUID prompt_id PK, FK
        UUID language_id PK, FK
        TEXT question
    }
    user_relationship_goals {
        UUID user_id PK, FK
        UUID goal_id PK, FK
    }
    user_family_options {
        UUID user_id PK, FK
        UUID option_id PK, FK
    }
    user_spoken_languages {
        UUID user_id PK, FK
        UUID language_id PK, FK
    }
    user_profile_prompts {
        UUID id PK
        UUID user_id FK
        UUID prompt_id FK
        VARCHAR answer
        TIMESTAMPTZ created_at
    }
    explore_categories {
        UUID id PK
        VARCHAR code UK
        VARCHAR section_group
        VARCHAR icon_key
        VARCHAR filter_type
        VARCHAR filter_value
        INT sort_order
        TIMESTAMPTZ created_at
    }
    explore_category_translations {
        UUID category_id PK, FK
        UUID language_id PK, FK
        VARCHAR title
        VARCHAR description
    }
    user_category_preferences {
        UUID user_id PK, FK
        UUID category_id PK, FK
        INT radius_km
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }
    religions |o--o{ users : "religion_id"
    zodiac_signs |o--o{ users : "zodiac_sign_id"
    political_stances |o--o{ users : "political_stance_id"
    smoking_habits |o--o{ users : "smoking_habit_id"
    drinking_habits |o--o{ users : "drinking_habit_id"
    sexual_orientations |o--o{ users : "sexual_orientation_id"
    education_levels |o--o{ users : "education_level_id"
    animes ||--o{ anime_name_translations : "anime_id"
    supported_languages ||--o{ anime_name_translations : "language_id"
    animes ||--o{ anime_biography_translations : "anime_id"
    supported_languages ||--o{ anime_biography_translations : "language_id"
    games ||--o{ game_name_translations : "game_id"
    supported_languages ||--o{ game_name_translations : "language_id"
    games ||--o{ game_biography_translations : "game_id"
    supported_languages ||--o{ game_biography_translations : "language_id"
    users ||--o{ user_anime_interests : "user_id"
    animes ||--o{ user_anime_interests : "anime_id"
    users ||--o{ user_game_interests : "user_id"
    games ||--o{ user_game_interests : "game_id"
    relationship_goals ||--o{ relationship_goal_translations : "goal_id"
    supported_languages ||--o{ relationship_goal_translations : "language_id"
    family_options ||--o{ family_option_translations : "option_id"
    supported_languages ||--o{ family_option_translations : "language_id"
    religions ||--o{ religion_translations : "religion_id"
    supported_languages ||--o{ religion_translations : "language_id"
    zodiac_signs ||--o{ zodiac_sign_translations : "sign_id"
    supported_languages ||--o{ zodiac_sign_translations : "language_id"
    political_stances ||--o{ political_stance_translations : "stance_id"
    supported_languages ||--o{ political_stance_translations : "language_id"
    smoking_habits ||--o{ smoking_habit_translations : "habit_id"
    supported_languages ||--o{ smoking_habit_translations : "language_id"
    drinking_habits ||--o{ drinking_habit_translations : "habit_id"
    supported_languages ||--o{ drinking_habit_translations : "language_id"
    sexual_orientations ||--o{ sexual_orientation_translations : "orientation_id"
    supported_languages ||--o{ sexual_orientation_translations : "language_id"
    education_levels ||--o{ education_level_translations : "level_id"
    supported_languages ||--o{ education_level_translations : "language_id"
    spoken_languages ||--o{ spoken_language_translations : "language_item_id"
    supported_languages ||--o{ spoken_language_translations : "language_id"
    profile_prompts ||--o{ profile_prompt_translations : "prompt_id"
    supported_languages ||--o{ profile_prompt_translations : "language_id"
    users ||--o{ user_relationship_goals : "user_id"
    relationship_goals ||--o{ user_relationship_goals : "goal_id"
    users ||--o{ user_family_options : "user_id"
    family_options ||--o{ user_family_options : "option_id"
    users ||--o{ user_spoken_languages : "user_id"
    spoken_languages ||--o{ user_spoken_languages : "language_id"
    users ||--o{ user_profile_prompts : "user_id"
    profile_prompts ||--o{ user_profile_prompts : "prompt_id"
    explore_categories ||--o{ explore_category_translations : "category_id"
    supported_languages ||--o{ explore_category_translations : "language_id"
    users ||--o{ user_category_preferences : "user_id"
    explore_categories ||--o{ user_category_preferences : "category_id"
```

El esquema contiene tablas y columnas legacy conservadas; su presencia no acredita uso activo en todos los handlers. Ver las fuentes y los hallazgos.
