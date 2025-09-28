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
  ('Genshin Impact','Open world RPG','https://img.com/genshin.jpg'),
  ('Elden Ring','Souls-like RPG','https://img.com/eldenring.jpg'),
  ('Minecraft','Sandbox survival','https://img.com/minecraft.jpg'),
  ('Fortnite','Battle royale & builder','https://img.com/fortnite.jpg'),
  ('League of Legends','MOBA 5v5','https://img.com/league-of-legends.jpg'),
  ('Roblox','UGC games platform','https://img.com/roblox.jpg'),
  ('VALORANT','Tactical hero shooter','https://img.com/valorant.jpg'),
  ('Counter-Strike 2','Tactical FPS','https://img.com/counter-strike-2.jpg'),
  ('Grand Theft Auto V','Open world action','https://img.com/gta-v.jpg'),
  ('Call of Duty: Warzone','Battle royale FPS','https://img.com/cod-warzone.jpg'),
  ('PUBG: Battlegrounds','Battle royale shooter','https://img.com/pubg.jpg'),
  ('Apex Legends','Hero battle royale','https://img.com/apex-legends.jpg'),
  ('Overwatch 2','Hero shooter 5v5','https://img.com/overwatch-2.jpg'),
  ('Dota 2','MOBA 5v5','https://img.com/dota-2.jpg'),
  ('Rocket League','Car soccer','https://img.com/rocket-league.jpg'),
  ('EA Sports FC 24','Football/soccer sim','https://img.com/ea-sports-fc-24.jpg'),
  ('The Legend of Zelda: Tears of the Kingdom','Open world adventure','https://img.com/zelda-tears-of-the-kingdom.jpg'),
  ('Animal Crossing: New Horizons','Life sim','https://img.com/animal-crossing-new-horizons.jpg'),
  ('Mario Kart 8 Deluxe','Arcade racing','https://img.com/mario-kart-8-deluxe.jpg'),
  ('Super Smash Bros. Ultimate','Platform fighter','https://img.com/smash-bros-ultimate.jpg'),
  ('Among Us','Social deduction','https://img.com/among-us.jpg'),
  ('Candy Crush Saga','Match-3 puzzle','https://img.com/candy-crush-saga.jpg'),
  ('Clash of Clans','Mobile strategy','https://img.com/clash-of-clans.jpg'),
  ('Clash Royale','Real-time card battler','https://img.com/clash-royale.jpg'),
  ('Pokémon GO','AR location RPG','https://img.com/pokemon-go.jpg'),
  ('The Witcher 3: Wild Hunt','Open world RPG','https://img.com/witcher-3.jpg'),
  ('Red Dead Redemption 2','Open world western','https://img.com/rdr2.jpg'),
  ('The Elder Scrolls V: Skyrim','Open world RPG','https://img.com/skyrim.jpg'),
  ('Cyberpunk 2077','Open world RPG','https://img.com/cyberpunk-2077.jpg'),
  ('Assassin''s Creed Valhalla','Action RPG','https://img.com/ac-valhalla.jpg'),
  ('God of War Ragnarök','Action adventure','https://img.com/god-of-war-ragnarok.jpg'),
  ('Horizon Forbidden West','Action RPG','https://img.com/horizon-forbidden-west.jpg'),
  ('The Last of Us Part II','Action adventure','https://img.com/the-last-of-us-part-ii.jpg'),
  ('Forza Horizon 5','Open world racing','https://img.com/forza-horizon-5.jpg'),
  ('Destiny 2','Online looter shooter','https://img.com/destiny-2.jpg'),
  ('Tom Clancy''s Rainbow Six Siege','Tactical FPS','https://img.com/rainbow-six-siege.jpg'),
  ('The Sims 4','Life simulation','https://img.com/the-sims-4.jpg'),
  ('Monster Hunter: World','Action hunting RPG','https://img.com/monster-hunter-world.jpg'),
  ('Splatoon 3','Team shooter','https://img.com/splatoon-3.jpg'),
  ('Diablo IV','Action RPG','https://img.com/diablo-iv.jpg'),
  ('Path of Exile','ARPG online','https://img.com/path-of-exile.jpg'),
  ('Helldivers 2','Co-op shooter','https://img.com/helldivers-2.jpg'),
  ('Palworld','Creature survival','https://img.com/palworld.jpg'),
  ('Baldur''s Gate 3','CRPG','https://img.com/baldurs-gate-3.jpg'),
  ('Stardew Valley','Farming RPG','https://img.com/stardew-valley.jpg'),
  ('Terraria','2D sandbox','https://img.com/terraria.jpg'),
  ('Fall Guys','Party battle royale','https://img.com/fall-guys.jpg'),
  ('World of Warcraft','MMORPG','https://img.com/world-of-warcraft.jpg'),
  ('Final Fantasy XIV Online','MMORPG','https://img.com/final-fantasy-xiv.jpg');
  -- CALL OF DUTY GAMES
INSERT INTO games (name, description, image_url) VALUES
  ('Call of Duty','WWII FPS','https://img.com/cod1.jpg'),
  ('Call of Duty 2','WWII FPS sequel','https://img.com/cod2.jpg'),
  ('Call of Duty 3','WWII FPS console','https://img.com/cod3.jpg'),
  ('Call of Duty 4: Modern Warfare','Modern military FPS','https://img.com/cod4-mw.jpg'),
  ('Call of Duty: World at War','WWII Pacific front','https://img.com/cod-waw.jpg'),
  ('Call of Duty: Modern Warfare 2','Modern FPS sequel','https://img.com/cod-mw2.jpg'),
  ('Call of Duty: Black Ops','Cold War FPS','https://img.com/cod-bo1.jpg'),
  ('Call of Duty: Modern Warfare 3','FPS trilogy finale','https://img.com/cod-mw3-old.jpg'),
  ('Call of Duty: Black Ops II','Near-future FPS','https://img.com/cod-bo2.jpg'),
  ('Call of Duty: Ghosts','FPS with extinction mode','https://img.com/cod-ghosts.jpg'),
  ('Call of Duty: Advanced Warfare','Futuristic FPS','https://img.com/cod-advanced-warfare.jpg'),
  ('Call of Duty: Black Ops III','Futuristic FPS','https://img.com/cod-bo3.jpg'),
  ('Call of Duty: Infinite Warfare','Space FPS','https://img.com/cod-infinite.jpg'),
  ('Call of Duty: WWII','WWII reboot FPS','https://img.com/cod-wwii.jpg'),
  ('Call of Duty: Black Ops 4','Multiplayer FPS','https://img.com/cod-bo4.jpg'),
  ('Call of Duty: Modern Warfare','Reboot FPS','https://img.com/cod-mw-reboot.jpg'),
  ('Call of Duty: Black Ops Cold War','Cold War reboot FPS','https://img.com/cod-bocw.jpg'),
  ('Call of Duty: Vanguard','WWII global front','https://img.com/cod-vanguard.jpg'),
  ('Call of Duty: Modern Warfare II','Sequel reboot FPS','https://img.com/cod-mw2-reboot.jpg'),
  ('Call of Duty: Black Ops 6','Upcoming Black Ops','https://img.com/cod-bo6.jpg');
-- BATTLEFIELD GAMES
INSERT INTO games (name, description, image_url) VALUES
  ('Battlefield 1942','WWII multiplayer FPS','https://img.com/bf1942.jpg'),
  ('Battlefield Vietnam','Vietnam war FPS','https://img.com/bf-vietnam.jpg'),
  ('Battlefield 2','Modern combat FPS','https://img.com/bf2.jpg'),
  ('Battlefield 2142','Futuristic war FPS','https://img.com/bf2142.jpg'),
  ('Battlefield: Bad Company','Humorous campaign FPS','https://img.com/bf-bc1.jpg'),
  ('Battlefield: Bad Company 2','Modern warfare FPS','https://img.com/bf-bc2.jpg'),
  ('Battlefield 3','Modern FPS','https://img.com/bf3.jpg'),
  ('Battlefield 4','Modern FPS sequel','https://img.com/bf4.jpg'),
  ('Battlefield Hardline','Cops vs criminals FPS','https://img.com/bf-hardline.jpg'),
  ('Battlefield 1','WWI FPS','https://img.com/bf1.jpg'),
  ('Battlefield V','WWII FPS','https://img.com/bf5.jpg'),
  ('Battlefield 2042','Near-future FPS','https://img.com/bf2042.jpg');
  -- KINGDOM HEARTS SERIES
INSERT INTO games (name, description, image_url) VALUES
  ('Kingdom Hearts', 'Primer juego: Sora viaja junto a Donald y Goofy para detener a los Heartless.', 'https://img.com/kh1.jpg'),
  ('Kingdom Hearts: Chain of Memories', 'Secuela directa en formato cartas, conecta KH1 y KH2.', 'https://img.com/khcom.jpg'),
  ('Kingdom Hearts II', 'Sora, Donald y Goofy enfrentan a la Organización XIII.', 'https://img.com/kh2.jpg'),
  ('Kingdom Hearts 358/2 Days', 'Historia de Roxas y la Organización XIII.', 'https://img.com/kh358.jpg'),
  ('Kingdom Hearts Birth by Sleep', 'Precuela con Terra, Aqua y Ventus.', 'https://img.com/khbbs.jpg'),
  ('Kingdom Hearts Re:coded', 'Historia digital de Sora revisitando recuerdos.', 'https://img.com/khrecoded.jpg'),
  ('Kingdom Hearts 3D: Dream Drop Distance', 'Sora y Riku entrenan para el examen de maestro.', 'https://img.com/khdreamdrop.jpg'),
  ('Kingdom Hearts 0.2 Birth by Sleep -A Fragmentary Passage-', 'Pequeña secuela de BBS protagonizada por Aqua.', 'https://img.com/kh02bbs.jpg'),
  ('Kingdom Hearts χ (Chi)', 'Juego online precuela sobre la Guerra de las Llaves Espada.', 'https://img.com/khchi.jpg'),
  ('Kingdom Hearts Unchained χ / Union χ[Cross]', 'Versión móvil del Chi con historia expandida.', 'https://img.com/khunion.jpg'),
  ('Kingdom Hearts Dark Road', 'Historia de juventud de Xehanort.', 'https://img.com/khdarkroad.jpg'),
  ('Kingdom Hearts III', 'Sora enfrenta la batalla final contra Xehanort.', 'https://img.com/kh3.jpg'),
  ('Kingdom Hearts: Melody of Memory', 'Juego musical que repasa toda la saga.', 'https://img.com/khmom.jpg'),
  ('Kingdom Hearts HD 1.5 Remix', 'Colección con KH1 Final Mix, Re:Chain of Memories y 358/2 Days (vídeos).', 'https://img.com/kh15.jpg'),
  ('Kingdom Hearts HD 2.5 Remix', 'Colección con KH2 Final Mix, Birth by Sleep y Re:coded (vídeos).', 'https://img.com/kh25.jpg'),
  ('Kingdom Hearts HD 2.8 Final Chapter Prologue', 'Incluye Dream Drop Distance HD, 0.2 Fragmentary Passage y Back Cover χ.', 'https://img.com/kh28.jpg'),
  ('Kingdom Hearts All-in-One Package', 'Compilación definitiva con casi todos los juegos hasta KH3.', 'https://img.com/khallinone.jpg');

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
  -- TOP ANIMES EXTRA
INSERT INTO animes (name, description, image_url) VALUES
  ('Akira', 'Cyberpunk clásico con poderes psíquicos en Neo-Tokyo.', 'https://img.com/akira.jpg'),
  ('Anohana: The Flower We Saw That Day', 'Amigos de infancia enfrentan la pérdida de una amiga.', 'https://img.com/anohana.jpg'),
  ('Assassination Classroom', 'Clase intenta asesinar a su maestro alienígena antes de que destruya la Tierra.', 'https://img.com/assassinationclassroom.jpg'),
  ('Black Clover', 'Huérfano sin magia aspira a convertirse en Rey Mago.', 'https://img.com/blackclover.jpg'),
  ('Black Lagoon', 'Mercenarios sobreviven en trabajos mortales del bajo mundo.', 'https://img.com/blacklagoon.jpg'),
  ('Blue Exorcist', 'Hijo de Satán entrena para ser exorcista.', 'https://img.com/blueexorcist.jpg'),
  ('Blue Lock', 'Proyecto que busca al delantero definitivo para Japón.', 'https://img.com/bluelock.jpg'),
  ('Boruto: Naruto Next Generations', 'El hijo de Naruto enfrenta nuevos retos ninja.', 'https://img.com/boruto.jpg'),
  ('Chainsaw Man', 'Cazador de demonios fusionado con su mascota motosierra.', 'https://img.com/chainsawman.jpg'),
  ('Charlotte', 'Adolescentes con poderes especiales perseguidos por organizaciones.', 'https://img.com/charlotte.jpg'),
  ('Chobits', 'Joven encuentra una androide con apariencia humana.', 'https://img.com/chobits.jpg'),
  ('Darling in the FranXX', 'Pilotos adolescentes luchan en mechas contra monstruos.', 'https://img.com/darlinginthefranxx.jpg'),
  ('Deadman Wonderland', 'Prisión mortal donde los reclusos luchan por sobrevivir.', 'https://img.com/deadmanwonderland.jpg'),
  ('Devilman Crybaby', 'Adolescente obtiene poderes demoníacos para luchar contra demonios.', 'https://img.com/devilmancrybaby.jpg'),
  ('Dr. Stone', 'Científico reconstruye la civilización tras milenios petrificada.', 'https://img.com/drstone.jpg'),
  ('Ergo Proxy', 'Misterio cyberpunk en una ciudad futurista.', 'https://img.com/ergoproxy.jpg'),
  ('Fairy Tail', 'Gremio de magos vive aventuras llenas de amistad y batallas.', 'https://img.com/fairytail.jpg'),
  ('Fire Force', 'Bomberos con poderes luchan contra humanos en llamas.', 'https://img.com/fireforce.jpg'),
  ('Golden Kamuy', 'Exsoldado busca tesoro escondido en Hokkaido.', 'https://img.com/goldenkamuy.jpg'),
  ('Grisaia no Kajitsu', 'Academia misteriosa con estudiantes problemáticos.', 'https://img.com/grisaia.jpg'),
  ('Great Teacher Onizuka', 'Exdelincuente se convierte en maestro carismático.', 'https://img.com/gto.jpg'),
  ('Hajime no Ippo', 'Historia de superación de un joven boxeador.', 'https://img.com/hajimenoippo.jpg'),
  ('Highschool of the Dead', 'Estudiantes sobreviven en un apocalipsis zombi.', 'https://img.com/highschooldead.jpg'),
  ('K-On!', 'Chicas de instituto forman una banda de música ligera.', 'https://img.com/kon.jpg'),
  ('Kakegurui', 'Academia donde todo se decide mediante apuestas.', 'https://img.com/kakegurui.jpg'),
  ('Kaname no Maid Sama!', 'Presidenta de consejo estudiantil trabaja en un maid café.', 'https://img.com/maidsama.jpg'),
  ('KonoSuba: God’s Blessing on this Wonderful World!', 'Comedia isekai con un grupo desastroso de aventureros.', 'https://img.com/konosuba.jpg'),
  ('Koe No Katachi: A Silent Voice!', 'Historia conmovedora sobre la amistad, el acoso escolar y la superación personal.', 'https://img.com/koenokatachi.jpg'),
  ('Made in Abyss', 'Niña y robot exploran un abismo lleno de misterios y peligros.', 'https://img.com/madeinabyss.jpg'),
  ('March Comes in Like a Lion', 'Joven jugador de shogi lucha con la depresión.', 'https://img.com/marchlion.jpg'),
  ('Mushoku Tensei: Jobless Reincarnation', 'Pionero del isekai sobre un hombre reencarnado en un mundo mágico.', 'https://img.com/mushokutensei.jpg'),
  ('Nanatsu no Taizai', 'Caballeros legendarios luchan contra fuerzas demoníacas.', 'https://img.com/nanatsunotaizai.jpg'),
  ('Neon Genesis Evangelion: End of Evangelion', 'Película que concluye la historia original de Evangelion.', 'https://img.com/endofeva.jpg'),
  ('Nichijou', 'Comedia absurda de la vida diaria.', 'https://img.com/nichijou.jpg'),
  ('Oregairu (My Teen Romantic Comedy SNAFU)', 'Cínico estudiante se une a un club de voluntariado.', 'https://img.com/oregairu.jpg'),
  ('Ouran High School Host Club', 'Chica pobre entra en un club de chicos ricos.', 'https://img.com/ouran.jpg'),
  ('Planetes', 'Recolectores de basura espacial en un futuro cercano.', 'https://img.com/planetes.jpg'),
  ('Ranma ½', 'Joven artista marcial con maldición de género.', 'https://img.com/ranma.jpg'),
  ('Rurouni Kenshin', 'Samurái errante busca redención en la era Meiji.', 'https://img.com/rurounikenshin.jpg'),
  ('School Rumble', 'Comedia romántica estudiantil llena de enredos.', 'https://img.com/schoolrumble.jpg'),
  ('Shaman King', 'Niño médium busca ser el rey chamán.', 'https://img.com/shamanking.jpg'),
  ('Spirited Away', 'Niña atrapada en un mundo de espíritus.', 'https://img.com/spiritedaway.jpg'),
  ('The Garden of Sinners', 'Misteriosos asesinatos investigados con poderes sobrenaturales.', 'https://img.com/gardenofsinners.jpg'),
  ('The Melancholy of Haruhi Suzumiya', 'Excéntrica chica altera la realidad sin saberlo.', 'https://img.com/haruhi.jpg'),
  ('Trigun Stampede', 'Reinterpretación moderna del clásico Trigun.', 'https://img.com/trigunstampede.jpg'),
  ('Your Lie in April', 'Pianista traumatizado encuentra inspiración en una violinista.', 'https://img.com/yourlieinapril.jpg'),
  ('Your Name (Kimi no Na wa)', 'Dos jóvenes intercambian cuerpos a través del tiempo.', 'https://img.com/yourname.jpg'),
  ('Zom 100: Bucket List of the Dead', 'Oficinista disfruta la vida en un apocalipsis zombi.', 'https://img.com/zom100.jpg'),
  ('Erased (Live-action alt)', 'Nueva adaptación que revive la trama del manga.', 'https://img.com/erasedlive.jpg');

-- APP VERSIONS
INSERT INTO app_versions(platform, min_supported_version_code, latest_version_code, message, play_store_url)
VALUES ('android', 8, 8, 'Hay una versión nueva con mejoras importantes.', 'https://play.google.com/store/apps/details?id=com.feryaeljustice.mirailink');