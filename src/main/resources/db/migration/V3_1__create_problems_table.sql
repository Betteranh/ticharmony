CREATE TABLE `problems`
(
    `id`         INT(11)             NOT NULL AUTO_INCREMENT,
    `user_id`    INT(11)             NOT NULL,
    `problem`    TEXT     NOT NULL,
    `created_at` DATETIME NOT NULL,
    `solved_at`  DATETIME,
    `solved`     TINYINT(1) DEFAULT 0,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

--
-- Index pour la table `problems`
--
ALTER TABLE `problems`
    ADD KEY `problems_user_id` (`user_id`);


--
-- Contraintes pour la table `problems`
--
ALTER TABLE `problems`
    ADD CONSTRAINT `problems_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;