-- Cápsula de Cristal v2: Rediseño bilateral (4 puntos, gestión estricta de turnos e histórico localizado)
-- 1. Actualizar restricción de progreso en capsule_sessions a 0..4
ALTER TABLE capsule_sessions DROP CONSTRAINT IF EXISTS capsule_sessions_progress_check;
UPDATE capsule_sessions SET progress = LEAST(4, GREATEST(0, ROUND(progress / 2.0)::int)) WHERE progress > 4;
ALTER TABLE capsule_sessions ADD CONSTRAINT capsule_sessions_progress_check CHECK (progress BETWEEN 0 AND 4);

-- 2. Adaptar capsule_missions para soportar preguntas personalizadas y referencia a idioma
ALTER TABLE capsule_missions ALTER COLUMN question_id DROP NOT NULL;
ALTER TABLE capsule_missions ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE capsule_missions ADD COLUMN IF NOT EXISTS custom_text TEXT;
ALTER TABLE capsule_missions ADD COLUMN IF NOT EXISTS language_id UUID REFERENCES supported_languages(id) ON DELETE SET NULL;

-- 3. Adaptar capsule_answers para almacenar texto de respuesta y referencia a idioma sin depender de messages
ALTER TABLE capsule_answers ALTER COLUMN message_id DROP NOT NULL;
ALTER TABLE capsule_answers ADD COLUMN IF NOT EXISTS answer_text TEXT;
ALTER TABLE capsule_answers ADD COLUMN IF NOT EXISTS language_id UUID REFERENCES supported_languages(id) ON DELETE SET NULL;

-- 4. Adaptar capsule_question_translations para vincular por language_id (FK a supported_languages) y admitir cualquier idioma
ALTER TABLE capsule_question_translations DROP CONSTRAINT IF EXISTS capsule_question_translations_language_check;
ALTER TABLE capsule_question_translations ADD COLUMN IF NOT EXISTS language_id UUID REFERENCES supported_languages(id) ON DELETE CASCADE;

UPDATE capsule_question_translations cqt
SET language_id = sl.id
FROM supported_languages sl
WHERE sl.code = cqt.language AND cqt.language_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_capsule_question_trans_lang ON capsule_question_translations(question_id, language_id) WHERE language_id IS NOT NULL;
