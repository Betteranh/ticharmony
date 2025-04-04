CREATE TABLE `problems`
(
    `id`                INT(11) NOT NULL AUTO_INCREMENT,
    `user_id`           INT(11) NOT NULL,
    `technician_id`     INT(11) DEFAULT NULL,
    `ticket_first_name` VARCHAR(100) NOT NULL,
    `ticket_last_name`  VARCHAR(100) NOT NULL,
    `ticket_email`      VARCHAR(255) NOT NULL,
    `ticket_phone`      VARCHAR(20)  NOT NULL,
    `title`             VARCHAR(255) NOT NULL,
    `description`       TEXT         NOT NULL,
    `category`          VARCHAR(100)          DEFAULT NULL,
    `priority`          ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL,
    `status`            ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL,
    `created_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `solved_at`         DATETIME              DEFAULT NULL,
    `resolution`        TEXT                  DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `problems`
    ADD KEY `problems_user_id` (`user_id`),
    ADD KEY `problems_technician_id` (`technician_id`);

ALTER TABLE `problems`
    ADD CONSTRAINT `problems_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `problems_technician_id_fk` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`) ON
DELETE
SET NULL ON UPDATE CASCADE;
