BEGIN;

-- 1. SOPORTE DE IDIOMAS
INSERT INTO supported_languages (code, english_name) VALUES
    ('es', 'Spanish'),
    ('en', 'English'),
    ('ja', 'Japanese')
ON CONFLICT (code) DO UPDATE SET english_name = EXCLUDED.english_name;

-- 2. METAS DE RELACION (RELATIONSHIP GOALS)
CREATE TABLE IF NOT EXISTS relationship_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS relationship_goal_translations (
    goal_id UUID NOT NULL REFERENCES relationship_goals(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    PRIMARY KEY (goal_id, language_id)
);

-- 3. OPCIONES DE FAMILIA (FAMILY OPTIONS)
CREATE TABLE IF NOT EXISTS family_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_option_translations (
    option_id UUID NOT NULL REFERENCES family_options(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    PRIMARY KEY (option_id, language_id)
);

-- 4. RELIGIONES (RELIGIONS)
CREATE TABLE IF NOT EXISTS religions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS religion_translations (
    religion_id UUID NOT NULL REFERENCES religions(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    PRIMARY KEY (religion_id, language_id)
);

-- 5. SIGNOS DEL ZODIACO (ZODIAC SIGNS)
CREATE TABLE IF NOT EXISTS zodiac_signs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zodiac_sign_translations (
    sign_id UUID NOT NULL REFERENCES zodiac_signs(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    PRIMARY KEY (sign_id, language_id)
);

-- 6. POSTURA POLITICA (POLITICAL STANCES)
CREATE TABLE IF NOT EXISTS political_stances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS political_stance_translations (
    stance_id UUID NOT NULL REFERENCES political_stances(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    PRIMARY KEY (stance_id, language_id)
);

-- 7. HABITO DE FUMAR (SMOKING HABITS)
CREATE TABLE IF NOT EXISTS smoking_habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS smoking_habit_translations (
    habit_id UUID NOT NULL REFERENCES smoking_habits(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    PRIMARY KEY (habit_id, language_id)
);

-- 8. HABITO DE BEBER (DRINKING HABITS)
CREATE TABLE IF NOT EXISTS drinking_habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drinking_habit_translations (
    habit_id UUID NOT NULL REFERENCES drinking_habits(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    PRIMARY KEY (habit_id, language_id)
);

-- 9. ORIENTACION SEXUAL (SEXUAL ORIENTATIONS)
CREATE TABLE IF NOT EXISTS sexual_orientations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sexual_orientation_translations (
    orientation_id UUID NOT NULL REFERENCES sexual_orientations(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    PRIMARY KEY (orientation_id, language_id)
);

-- 10. NIVEL DE ESTUDIOS (EDUCATION LEVELS)
CREATE TABLE IF NOT EXISTS education_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS education_level_translations (
    level_id UUID NOT NULL REFERENCES education_levels(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    PRIMARY KEY (level_id, language_id)
);

-- 11. IDIOMAS HABLADOS (SPOKEN LANGUAGES)
CREATE TABLE IF NOT EXISTS spoken_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spoken_language_translations (
    language_item_id UUID NOT NULL REFERENCES spoken_languages(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    PRIMARY KEY (language_item_id, language_id)
);

-- 12. PREGUNTAS GAMER / CURIOSIDADES (PROFILE PROMPTS)
CREATE TABLE IF NOT EXISTS profile_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_prompt_translations (
    prompt_id UUID NOT NULL REFERENCES profile_prompts(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    PRIMARY KEY (prompt_id, language_id)
);

-- 13. TABLAS INTERMEDIAS PARA RELACIONES DE USUARIO
CREATE TABLE IF NOT EXISTS user_relationship_goals (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES relationship_goals(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, goal_id)
);

CREATE TABLE IF NOT EXISTS user_family_options (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES family_options(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, option_id)
);

CREATE TABLE IF NOT EXISTS user_spoken_languages (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES spoken_languages(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, language_id)
);

CREATE TABLE IF NOT EXISTS user_profile_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt_id UUID NOT NULL REFERENCES profile_prompts(id) ON DELETE CASCADE,
    answer VARCHAR(300) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, prompt_id)
);

-- 14. COLUMNAS DIRECTAS EN TABLA USERS
ALTER TABLE users ADD COLUMN IF NOT EXISTS profession VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS religion_id UUID REFERENCES religions(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS zodiac_sign_id UUID REFERENCES zodiac_signs(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS political_stance_id UUID REFERENCES political_stances(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS smoking_habit_id UUID REFERENCES smoking_habits(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS drinking_habit_id UUID REFERENCES drinking_habits(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sexual_orientation_id UUID REFERENCES sexual_orientations(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS education_level_id UUID REFERENCES education_levels(id) ON DELETE SET NULL;

-- INDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_likes_to_user_created ON likes(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));

-- 15. SEEDING DE CATALOGOS CON LOCALIZACION (es, en, ja)

-- Helper temporal para insertar catalogo y traducciones
CREATE OR REPLACE FUNCTION _seed_catalog(
    p_table TEXT,
    p_id_col TEXT,
    p_trans_table TEXT,
    p_code TEXT,
    p_es TEXT,
    p_en TEXT,
    p_ja TEXT
) RETURNS VOID AS $$
DECLARE
    v_id UUID;
    v_lang_es UUID;
    v_lang_en UUID;
    v_lang_ja UUID;
BEGIN
    SELECT id INTO v_lang_es FROM supported_languages WHERE code = 'es';
    SELECT id INTO v_lang_en FROM supported_languages WHERE code = 'en';
    SELECT id INTO v_lang_ja FROM supported_languages WHERE code = 'ja';

    EXECUTE format('INSERT INTO %I (code) VALUES ($1) ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code RETURNING id', p_table)
    INTO v_id
    USING p_code;

    EXECUTE format('INSERT INTO %I (%I, language_id, label) VALUES ($1, $2, $3) ON CONFLICT (%I, language_id) DO UPDATE SET label = EXCLUDED.label', p_trans_table, p_id_col, p_id_col)
    USING v_id, v_lang_es, p_es;

    EXECUTE format('INSERT INTO %I (%I, language_id, label) VALUES ($1, $2, $3) ON CONFLICT (%I, language_id) DO UPDATE SET label = EXCLUDED.label', p_trans_table, p_id_col, p_id_col)
    USING v_id, v_lang_en, p_en;

    EXECUTE format('INSERT INTO %I (%I, language_id, label) VALUES ($1, $2, $3) ON CONFLICT (%I, language_id) DO UPDATE SET label = EXCLUDED.label', p_trans_table, p_id_col, p_id_col)
    USING v_id, v_lang_ja, p_ja;
END;
$$ LANGUAGE plpgsql;

-- RELATIONSHIP GOALS
SELECT _seed_catalog('relationship_goals', 'goal_id', 'relationship_goal_translations', 'friends', 'Hacer amigos', 'Make friends', '友達作り');
SELECT _seed_catalog('relationship_goals', 'goal_id', 'relationship_goal_translations', 'relationship', 'Tener una relacion', 'Long-term relationship', '恋人探し');
SELECT _seed_catalog('relationship_goals', 'goal_id', 'relationship_goal_translations', 'marriage', 'Casarme / Compromiso serio', 'Marriage', '結婚相手探し');
SELECT _seed_catalog('relationship_goals', 'goal_id', 'relationship_goal_translations', 'casual', 'Algo casual', 'Casual dating', '気軽な出会い');
SELECT _seed_catalog('relationship_goals', 'goal_id', 'relationship_goal_translations', 'not_sure', 'No lo tengo claro aun', 'Still figuring it out', 'まだ決めていない');

-- FAMILY OPTIONS
SELECT _seed_catalog('family_options', 'option_id', 'family_option_translations', 'have_children', 'Ya tengo hijos', 'I have children', '子供がいる');
SELECT _seed_catalog('family_options', 'option_id', 'family_option_translations', 'no_children', 'No tengo hijos', 'I do not have children', '子供はいない');
SELECT _seed_catalog('family_options', 'option_id', 'family_option_translations', 'want_children', 'Quiero hijos', 'I want children', '子供が欲しい');
SELECT _seed_catalog('family_options', 'option_id', 'family_option_translations', 'not_sure_children', 'No se si quiero hijos', 'Not sure about children', '子供が欲しいかわからない');
SELECT _seed_catalog('family_options', 'option_id', 'family_option_translations', 'dont_want_children', 'No quiero hijos', 'I do not want children', '子供は欲しくない');

-- RELIGIONS
SELECT _seed_catalog('religions', 'religion_id', 'religion_translations', 'agnostic', 'Agnosticismo', 'Agnostic', '不可知論');
SELECT _seed_catalog('religions', 'religion_id', 'religion_translations', 'atheist', 'Ateismo', 'Atheist', '無神論');
SELECT _seed_catalog('religions', 'religion_id', 'religion_translations', 'christian', 'Cristianismo', 'Christian', 'キリスト教');
SELECT _seed_catalog('religions', 'religion_id', 'religion_translations', 'catholic', 'Catolicismo', 'Catholic', 'カトリック');
SELECT _seed_catalog('religions', 'religion_id', 'religion_translations', 'buddhist', 'Budismo', 'Buddhist', '仏教');
SELECT _seed_catalog('religions', 'religion_id', 'religion_translations', 'hindu', 'Hinduismo', 'Hindu', 'ヒンドゥー教');
SELECT _seed_catalog('religions', 'religion_id', 'religion_translations', 'muslim', 'Islam', 'Muslim', 'イスラム教');
SELECT _seed_catalog('religions', 'religion_id', 'religion_translations', 'jewish', 'Judaismo', 'Jewish', 'ユダヤ教');
SELECT _seed_catalog('religions', 'religion_id', 'religion_translations', 'shinto', 'Sintoismo', 'Shinto', '神道');
SELECT _seed_catalog('religions', 'religion_id', 'religion_translations', 'spiritual', 'Espiritual sin religion', 'Spiritual', 'スピリチュアル');
SELECT _seed_catalog('religions', 'religion_id', 'religion_translations', 'other', 'Otra', 'Other', 'その他');

-- ZODIAC SIGNS
SELECT _seed_catalog('zodiac_signs', 'sign_id', 'zodiac_sign_translations', 'aries', 'Aries', 'Aries', '牡羊座');
SELECT _seed_catalog('zodiac_signs', 'sign_id', 'zodiac_sign_translations', 'taurus', 'Tauro', 'Taurus', '牡牛座');
SELECT _seed_catalog('zodiac_signs', 'sign_id', 'zodiac_sign_translations', 'gemini', 'Geminis', 'Gemini', '双子座');
SELECT _seed_catalog('zodiac_signs', 'sign_id', 'zodiac_sign_translations', 'cancer', 'Cancer', 'Cancer', '蟹座');
SELECT _seed_catalog('zodiac_signs', 'sign_id', 'zodiac_sign_translations', 'leo', 'Leo', 'Leo', '獅子座');
SELECT _seed_catalog('zodiac_signs', 'sign_id', 'zodiac_sign_translations', 'virgo', 'Virgo', 'Virgo', '乙女座');
SELECT _seed_catalog('zodiac_signs', 'sign_id', 'zodiac_sign_translations', 'libra', 'Libra', 'Libra', '天秤座');
SELECT _seed_catalog('zodiac_signs', 'sign_id', 'zodiac_sign_translations', 'scorpio', 'Escorpio', 'Scorpio', '蠍座');
SELECT _seed_catalog('zodiac_signs', 'sign_id', 'zodiac_sign_translations', 'sagittarius', 'Sagitario', 'Sagittarius', '射手座');
SELECT _seed_catalog('zodiac_signs', 'sign_id', 'zodiac_sign_translations', 'capricorn', 'Capricornio', 'Capricorn', '山羊座');
SELECT _seed_catalog('zodiac_signs', 'sign_id', 'zodiac_sign_translations', 'aquarius', 'Acuario', 'Aquarius', '水瓶座');
SELECT _seed_catalog('zodiac_signs', 'sign_id', 'zodiac_sign_translations', 'pisces', 'Piscis', 'Pisces', '魚座');

-- POLITICAL STANCES
SELECT _seed_catalog('political_stances', 'stance_id', 'political_stance_translations', 'apolitical', 'Apolitico/a', 'Apolitical', 'ノンポリ');
SELECT _seed_catalog('political_stances', 'stance_id', 'political_stance_translations', 'moderate', 'Centro / Moderado', 'Moderate', '中道');
SELECT _seed_catalog('political_stances', 'stance_id', 'political_stance_translations', 'left', 'Izquierda / Progresista', 'Liberal / Left', 'リベラル / 左派');
SELECT _seed_catalog('political_stances', 'stance_id', 'political_stance_translations', 'right', 'Derecha / Conservador', 'Conservative / Right', '保守 / 右派');
SELECT _seed_catalog('political_stances', 'stance_id', 'political_stance_translations', 'not_sure', 'No lo tengo claro / Prefiero no decir', 'Not sure / Prefer not to say', '決めていない / 回答しない');

-- SMOKING HABITS
SELECT _seed_catalog('smoking_habits', 'habit_id', 'smoking_habit_translations', 'no', 'No fumo', 'Non-smoker', '吸わない');
SELECT _seed_catalog('smoking_habits', 'habit_id', 'smoking_habit_translations', 'occasionally', 'De vez en cuando / Social', 'Occasionally / Socially', 'たまに吸う');
SELECT _seed_catalog('smoking_habits', 'habit_id', 'smoking_habit_translations', 'regularly', 'Fumador habitual', 'Regular smoker', '日常的に吸う');
SELECT _seed_catalog('smoking_habits', 'habit_id', 'smoking_habit_translations', 'trying_to_quit', 'Intentando dejarlo', 'Trying to quit', '禁煙中');

-- DRINKING HABITS
SELECT _seed_catalog('drinking_habits', 'habit_id', 'drinking_habit_translations', 'no', 'No bebo', 'Non-drinker', '飲まない');
SELECT _seed_catalog('drinking_habits', 'habit_id', 'drinking_habit_translations', 'occasionally', 'Ocasional / Social', 'Social drinker', 'たまに飲む');
SELECT _seed_catalog('drinking_habits', 'habit_id', 'drinking_habit_translations', 'regularly', 'Frecuente', 'Regularly', 'よく飲む');

-- SEXUAL ORIENTATIONS
SELECT _seed_catalog('sexual_orientations', 'orientation_id', 'sexual_orientation_translations', 'heterosexual', 'Heterosexual', 'Heterosexual', '異性愛者');
SELECT _seed_catalog('sexual_orientations', 'orientation_id', 'sexual_orientation_translations', 'homosexual', 'Homosexual / Gay / Lesbiana', 'Homosexual / Gay / Lesbian', '同性愛者');
SELECT _seed_catalog('sexual_orientations', 'orientation_id', 'sexual_orientation_translations', 'bisexual', 'Bisexual', 'Bisexual', '両性愛者');
SELECT _seed_catalog('sexual_orientations', 'orientation_id', 'sexual_orientation_translations', 'pansexual', 'Pansexual', 'Pansexual', '全性愛者');
SELECT _seed_catalog('sexual_orientations', 'orientation_id', 'sexual_orientation_translations', 'asexual', 'Asexual', 'Asexual', '無性愛者');
SELECT _seed_catalog('sexual_orientations', 'orientation_id', 'sexual_orientation_translations', 'queer', 'Queer / Otra', 'Queer / Other', 'クィア / その他');
SELECT _seed_catalog('sexual_orientations', 'orientation_id', 'sexual_orientation_translations', 'questioning', 'Cuestionandome / Prefiero no decir', 'Questioning / Prefer not to say', '探求中 / 回答しない');

-- EDUCATION LEVELS
SELECT _seed_catalog('education_levels', 'level_id', 'education_level_translations', 'primary', 'Educacion primaria', 'Primary education', '初等教育');
SELECT _seed_catalog('education_levels', 'level_id', 'education_level_translations', 'secondary', 'Educacion secundaria / Bachillerato', 'Secondary / High school', '中等教育 / 高校');
SELECT _seed_catalog('education_levels', 'level_id', 'education_level_translations', 'vocational', 'Formacion profesional / FP', 'Vocational training', '専門学校 / 職業訓練');
SELECT _seed_catalog('education_levels', 'level_id', 'education_level_translations', 'bachelor', 'Grado universitario / Licenciatura', 'Bachelor degree', '大学卒業 / 学士');
SELECT _seed_catalog('education_levels', 'level_id', 'education_level_translations', 'master', 'Master / Posgrado', 'Master degree', '大学院修士');
SELECT _seed_catalog('education_levels', 'level_id', 'education_level_translations', 'doctorate', 'Doctorado / PhD', 'Doctorate / PhD', '博士号');

-- SPOKEN LANGUAGES
SELECT _seed_catalog('spoken_languages', 'language_item_id', 'spoken_language_translations', 'es', 'Español', 'Spanish', 'スペイン語');
SELECT _seed_catalog('spoken_languages', 'language_item_id', 'spoken_language_translations', 'en', 'Ingles', 'English', '英語');
SELECT _seed_catalog('spoken_languages', 'language_item_id', 'spoken_language_translations', 'ja', 'Japones', 'Japanese', '日本語');
SELECT _seed_catalog('spoken_languages', 'language_item_id', 'spoken_language_translations', 'fr', 'Frances', 'French', 'フランス語');
SELECT _seed_catalog('spoken_languages', 'language_item_id', 'spoken_language_translations', 'de', 'Aleman', 'German', 'ドイツ語');
SELECT _seed_catalog('spoken_languages', 'language_item_id', 'spoken_language_translations', 'it', 'Italiano', 'Italian', 'イタリア語');
SELECT _seed_catalog('spoken_languages', 'language_item_id', 'spoken_language_translations', 'pt', 'Portugues', 'Portuguese', 'ポルトガル語');
SELECT _seed_catalog('spoken_languages', 'language_item_id', 'spoken_language_translations', 'zh', 'Chino', 'Chinese', '中国語');
SELECT _seed_catalog('spoken_languages', 'language_item_id', 'spoken_language_translations', 'ko', 'Coreano', 'Korean', '韓国語');

-- 16. SEEDING DE LAS 8 PREGUNTAS GAMER (PROFILE PROMPTS)
CREATE OR REPLACE FUNCTION _seed_prompt(
    p_code TEXT,
    p_es TEXT,
    p_en TEXT,
    p_ja TEXT
) RETURNS VOID AS $$
DECLARE
    v_id UUID;
    v_lang_es UUID;
    v_lang_en UUID;
    v_lang_ja UUID;
BEGIN
    SELECT id INTO v_lang_es FROM supported_languages WHERE code = 'es';
    SELECT id INTO v_lang_en FROM supported_languages WHERE code = 'en';
    SELECT id INTO v_lang_ja FROM supported_languages WHERE code = 'ja';

    INSERT INTO profile_prompts (code) VALUES (p_code)
    ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
    RETURNING id INTO v_id;

    INSERT INTO profile_prompt_translations (prompt_id, language_id, question)
    VALUES (v_id, v_lang_es, p_es)
    ON CONFLICT (prompt_id, language_id) DO UPDATE SET question = EXCLUDED.question;

    INSERT INTO profile_prompt_translations (prompt_id, language_id, question)
    VALUES (v_id, v_lang_en, p_en)
    ON CONFLICT (prompt_id, language_id) DO UPDATE SET question = EXCLUDED.question;

    INSERT INTO profile_prompt_translations (prompt_id, language_id, question)
    VALUES (v_id, v_lang_ja, p_ja)
    ON CONFLICT (prompt_id, language_id) DO UPDATE SET question = EXCLUDED.question;
END;
$$ LANGUAGE plpgsql;

SELECT _seed_prompt('favorite_videogame', 'Cual es el videojuego que marco tu vida?', 'Which videogame changed your life?', 'あなたの人生を変えたゲームは？');
SELECT _seed_prompt('party_role', 'Tu clase o rol favorito en una party (Tank, DPS, Healer...)', 'Your favorite party role (Tank, DPS, Healer...)', 'パーティーでの得意なロール（タンク、DPS、ヒーラー…）');
SELECT _seed_prompt('final_boss', 'El jefe final o reto que aun no logras superar', 'The final boss or challenge you have yet to beat', 'まだ倒せていないラスボスや挑戦');
SELECT _seed_prompt('comfort_anime', 'Tu anime o saga de confort', 'Your comfort anime or series', '心安らぐお気に入りのアニメやシリーズ');
SELECT _seed_prompt('unpopular_opinion', 'Una opinion impopular que defiendes sobre anime o videojuegos', 'An unpopular opinion you hold about anime or games', 'アニメやゲームに関する自分だけのこだわりや逆張り意見');
SELECT _seed_prompt('dream_job', 'El trabajo o proyecto de tus sueños', 'Your dream job or project', '夢の職業やプロジェクト');
SELECT _seed_prompt('how_people_describe_me', 'La gente suele describirme como...', 'People usually describe me as...', '周りの人からよく言われる性格は…');
SELECT _seed_prompt('coop_partner_trait', 'Lo que mas valoro en un compañero de cooperativo (o de vida)', 'What I value most in a co-op partner (or life partner)', '協力プレイ（または人生のパートナー）で一番大切にすること');

-- Limpiar funciones auxiliares
DROP FUNCTION IF EXISTS _seed_catalog(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS _seed_prompt(TEXT, TEXT, TEXT, TEXT);

COMMIT;
