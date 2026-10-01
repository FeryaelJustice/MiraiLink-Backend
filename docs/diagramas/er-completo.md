# er-completo

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
    token_blacklist {
        TEXT token PK
        TIMESTAMP invalidated_at
        TIMESTAMPTZ expires_at
    }
    verification_tokens {
        UUID id PK
        UUID user_id FK
        VARCHAR type
        TIMESTAMP expires_at
        TIMESTAMP created_at
        VARCHAR token_hash
    }
    password_reset_tokens {
        UUID id PK
        UUID user_id FK
        TIMESTAMP expires_at
        TIMESTAMP created_at
        VARCHAR token_hash
    }
    user_photos {
        UUID id PK
        UUID user_id FK
        TEXT url
        INT position
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
    likes {
        UUID id PK
        UUID from_user_id FK
        UUID to_user_id FK
        TIMESTAMP created_at
    }
    dislikes {
        UUID id PK
        UUID from_user_id FK
        UUID to_user_id FK
        TIMESTAMP created_at
    }
    matches {
        UUID id PK
        UUID user1_id FK
        UUID user2_id FK
        BOOLEAN seen_by_user1
        BOOLEAN seen_by_user2
        TIMESTAMP created_at
    }
    chats {
        UUID id PK
        TEXT type
        TEXT name
        UUID created_by FK
        TIMESTAMP created_at
    }
    chat_members {
        UUID chat_id PK, FK
        UUID user_id PK, FK
        TEXT role
        TIMESTAMP joined_at
        TIMESTAMP last_read_at
    }
    messages {
        UUID id PK
        UUID sender_id FK
        UUID chat_id FK
        BOOLEAN is_read
        TIMESTAMP created_at
        TEXT text
        TIMESTAMP sent_at
    }
    push_tokens {
        UUID id PK
        UUID user_id FK, UK
        TEXT token
        TEXT platform
        TIMESTAMP created_at
    }
    reports {
        UUID id PK
        UUID reported_by FK
        UUID reported_user FK
        TEXT reason
        TIMESTAMP created_at
    }
    feedback {
        UUID id PK
        UUID user_id FK
        TEXT message
        TIMESTAMP created_at
    }
    user_2fa {
        UUID user_id PK, FK
        TEXT secret
        BOOLEAN enabled
    }
    recovery_codes {
        SERIAL id PK
        UUID user_id FK
        TEXT code_hash
        BOOLEAN used
    }
    app_versions {
        TEXT platform PK
        INTEGER min_supported_version_code
        INTEGER latest_version_code
        TEXT message
        TEXT play_store_url
        TIMESTAMPTZ updated_at
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
    user_subscriptions {
        UUID id PK
        UUID user_id FK
        VARCHAR product_id
        VARCHAR base_plan_id
        TEXT purchase_token
        VARCHAR order_id
        VARCHAR status
        BOOLEAN auto_renewing
        TIMESTAMPTZ start_date
        TIMESTAMPTZ expires_at
        TIMESTAMPTZ last_verified_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }
    schema_migrations {
        TEXT filename PK
        TIMESTAMPTZ applied_at
    }
    countries |o--o{ users : "residence_country_id"
    regions |o--o{ users : "residence_region_id"
    cities |o--o{ users : "residence_city_id"
    religions |o--o{ users : "religion_id"
    zodiac_signs |o--o{ users : "zodiac_sign_id"
    political_stances |o--o{ users : "political_stance_id"
    smoking_habits |o--o{ users : "smoking_habit_id"
    drinking_habits |o--o{ users : "drinking_habit_id"
    sexual_orientations |o--o{ users : "sexual_orientation_id"
    education_levels |o--o{ users : "education_level_id"
    users |o--o{ user_location_history : "user_id"
    users |o--o{ verification_tokens : "user_id"
    users |o--o{ password_reset_tokens : "user_id"
    users |o--o{ user_photos : "user_id"
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
    users |o--o{ likes : "from_user_id"
    users |o--o{ likes : "to_user_id"
    users |o--o{ dislikes : "from_user_id"
    users |o--o{ dislikes : "to_user_id"
    users |o--o{ matches : "user1_id"
    users |o--o{ matches : "user2_id"
    users |o--o{ chats : "created_by"
    chats ||--o{ chat_members : "chat_id"
    users ||--o{ chat_members : "user_id"
    users |o--o{ messages : "sender_id"
    chats |o--o{ messages : "chat_id"
    users |o--o| push_tokens : "user_id"
    users |o--o{ reports : "reported_by"
    users |o--o{ reports : "reported_user"
    users |o--o{ feedback : "user_id"
    users ||--o| user_2fa : "user_id"
    users |o--o{ recovery_codes : "user_id"
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
    users ||--o| user_subscriptions : "user_id"
```

El esquema contiene tablas y columnas legacy conservadas; su presencia no acredita uso activo en todos los handlers. Ver las fuentes y los hallazgos.
