
CREATE TABLE IF NOT EXISTS payment_accounts (
    id SERIAL PRIMARY KEY,
    alias VARCHAR(100) NOT NULL UNIQUE,
    cbu VARCHAR(100),
    bank_name VARCHAR(100) DEFAULT 'MercadoPago',
    holder_name VARCHAR(100) NOT NULL,
    daily_limit DECIMAL(15, 2) DEFAULT 500000.00,
    current_daily_volume DECIMAL(15, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    priority_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deposit_requests (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    account_id INT REFERENCES payment_accounts(id), -- Nullable in case account is deleted
    amount_declared DECIMAL(15, 2) NOT NULL,
    proof_image_url VARCHAR(255), -- URL a Cloudinary o Local
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    reviewed_by INT REFERENCES users(id),
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices
-- Note: IF NOT EXISTS for indexes might not be supported in all MySQL versions
-- The migration script should handle "Duplicate key name" errors gracefully
CREATE INDEX idx_payment_active ON payment_accounts(is_active, current_daily_volume);
CREATE INDEX idx_deposit_status ON deposit_requests(status);
CREATE INDEX idx_deposit_user ON deposit_requests(user_id);
