
-- 13. UPDATE DEPOSIT REQUESTS (Order Details)

-- Add 'details' column for storing order items (JSON)
-- Add 'amount_expected' to compare with 'amount_declared' if needed
-- We use TEXT for JSON compatibility with older MySQL versions if JSON type is strict

ALTER TABLE deposit_requests
ADD COLUMN details JSON,
ADD COLUMN amount_expected DECIMAL(15, 2);

-- Also ensure we have a status history or logs if needed, but existing logs should suffice.
