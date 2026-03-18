-- Ajout conditionnel de user_profile_id (idempotent — safe sur MySQL)
SET @columnExists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'problems'
      AND COLUMN_NAME  = 'user_profile_id'
);

SET @sql = IF(@columnExists = 0,
    'ALTER TABLE problems ADD COLUMN user_profile_id BIGINT NULL',
    'SELECT 1 -- column already exists'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
