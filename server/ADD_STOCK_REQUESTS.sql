
ALTER TABLE deposit_requests ADD COLUMN request_type VARCHAR(50) DEFAULT 'player_deposit';
ALTER TABLE deposit_requests ADD COLUMN target_user_id INT DEFAULT NULL;
ALTER TABLE deposit_requests ADD CONSTRAINT fk_target_user FOREIGN KEY (target_user_id) REFERENCES users(id);
