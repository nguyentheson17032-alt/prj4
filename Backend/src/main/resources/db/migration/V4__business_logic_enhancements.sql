-- ===================================================
-- V4: Business Logic Enhancements (Nhóm 2)
-- 1. Pending order auto-expiry & cancellation policy
-- 2. Dispute resolution & partial refund support
-- 3. Dynamic commission & VIP tiers
-- 4. KYC & withdrawal limit controls
-- 5. Player working hours & availability
-- ===================================================

-- Orders table enhancements
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_fee BIGINT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(500);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by_id BIGINT;

-- Game Players table enhancements (Working hours & availability)
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS work_start_time VARCHAR(10) DEFAULT '00:00';
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS work_end_time VARCHAR(10) DEFAULT '23:59';
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS working_days VARCHAR(150) DEFAULT 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,SUNDAY';
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS accepting_orders BOOLEAN DEFAULT TRUE;
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS commission_rate DOUBLE PRECISION;

-- Users table enhancements (VIP tier, custom commission, KYC verification)
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_tier VARCHAR(20) DEFAULT 'STANDARD';
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_commission_rate DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'UNVERIFIED';
ALTER TABLE users ADD COLUMN IF NOT EXISTS citizen_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_card_front_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_card_back_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_rejection_reason VARCHAR(500);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);
CREATE INDEX IF NOT EXISTS idx_game_players_accepting ON game_players(accepting_orders);

