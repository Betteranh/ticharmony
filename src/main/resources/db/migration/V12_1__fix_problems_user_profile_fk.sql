-- Nettoie les références orphelines dans problems.user_profile_id.
-- Note : l'ajout du FK est délégué à V12_3 qui gère la reconstruction InnoDB.
UPDATE problems
SET user_profile_id = NULL
WHERE user_profile_id IS NOT NULL
  AND user_profile_id NOT IN (SELECT id FROM user_profiles);