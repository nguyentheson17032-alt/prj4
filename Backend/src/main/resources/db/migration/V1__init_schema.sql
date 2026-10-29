-- ===================================================
-- V1: Initial Database Schema for PlayerDuo Platform
-- ===================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone_number VARCHAR(50),
    avatar_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    bio TEXT,
    gender VARCHAR(20),
    date_of_birth DATE,
    address VARCHAR(255),
    coin BIGINT DEFAULT 0,
    is_online BOOLEAN DEFAULT FALSE,
    is_enabled BOOLEAN DEFAULT TRUE,
    is_account_non_locked BOOLEAN DEFAULT TRUE,
    device_token VARCHAR(500),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS games (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    image_url VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_players (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    game_id BIGINT REFERENCES games(id) ON DELETE CASCADE,
    username VARCHAR(255),
    rank VARCHAR(100),
    role VARCHAR(100),
    server VARCHAR(100),
    price_per_hour NUMERIC(19, 2),
    description TEXT,
    status VARCHAR(50) DEFAULT 'AVAILABLE',
    rating DOUBLE PRECISION,
    total_games INTEGER DEFAULT 0,
    win_rate INTEGER DEFAULT 0,
    avatar_url VARCHAR(500),
    mic_available BOOLEAN DEFAULT TRUE,
    voice_url VARCHAR(500),
    hired_by_id BIGINT REFERENCES users(id),
    hire_date TIMESTAMP WITHOUT TIME ZONE,
    return_date TIMESTAMP WITHOUT TIME ZONE,
    hours_hired INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    player_id BIGINT REFERENCES users(id),
    game_player_id BIGINT REFERENCES game_players(id),
    coin BIGINT,
    original_amount BIGINT,
    discount_rate DOUBLE PRECISION,
    platform_fee BIGINT,
    player_received BIGINT,
    currency VARCHAR(20) DEFAULT 'COIN',
    status VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50),
    type VARCHAR(50),
    transaction_id VARCHAR(255),
    vnp_txn_ref VARCHAR(255),
    description TEXT,
    start_time TIMESTAMP WITHOUT TIME ZONE,
    end_time TIMESTAMP WITHOUT TIME ZONE,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    renter_id BIGINT REFERENCES users(id),
    player_id BIGINT REFERENCES game_players(id),
    start_time TIMESTAMP WITHOUT TIME ZONE,
    end_time TIMESTAMP WITHOUT TIME ZONE,
    price BIGINT,
    status VARCHAR(50),
    discount_rate DOUBLE PRECISION DEFAULT 0.15,
    platform_fee BIGINT,
    player_received BIGINT,
    payout_status VARCHAR(50) DEFAULT 'PENDING',
    payout_released_at TIMESTAMP WITHOUT TIME ZONE,
    payment_id BIGINT REFERENCES payments(id)
);

CREATE TABLE IF NOT EXISTS revenues (
    id BIGSERIAL PRIMARY KEY,
    amount BIGINT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payment_id BIGINT REFERENCES payments(id)
);

CREATE TABLE IF NOT EXISTS player_reviews (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    game_player_id BIGINT NOT NULL REFERENCES game_players(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL,
    comment VARCHAR(1000),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    id BIGSERIAL PRIMARY KEY,
    reporter_id BIGINT REFERENCES users(id),
    reported_player_id BIGINT REFERENCES game_players(id),
    order_id BIGINT REFERENCES orders(id),
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    video VARCHAR(500),
    evidence_url VARCHAR(500),
    image_urls VARCHAR(500),
    status VARCHAR(50) DEFAULT 'PENDING',
    resolution TEXT,
    refund_percentage INTEGER,
    refund_amount BIGINT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(100),
    action_url VARCHAR(500),
    order_id BIGINT,
    is_read BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS moments (
    id BIGSERIAL PRIMARY KEY,
    game_player_id BIGINT NOT NULL REFERENCES game_players(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    content TEXT,
    like_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_bans (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    banned_by_id BIGINT NOT NULL REFERENCES users(id),
    unbanned_by_id BIGINT REFERENCES users(id),
    reason TEXT,
    unban_reason TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    banned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ban_expires_at TIMESTAMP WITHOUT TIME ZONE,
    unbanned_at TIMESTAMP WITHOUT TIME ZONE
);

