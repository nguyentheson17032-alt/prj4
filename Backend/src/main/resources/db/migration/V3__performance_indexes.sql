-- ===================================================
-- V3: Add performance indexes for high-throughput queries
-- ===================================================

-- Orders indexes: frequently filtered by status, endTime, payoutStatus, and user
CREATE INDEX IF NOT EXISTS idx_orders_status_endtime ON orders(status, end_time);
CREATE INDEX IF NOT EXISTS idx_orders_status_payout ON orders(status, payout_status);
CREATE INDEX IF NOT EXISTS idx_orders_renter_id ON orders(renter_id);
CREATE INDEX IF NOT EXISTS idx_orders_player_id ON orders(player_id);
CREATE INDEX IF NOT EXISTS idx_orders_start_time ON orders(start_time);
CREATE INDEX IF NOT EXISTS idx_orders_upcoming_reminder ON orders(status, upcoming_reminder_sent, start_time);
CREATE INDEX IF NOT EXISTS idx_orders_ending_reminder ON orders(status, ending_reminder_sent, end_time);

-- Payments indexes: filtered by type, status, user, and created_at
CREATE INDEX IF NOT EXISTS idx_payments_type_created ON payments(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_player_id ON payments(player_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Player Reviews indexes: fast lookup by order and player
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON player_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_game_player_id ON player_reviews(game_player_id);

-- Reports indexes: fast lookup by order
CREATE INDEX IF NOT EXISTS idx_reports_order_id ON reports(order_id);

-- Notifications indexes: user unread notifications and chronological display
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- User Bans indexes: expired bans processing and active ban checks
CREATE INDEX IF NOT EXISTS idx_user_bans_user_status ON user_bans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_bans_expires_at ON user_bans(ban_expires_at);

-- Revenues indexes: aggregations by date and payment lookup
CREATE INDEX IF NOT EXISTS idx_revenues_created_at ON revenues(created_at);
CREATE INDEX IF NOT EXISTS idx_revenues_payment_id ON revenues(payment_id);

-- Game Players indexes: filtering by user and availability status
CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_game_players_status ON game_players(status);

