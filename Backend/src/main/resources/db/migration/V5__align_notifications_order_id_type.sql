-- ===================================================
-- V5: Align notifications.order_id column type with JPA Entity (BIGINT)
-- ===================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
          AND column_name = 'order_id' 
          AND data_type = 'character varying'
    ) THEN
        ALTER TABLE notifications 
        ALTER COLUMN order_id TYPE BIGINT 
        USING (
            CASE 
                WHEN order_id ~ '^[0-9]+$' THEN order_id::BIGINT 
                ELSE NULL 
            END
        );
    END IF;
END $$;

