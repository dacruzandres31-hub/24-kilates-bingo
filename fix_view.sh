#!/bin/bash
# Recreate v_starter_config view with correct columns

sudo mysql bingo_24k << 'EOF'
DROP VIEW IF EXISTS v_starter_config;

CREATE VIEW v_starter_config AS
SELECT 
  src.id,
  src.prizes_linea,
  src.ticket_room_linea,
  src.prizes_bingo,
  src.ticket_room_bingo,
  src.updated_by,
  src.updated_at,
  processor.username AS updated_by_name
FROM starter_room_config src
LEFT JOIN users processor ON src.updated_by = processor.id
ORDER BY src.id DESC
LIMIT 1;

SELECT * FROM v_starter_config;
EOF
