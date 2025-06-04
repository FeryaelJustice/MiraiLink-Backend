-- ENUMS
CREATE TYPE auth_provider AS ENUM ('email', 'phone', 'google');

-- USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR UNIQUE,
    phone_number VARCHAR UNIQUE,
    password_hash TEXT,
    auth_provider auth_provider NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    two_fa_enabled BOOLEAN DEFAULT FALSE,
    two_fa_secret TEXT,
    bio TEXT,
    gender VARCHAR(20),
    birthdate DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- STATELESS JWT FOR INVALIDATING BEFORE TIME
CREATE TABLE token_blacklist (
    token TEXT PRIMARY KEY,
    invalidated_at TIMESTAMP DEFAULT NOW()
);

-- VERIFICATION TOKENS
CREATE TABLE verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR NOT NULL,
    type VARCHAR(10) CHECK (type IN ('email', 'sms')),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- PASSWORD RESET TOKENS
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- PHOTOS
CREATE TABLE user_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    position INT CHECK (
        position BETWEEN 1
        AND 4
    )
);

-- MASTER TABLE OF ANIMES
CREATE TABLE animes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT
);

-- MASTER TABLE OF GAMES
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT
);

-- USER SELECTED ANIME INTERESTS
CREATE TABLE user_anime_interests (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    anime_id UUID REFERENCES animes(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, anime_id)
);

-- USER SELECTED GAME INTERESTS
CREATE TABLE user_game_interests (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, game_id)
);

-- LIKES
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (from_user_id, to_user_id)
);

-- DISLIKES (O IGNORES)
CREATE TABLE dislikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (from_user_id, to_user_id)
);

-- MATCHES
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    seen_by_user1 BOOLEAN DEFAULT false,
    seen_by_user2 BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user1_id, user2_id)
);

-- CHATS
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT CHECK (type IN ('private', 'group')) NOT NULL,
    name TEXT,
    -- solo si es grupo
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- CHAT MEMBERS
-- Para evitar duplicados de miembros en el mismo chat, se utiliza una tabla intermedia llamada chat_members.
CREATE TABLE chat_members (
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    last_read_at TIMESTAMP DEFAULT NOW(),
    -- Evita duplicados de miembros en el mismo chat
    PRIMARY KEY (chat_id, user_id)
);

-- MESSAGES
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    text TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW()
);

-- PUSH NOTIFICATIONS
CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT CHECK (platform IN ('android', 'ios', 'web')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- REPORTS
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_by UUID REFERENCES users(id),
    reported_user UUID REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_likes_from_user ON likes(from_user_id);

CREATE INDEX idx_likes_to_user ON likes(to_user_id);

CREATE INDEX idx_matches_user1 ON matches(user1_id);

CREATE INDEX idx_matches_user2 ON matches(user2_id);

-- Para las notificacion de tienes un nuevo match
ALTER TABLE
    matches
ADD
    COLUMN seen_by_user1 BOOLEAN DEFAULT FALSE,
ADD
    COLUMN seen_by_user2 BOOLEAN DEFAULT FALSE;

ALTER TABLE
    chats DROP CONSTRAINT chats_created_by_fkey,
ADD
    CONSTRAINT chats_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE
SET
    NULL;

ALTER TABLE
    reports DROP CONSTRAINT reports_reported_by_fkey,
ADD
    CONSTRAINT reports_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE
SET
    NULL;

ALTER TABLE
    reports DROP CONSTRAINT reports_reported_user_fkey,
ADD
    CONSTRAINT reports_reported_user_fkey FOREIGN KEY (reported_user) REFERENCES users(id) ON DELETE
SET
    NULL;