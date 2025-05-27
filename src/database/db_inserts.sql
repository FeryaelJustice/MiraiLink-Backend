-- USERS
INSERT INTO
  users (
    id,
    username,
    email,
    phone_number,
    password_hash,
    auth_provider,
    is_verified,
    bio,
    gender,
    birthdate
  )
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'kirito',
    'kirito@example.com',
    '+34611111222',
    '$2b$12$NrC2mdYFz0cygzpaylM0C.7k7bJLsOQ5Xqb2OPcHijrTZ8RRnenFG',
    'email',
    TRUE,
    'Fan del mundo SAO.',
    'male',
    '1997-07-10'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'asuna',
    'asuna@example.com',
    '+34633334444',
    '$2b$12$L3xPu/DlbRupIUWfZwhKFOWWDiCDp.9Ud0AI7HLtCJ0vu4GLvkn92',
    'google',
    TRUE,
    'Me encantan los MMOs.',
    'female',
    '1998-03-15'
  );

-- ANIMES
INSERT INTO
  animes (id, name, description, image_url)
VALUES
  (
    '33333333-3333-3333-3333-333333333333',
    'Attack on Titan',
    'Titans everywhere',
    'https://img.com/aot.jpg'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Sword Art Online',
    'MMORPG virtual world',
    'https://img.com/sao.jpg'
  );

-- GAMES
INSERT INTO
  games (id, name, description, image_url)
VALUES
  (
    '55555555-5555-5555-5555-555555555555',
    'Genshin Impact',
    'Open world RPG',
    'https://img.com/genshin.jpg'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'Elden Ring',
    'Souls-like RPG',
    'https://img.com/eldenring.jpg'
  );

-- USER ANIME INTERESTS
INSERT INTO
  user_anime_interests (user_id, anime_id)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444'
  ),
  -- kirito → SAO
  (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  );

-- asuna → AOT
-- USER GAME INTERESTS
INSERT INTO
  user_game_interests (user_id, game_id)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '66666666-6666-6666-6666-666666666666'
  ),
  -- kirito → Elden Ring
  (
    '22222222-2222-2222-2222-222222222222',
    '55555555-5555-5555-5555-555555555555'
  );

-- asuna → Genshin
-- LIKES
INSERT INTO
  likes (id, from_user_id, to_user_id)
VALUES
  (
    '77777777-7777-7777-7777-777777777777',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
  );

-- MATCHES
INSERT INTO
  matches (id, user1_id, user2_id)
VALUES
  (
    '88888888-8888-8888-8888-888888888888',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
  );

-- MESSAGES
INSERT INTO
  messages (id, match_id, sender_id, text, sent_at)
VALUES
  (
    '99999999-9999-9999-9999-999999999999',
    '88888888-8888-8888-8888-888888888888',
    '11111111-1111-1111-1111-111111111111',
    'Hola Asuna, ¿jugamos juntos?',
    NOW()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '88888888-8888-8888-8888-888888888888',
    '22222222-2222-2222-2222-222222222222',
    '¡Claro Kirito!',
    NOW() + INTERVAL '1 minute'
  );

-- USER PHOTOS
INSERT INTO
  user_photos (user_id, url, position)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'https://loremflickr.com/320/240/dog',
    1
  );

INSERT INTO
  user_photos (user_id, url, position)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'https://loremflickr.com/320/240/paris',
    2
  );