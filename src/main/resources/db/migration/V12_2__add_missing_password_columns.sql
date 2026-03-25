-- Colonnes manquantes ajoutées aux entités sans migration Flyway correspondante

-- Mot de passe de gestion des profils sur le compte entreprise
ALTER TABLE users
    ADD COLUMN profile_management_password VARCHAR(255) NULL;

-- Hash du mot de passe de protection d'un profil client
ALTER TABLE user_profiles
    ADD COLUMN password_hash VARCHAR(255) NULL;