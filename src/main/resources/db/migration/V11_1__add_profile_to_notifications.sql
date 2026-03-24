SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE notifications
    ADD COLUMN user_profile_id BIGINT NULL,
    ADD CONSTRAINT fk_notifications_user_profile
        FOREIGN KEY (user_profile_id) REFERENCES user_profiles (id) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;
