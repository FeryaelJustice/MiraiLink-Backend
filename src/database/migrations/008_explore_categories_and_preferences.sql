BEGIN;

-- 1. TABLA MAESTRA DE CATEGORIAS DE EXPLORACION
CREATE TABLE IF NOT EXISTS explore_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    section_group VARCHAR(50) NOT NULL, -- 'otaku', 'gaming', 'connections'
    icon_key VARCHAR(50) NOT NULL,      -- 'tv', 'theater', 'book', 'controller', 'trophy', 'sword', 'coffee', 'rose', 'cocktail', 'puzzle'
    filter_type VARCHAR(50) NOT NULL,   -- 'anime', 'game', 'relationship_goal'
    filter_value VARCHAR(100),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA DE TRADUCCIONES I18N DE CATEGORIAS
CREATE TABLE IF NOT EXISTS explore_category_translations (
    category_id UUID NOT NULL REFERENCES explore_categories(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    PRIMARY KEY (category_id, language_id)
);

-- 3. TABLA DE PREFERENCIAS POR USUARIO Y CATEGORIA
CREATE TABLE IF NOT EXISTS user_category_preferences (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES explore_categories(id) ON DELETE CASCADE,
    radius_km INT NOT NULL DEFAULT 40 CHECK (radius_km >= 10 AND radius_km <= 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_user_cat_prefs ON user_category_preferences(user_id, category_id);

-- 4. PRECARGA DE CATEGORIAS Y TRADUCCIONES (es, en, ja)
WITH inserted_categories AS (
    INSERT INTO explore_categories (code, section_group, icon_key, filter_type, filter_value, sort_order) VALUES
        -- Otaku & Anime
        ('anime_marathon', 'otaku', 'tv', 'anime', NULL, 1),
        ('cosplay_events', 'otaku', 'theater', 'anime', 'cosplay', 2),
        ('manga_lovers', 'otaku', 'book', 'anime', 'manga', 3),
        -- Videojuegos & Gaming
        ('gaming_coop', 'gaming', 'controller', 'game', 'coop', 1),
        ('esports_competitive', 'gaming', 'trophy', 'game', 'competitive', 2),
        ('rpg_fantasy', 'gaming', 'sword', 'game', 'rpg', 3),
        ('casual_gaming', 'gaming', 'coffee', 'game', 'casual', 4),
        -- Conexiones & Metas
        ('long_term_relationship', 'connections', 'rose', 'relationship_goal', 'long_term', 1),
        ('casual_dating', 'connections', 'cocktail', 'relationship_goal', 'casual', 2),
        ('new_friends', 'connections', 'puzzle', 'relationship_goal', 'friendship', 3)
    ON CONFLICT (code) DO UPDATE SET
        section_group = EXCLUDED.section_group,
        icon_key = EXCLUDED.icon_key,
        filter_type = EXCLUDED.filter_type,
        filter_value = EXCLUDED.filter_value,
        sort_order = EXCLUDED.sort_order
    RETURNING id, code
),
lang_es AS (SELECT id FROM supported_languages WHERE code = 'es'),
lang_en AS (SELECT id FROM supported_languages WHERE code = 'en'),
lang_ja AS (SELECT id FROM supported_languages WHERE code = 'ja')
INSERT INTO explore_category_translations (category_id, language_id, title, description)
SELECT c.id, l.id, t.title, t.description
FROM inserted_categories c
CROSS JOIN LATERAL (
    SELECT id, code FROM supported_languages WHERE code IN ('es', 'en', 'ja')
) l
CROSS JOIN LATERAL (
    SELECT
        CASE
            -- Spanish
            WHEN l.code = 'es' AND c.code = 'anime_marathon' THEN 'Maraton de series'
            WHEN l.code = 'es' AND c.code = 'cosplay_events' THEN 'Cosplay & Eventos'
            WHEN l.code = 'es' AND c.code = 'manga_lovers' THEN 'Manga & Lectura'
            WHEN l.code = 'es' AND c.code = 'gaming_coop' THEN 'Gamers & Co-op'
            WHEN l.code = 'es' AND c.code = 'esports_competitive' THEN 'Competitivo & E-Sports'
            WHEN l.code = 'es' AND c.code = 'rpg_fantasy' THEN 'RPG & Fantasia'
            WHEN l.code = 'es' AND c.code = 'casual_gaming' THEN 'Casual & Chill'
            WHEN l.code = 'es' AND c.code = 'long_term_relationship' THEN 'Relacion estable'
            WHEN l.code = 'es' AND c.code = 'casual_dating' THEN 'Noche de cita'
            WHEN l.code = 'es' AND c.code = 'new_friends' THEN 'Nuevas amistades'
            -- English
            WHEN l.code = 'en' AND c.code = 'anime_marathon' THEN 'Anime Marathon'
            WHEN l.code = 'en' AND c.code = 'cosplay_events' THEN 'Cosplay & Events'
            WHEN l.code = 'en' AND c.code = 'manga_lovers' THEN 'Manga & Reading'
            WHEN l.code = 'en' AND c.code = 'gaming_coop' THEN 'Gamers & Co-op'
            WHEN l.code = 'en' AND c.code = 'esports_competitive' THEN 'Competitive & Esports'
            WHEN l.code = 'en' AND c.code = 'rpg_fantasy' THEN 'RPG & Fantasy'
            WHEN l.code = 'en' AND c.code = 'casual_gaming' THEN 'Casual & Chill'
            WHEN l.code = 'en' AND c.code = 'long_term_relationship' THEN 'Long-term relationship'
            WHEN l.code = 'en' AND c.code = 'casual_dating' THEN 'Date night'
            WHEN l.code = 'en' AND c.code = 'new_friends' THEN 'New friendships'
            -- Japanese
            WHEN l.code = 'ja' AND c.code = 'anime_marathon' THEN 'アニメマラソン'
            WHEN l.code = 'ja' AND c.code = 'cosplay_events' THEN 'コスプレ＆イベント'
            WHEN l.code = 'ja' AND c.code = 'manga_lovers' THEN 'マンガ＆読書'
            WHEN l.code = 'ja' AND c.code = 'gaming_coop' THEN 'ゲーム＆協力プレイ'
            WHEN l.code = 'ja' AND c.code = 'esports_competitive' THEN '競技＆eスポーツ'
            WHEN l.code = 'ja' AND c.code = 'rpg_fantasy' THEN 'RPG＆ファンタジー'
            WHEN l.code = 'ja' AND c.code = 'casual_gaming' THEN 'カジュアルゲーム'
            WHEN l.code = 'ja' AND c.code = 'long_term_relationship' THEN '真剣な交際'
            WHEN l.code = 'ja' AND c.code = 'casual_dating' THEN 'デートナイト'
            WHEN l.code = 'ja' AND c.code = 'new_friends' THEN '新しい友達'
            ELSE c.code
        END AS title,
        CASE
            -- Spanish
            WHEN l.code = 'es' AND c.code = 'anime_marathon' THEN 'Encuentra gente para maratonear tus series y animes favoritos'
            WHEN l.code = 'es' AND c.code = 'cosplay_events' THEN 'Companeros para convenciones, cosplay y sesiones de fotos'
            WHEN l.code = 'es' AND c.code = 'manga_lovers' THEN 'Lectores de manga, novelas ligeras y comics'
            WHEN l.code = 'es' AND c.code = 'gaming_coop' THEN 'Tu duo ideal para juegos cooperativos y partidas multijugador'
            WHEN l.code = 'es' AND c.code = 'esports_competitive' THEN 'Sube de rango y compite al maximo nivel'
            WHEN l.code = 'es' AND c.code = 'rpg_fantasy' THEN 'Aventuras epicas, mundos abiertos e historias profundas'
            WHEN l.code = 'es' AND c.code = 'casual_gaming' THEN 'Jugar de forma relajada y pasar un buen rato'
            WHEN l.code = 'es' AND c.code = 'long_term_relationship' THEN 'Buscando una conexion duradera y autentica'
            WHEN l.code = 'es' AND c.code = 'casual_dating' THEN 'Planes divertidos y citas para conocerse sin presiones'
            WHEN l.code = 'es' AND c.code = 'new_friends' THEN 'Conoce gente afin y amplia tu grupo de amigos'
            -- English
            WHEN l.code = 'en' AND c.code = 'anime_marathon' THEN 'Find people to binge-watch your favorite anime and series'
            WHEN l.code = 'en' AND c.code = 'cosplay_events' THEN 'Partners for conventions, cosplay, and photo sessions'
            WHEN l.code = 'en' AND c.code = 'manga_lovers' THEN 'Manga readers, light novel enthusiasts, and comic fans'
            WHEN l.code = 'en' AND c.code = 'gaming_coop' THEN 'Your ideal duo partner for co-op games and multiplayer'
            WHEN l.code = 'en' AND c.code = 'esports_competitive' THEN 'Climb the ranks and compete at the highest level'
            WHEN l.code = 'en' AND c.code = 'rpg_fantasy' THEN 'Epic adventures, open worlds, and deep lore'
            WHEN l.code = 'en' AND c.code = 'casual_gaming' THEN 'Casual gaming sessions to unwind and have fun'
            WHEN l.code = 'en' AND c.code = 'long_term_relationship' THEN 'Looking for a lasting and authentic connection'
            WHEN l.code = 'en' AND c.code = 'casual_dating' THEN 'Fun dates and plans to meet without pressure'
            WHEN l.code = 'en' AND c.code = 'new_friends' THEN 'Meet like-minded people and expand your circle'
            -- Japanese
            WHEN l.code = 'ja' AND c.code = 'anime_marathon' THEN 'お気に入りのアニメやドラマを一緒に楽しもう'
            WHEN l.code = 'ja' AND c.code = 'cosplay_events' THEN 'イベントや撮影会に一緒に行く仲間を見つけよう'
            WHEN l.code = 'ja' AND c.code = 'manga_lovers' THEN 'マンガやラノベ好きと語り合おう'
            WHEN l.code = 'ja' AND c.code = 'gaming_coop' THEN '協力プレイやマルチプレイの最高の相方を探そう'
            WHEN l.code = 'ja' AND c.code = 'esports_competitive' THEN 'ランクマッチを共に戦う仲間と出会おう'
            WHEN l.code = 'ja' AND c.code = 'rpg_fantasy' THEN '壮大な世界観やRPGを語り合える仲間と繋がろう'
            WHEN l.code = 'ja' AND c.code = 'casual_gaming' THEN 'のんびり楽しくゲームを遊ぼう'
            WHEN l.code = 'ja' AND c.code = 'long_term_relationship' THEN '真剣で末永いパートナーを求めて'
            WHEN l.code = 'ja' AND c.code = 'casual_dating' THEN '気兼ねなく楽しめるデートや出会い'
            WHEN l.code = 'ja' AND c.code = 'new_friends' THEN '趣味を共有できる新しい友達を作ろう'
            ELSE 'MiraiLink Explore Category'
        END AS description
) t
ON CONFLICT (category_id, language_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description;

COMMIT;
