-- Répare l'état InnoDB corrompu de user_profiles et recrée le FK correctement.
-- Cause racine : FOREIGN_KEY_CHECKS=0 dans V12_1 corrompt les métadonnées InnoDB
-- sur MySQL 8+/9+, rendant user_profiles non-ouvrable pour les FK.

-- 1. Reconstruire user_profiles (corrige le "Failed to open the referenced table")
ALTER TABLE user_profiles ENGINE = InnoDB;

-- 2. Reconstruire problems (purge le FK fantôme créé par V12_1)
ALTER TABLE problems ENGINE = InnoDB;

-- 3. Nettoyer les références orphelines
UPDATE problems
SET user_profile_id = NULL
WHERE user_profile_id IS NOT NULL
  AND user_profile_id NOT IN (SELECT id FROM user_profiles);

-- 4. Ajouter le FK correctement (conditionnel pour idempotence)
SET @fk_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA    = DATABASE()
      AND TABLE_NAME      = 'problems'
      AND CONSTRAINT_NAME = 'fk_problems_user_profile'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @add_fk = IF(@fk_exists = 0,
    'ALTER TABLE problems ADD CONSTRAINT fk_problems_user_profile FOREIGN KEY (user_profile_id) REFERENCES user_profiles (id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @add_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;