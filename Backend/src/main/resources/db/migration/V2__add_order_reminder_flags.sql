-- ===================================================
-- V2: Add reminder flags to orders table to prevent duplicate notifications
-- ===================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS upcoming_reminder_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ending_reminder_sent BOOLEAN DEFAULT FALSE;

