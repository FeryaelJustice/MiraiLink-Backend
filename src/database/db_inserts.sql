-- USERS
INSERT INTO users (
    id, username, email, phone_number, password_hash, auth_provider,
    is_verified, bio, gender, birthdate
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

-- GAMES
INSERT INTO games (name, description, image_url) VALUES
  (
    'Genshin Impact',
    'Open world RPG',
    'https://img.com/genshin.jpg'
  ),
  (
    'Elden Ring',
    'Souls-like RPG',
    'https://img.com/eldenring.jpg'
  );

-- LIKES
INSERT INTO likes (id, from_user_id, to_user_id) VALUES
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

-- MATCHES
INSERT INTO matches (id, user1_id, user2_id) VALUES
  ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

-- CHATS (uno privado por el match)
INSERT INTO chats (id, type, created_by) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'private', '11111111-1111-1111-1111-111111111111');

-- CHAT MEMBERS
INSERT INTO chat_members (chat_id, user_id, role) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'member'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'member');

-- MESSAGES
INSERT INTO messages (id, chat_id, sender_id, text, sent_at) VALUES
  (
    '99999999-9999-9999-9999-999999999999',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111111',
    'Hola Asuna, ¿jugamos juntos?',
    NOW()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '22222222-2222-2222-2222-222222222222',
    '¡Claro Kirito!',
    NOW() + INTERVAL '1 minute'
  );

-- USER PHOTOS
INSERT INTO user_photos (user_id, url, position) VALUES
  ('11111111-1111-1111-1111-111111111111', 'https://loremflickr.com/320/240/dog', 1),
  ('11111111-1111-1111-1111-111111111111', 'https://loremflickr.com/320/240/paris', 2);

-- ANIMES
INSERT INTO animes (name, description, image_url) VALUES
  ('Attack on Titan', 'Dark fantasy about humanity fighting giant humanoid Titans.', 'https://img.com/attackontitan.jpg'),
  ('Berserk', 'Cursed swordsman battles demons in a dark and brutal world.', 'https://img.com/berserk.jpg'),
  ('Bleach', 'A teenager gains Shinigami powers to protect the living from evil spirits.', 'https://img.com/bleach.jpg'),
  ('Clannad', 'Romantic drama about school life, family, and emotional growth.', 'https://img.com/clannad.jpg'),
  ('Code Geass', 'Political rebellion and mecha battles powered by the Geass ability.', 'https://img.com/codegeass.jpg'),
  ('Cowboy Bebop', 'Space western following bounty hunters across the solar system.', 'https://img.com/cowboybebop.jpg'),
  ('Death Note', 'Psychological thriller where a notebook kills those whose names are written.', 'https://img.com/deathnote.jpg'),
  ('Demon Slayer: Kimetsu no Yaiba', 'Young swordsman fights demons to save his sister.', 'https://img.com/demonslayerkimetsunoyaiba.jpg'),
  ('Dragon Ball Z', 'Warriors protect Earth from increasingly powerful foes.', 'https://img.com/dragonballz.jpg'),
  ('Erased', 'Time travel used to prevent murders and change tragic events.', 'https://img.com/erased.jpg'),
  ('Evangelion', 'Teens pilot mechas to save humanity from mysterious creatures.', 'https://img.com/evangelion.jpg'),
  ('Fate/Zero', 'Mages and legendary heroes battle for the Holy Grail.', 'https://img.com/fatezero.jpg'),
  ('Fruits Basket', 'Girl discovers a cursed family that transforms into zodiac animals.', 'https://img.com/fruitsbasket.jpg'),
  ('Fullmetal Alchemist: Brotherhood', 'Alchemist brothers seek the Philosophers Stone to restore their bodies.', 'https://img.com/fullmetalalchemistbrotherhood.jpg'),
  ('Gintama', 'Samurai parody full of absurd comedy in alien-invaded Japan.', 'https://img.com/gintama.jpg'),
  ('Haikyuu!!', 'High school volleyball team strives for national glory.', 'https://img.com/haikyuu.jpg'),
  ('Hellsing', 'Organization fights vampires with the help of a powerful undead.', 'https://img.com/hellsing.jpg'),
  ('Higurashi no Naku Koro ni', 'Mysteries and murders cycle in a rural village.', 'https://img.com/higurashinonakukoroni.jpg'),
  ('Hunter × Hunter', 'Boy seeks to become a Hunter and find his missing father.', 'https://img.com/hunterhunter.jpg'),
  ('Inuyasha', 'Girl travels to feudal Japan and teams up with a half-demon.', 'https://img.com/inuyasha.jpg'),
  ('Jujutsu Kaisen', 'Sorcerers fight curses to protect humanity.', 'https://img.com/jujutsukaisen.jpg'),
  ('Kaguya-sama: Love is War', 'Two brilliant students engage in a war of love confessions.', 'https://img.com/kaguyasamaloveiswar.jpg'),
  ('Kamisama Kiss', 'Girl becomes a shrine deity and interacts with spirits.', 'https://img.com/kamisamakiss.jpg'),
  ('Kill la Kill', 'Student searches for her fathers killer at a tyrannical academy.', 'https://img.com/killlakill.jpg'),
  ('Kuroko no Basket', 'Basketball team faces off against the legendary Generation of Miracles.', 'https://img.com/kurokonobasket.jpg'),
  ('Mob Psycho 100', 'Psychic boy tries to live a normal life while controlling his power.', 'https://img.com/mobpsycho100.jpg'),
  ('Monogatari Series', 'Student helps girls with supernatural and existential problems.', 'https://img.com/monogatariseries.jpg'),
  ('My Hero Academia', 'Students train to become heroes in a world full of superpowers.', 'https://img.com/myheroacademia.jpg'),
  ('Naruto', 'Outcast ninja dreams of becoming his villages leader.', 'https://img.com/naruto.jpg'),
  ('Neon Genesis Evangelion', 'Teens pilot mechas to battle mysterious beings called angels.', 'https://img.com/neongenesisevangelion.jpg'),
  ('No Game No Life', 'Genius siblings are transported to a world ruled by games.', 'https://img.com/nogamenolife.jpg'),
  ('Noragami', 'Minor god gains recognition by helping humans and spirits.', 'https://img.com/noragami.jpg'),
  ('One Piece', 'Pirates journey to find the ultimate treasure in a world of adventure.', 'https://img.com/onepiece.jpg'),
  ('One Punch Man', 'Invincible hero defeats enemies with a single punch.', 'https://img.com/onepunchman.jpg'),
  ('Parasyte', 'Teen shares his body with a parasitic alien.', 'https://img.com/parasyte.jpg'),
  ('Psycho-Pass', 'Futuristic society controls crime using psychological analysis.', 'https://img.com/psychopass.jpg'),
  ('Re:Zero', 'Young man revives repeatedly to prevent tragedy in a fantasy world.', 'https://img.com/rezero.jpg'),
  ('Samurai Champloo', 'Three travelers roam Edo Japan in search of the samurai who smells of sunflowers.', 'https://img.com/samuraichamploo.jpg'),
  ('Serial Experiments Lain', 'Girl dives into a virtual network blurring digital and real life.', 'https://img.com/serialexperimentslain.jpg'),
  ('Shingeki no Kyojin', 'Humanity fights back against giant Titans behind protective walls.', 'https://img.com/shingekinokyojin.jpg'),
  ('Soul Eater', 'Academy students hunt evil souls with human weapon partners.', 'https://img.com/souleater.jpg'),
  ('Steins;Gate', 'Group discovers time travel and alters history through emails.', 'https://img.com/steinsgate.jpg'),
  ('Sword Art Online', 'Gamers are trapped in a deadly virtual reality MMORPG.', 'https://img.com/swordartonline.jpg'),
  ('The Promised Neverland', 'Orphanage children uncover a dark secret and plan their escape.', 'https://img.com/thepromisedneverland.jpg'),
  ('Tokyo Ghoul', 'Half-ghoul teen struggles to adapt and survive.', 'https://img.com/tokyoghoul.jpg'),
  ('Tokyo Revengers', 'Man travels back in time to change fate and save loved ones.', 'https://img.com/tokyorevengers.jpg'),
  ('Toradora!', 'Romantic comedy between two opposite-personality students.', 'https://img.com/toradora.jpg'),
  ('Trigun', 'Peaceful outlaw avoids violence while being chased for his reputation.', 'https://img.com/trigun.jpg'),
  ('Vinland Saga', 'Young Viking seeks revenge and eventually purpose.', 'https://img.com/vinlandsaga.jpg'),
  ('Violet Evergarden', 'Ex-soldier learns emotions by writing heartfelt letters for others.', 'https://img.com/violetevergarden.jpg');