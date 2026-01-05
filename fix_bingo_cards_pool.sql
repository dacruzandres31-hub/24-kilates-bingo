-- Fix bingo_cards_pool table structure
ALTER TABLE bingo_cards_pool ADD COLUMN card_serial VARCHAR(50) NULL;
ALTER TABLE bingo_cards_pool ADD COLUMN room VARCHAR(20) NULL;
ALTER TABLE bingo_cards_pool ADD COLUMN grid_data JSON NULL;

-- Update card_serial from serial if exists
UPDATE bingo_cards_pool SET card_serial = serial WHERE card_serial IS NULL AND serial IS NOT NULL;

-- Create indexes
CREATE INDEX idx_bcp_room ON bingo_cards_pool(room);
CREATE INDEX idx_bcp_card_serial ON bingo_cards_pool(card_serial);

SELECT 'bingo_cards_pool fixed' as resultado;
