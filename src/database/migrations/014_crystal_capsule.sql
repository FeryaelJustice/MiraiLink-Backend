-- Cápsula de Cristal: migración aditiva, sin borrar interacciones.
ALTER TABLE user_search_preferences ADD COLUMN IF NOT EXISTS discovery_mode TEXT NOT NULL DEFAULT 'classic' CHECK (discovery_mode IN ('classic','capsule'));
ALTER TABLE likes ADD COLUMN IF NOT EXISTS discovery_mode TEXT NOT NULL DEFAULT 'classic' CHECK (discovery_mode IN ('classic','capsule'));
ALTER TABLE dislikes ADD COLUMN IF NOT EXISTS discovery_mode TEXT NOT NULL DEFAULT 'classic' CHECK (discovery_mode IN ('classic','capsule'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_message_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS messages_client_id ON messages(chat_id,sender_id,client_message_id) WHERE client_message_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS capsule_sessions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
 chat_id UUID REFERENCES chats(id) ON DELETE SET NULL, status TEXT NOT NULL CHECK(status IN ('active','paused','left','cancelled','revealed')),
 progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 8), revision INTEGER NOT NULL DEFAULT 0,
 rules_version INTEGER NOT NULL DEFAULT 1, snapshot JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user1_id,user2_id), CHECK(user1_id < user2_id)
);
CREATE TABLE IF NOT EXISTS capsule_participants (
 capsule_id UUID NOT NULL REFERENCES capsule_sessions(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), paused BOOLEAN NOT NULL DEFAULT FALSE, resume_accepted BOOLEAN NOT NULL DEFAULT FALSE,
 PRIMARY KEY(capsule_id,user_id)
);
CREATE TABLE IF NOT EXISTS capsule_questions (id TEXT PRIMARY KEY, category TEXT NOT NULL, catalog_version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS capsule_question_translations (question_id TEXT REFERENCES capsule_questions(id) ON DELETE CASCADE, language TEXT CHECK(language IN ('es','en')), text TEXT NOT NULL, PRIMARY KEY(question_id,language));
CREATE TABLE IF NOT EXISTS capsule_missions (id UUID PRIMARY KEY, capsule_id UUID NOT NULL REFERENCES capsule_sessions(id) ON DELETE CASCADE, question_id TEXT NOT NULL REFERENCES capsule_questions(id), completed BOOLEAN NOT NULL DEFAULT FALSE, skipped BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS capsule_answers (mission_id UUID REFERENCES capsule_missions(id) ON DELETE CASCADE, user_id UUID REFERENCES users(id) ON DELETE CASCADE, message_id UUID REFERENCES messages(id) ON DELETE CASCADE, PRIMARY KEY(mission_id,user_id));
CREATE TABLE IF NOT EXISTS capsule_actions (capsule_id UUID REFERENCES capsule_sessions(id) ON DELETE CASCADE, actor_id UUID REFERENCES users(id) ON DELETE CASCADE, action_id UUID NOT NULL, response JSONB NOT NULL, PRIMARY KEY(capsule_id,actor_id,action_id));
CREATE TABLE IF NOT EXISTS capsule_events (id BIGSERIAL PRIMARY KEY, capsule_id UUID NOT NULL REFERENCES capsule_sessions(id) ON DELETE CASCADE, revision INTEGER NOT NULL, type TEXT NOT NULL, level INTEGER NOT NULL, category TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(capsule_id,revision,type));
CREATE INDEX IF NOT EXISTS capsule_sessions_user2 ON capsule_sessions(user2_id);
