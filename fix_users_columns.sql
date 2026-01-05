-- Add missing columns for user blocking feature
ALTER TABLE users ADD COLUMN is_blocked TINYINT(1) DEFAULT 0;
ALTER TABLE users ADD COLUMN block_reason VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN referral_code VARCHAR(10) DEFAULT NULL;
