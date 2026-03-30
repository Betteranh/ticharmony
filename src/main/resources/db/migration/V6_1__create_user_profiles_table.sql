-- Table des profils employés (un compte entreprise → plusieurs profils)
CREATE TABLE user_profiles (
    id           BIGINT       AUTO_INCREMENT PRIMARY KEY,
    user_id      INT(11)      NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    color        VARCHAR(20)  NOT NULL DEFAULT '#3b82f6',
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);