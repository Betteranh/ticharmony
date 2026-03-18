-- Mémoriser email et téléphone sur le profil pour pré-remplissage automatique
ALTER TABLE user_profiles
    ADD COLUMN email VARCHAR(255) NULL,
    ADD COLUMN phone VARCHAR(50)  NULL;