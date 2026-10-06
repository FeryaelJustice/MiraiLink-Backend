BEGIN;
CREATE FUNCTION affinity_match_acceptance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r affinity_requests%ROWTYPE; chat UUID;
BEGIN
    SELECT * INTO r FROM affinity_requests WHERE LEAST(from_user_id,to_user_id)=NEW.user1_id AND GREATEST(from_user_id,to_user_id)=NEW.user2_id AND state='pending' AND expires_at>NOW() FOR UPDATE;
    IF r.id IS NULL THEN RETURN NEW; END IF;
    IF EXISTS(SELECT 1 FROM user_blocks WHERE (user_id=r.from_user_id AND target_id=r.to_user_id) OR (user_id=r.to_user_id AND target_id=r.from_user_id)) THEN RETURN NEW; END IF;
    SELECT c.id INTO chat FROM chats c JOIN chat_members a ON a.chat_id=c.id AND a.user_id=r.from_user_id JOIN chat_members b ON b.chat_id=c.id AND b.user_id=r.to_user_id WHERE c.type='private' LIMIT 1;
    IF chat IS NULL THEN
        INSERT INTO chats(type,created_by,origin) VALUES('private',r.from_user_id,'affinity') RETURNING id INTO chat;
        INSERT INTO chat_members(chat_id,user_id) VALUES(chat,r.from_user_id),(chat,r.to_user_id);
    END IF;
    INSERT INTO messages(chat_id,sender_id,text,sent_at,affinity_request_id) VALUES(chat,r.from_user_id,r.text,r.created_at,r.id) ON CONFLICT(affinity_request_id) DO NOTHING;
    UPDATE affinity_requests SET state='accepted',chat_id=chat WHERE id=r.id;
    INSERT INTO affinity_outbox(user_id,type,resource_id) VALUES(r.from_user_id,'affinity_accepted',r.id) ON CONFLICT DO NOTHING;
    RETURN NEW;
END $$;
CREATE TRIGGER affinity_accept_on_match AFTER INSERT ON matches FOR EACH ROW EXECUTE FUNCTION affinity_match_acceptance();
COMMIT;
