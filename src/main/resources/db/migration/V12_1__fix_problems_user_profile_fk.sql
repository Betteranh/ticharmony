-- 1. Nettoyer les références orphelines : problems.user_profile_id pointe vers
--    des user_profiles supprimés → on les met à NULL pour éviter les violations FK
UPDATE problems
SET user_profile_id = NULL
WHERE user_profile_id IS NOT NULL
  AND user_profile_id NOT IN (SELECT id FROM user_profiles);

-- 2. Ajouter la FK avec ON DELETE SET NULL
--    (FOREIGN_KEY_CHECKS=0 requis par MySQL pour les FK en mode out-of-order)
SET FOREIGN_KEY_CHECKS = 0;
ALTER TABLE problems
    ADD CONSTRAINT fk_problems_user_profile
        FOREIGN KEY (user_profile_id) REFERENCES user_profiles (id) ON DELETE SET NULL;
SET FOREIGN_KEY_CHECKS = 1;