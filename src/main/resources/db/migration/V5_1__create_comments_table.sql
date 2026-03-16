CREATE TABLE `comments`
(
    `id`         BIGINT(20) NOT NULL AUTO_INCREMENT,
    `problem_id` INT(11) NOT NULL,
    `author_id`  INT(11) NOT NULL,
    `content`    TEXT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `comments`
    ADD KEY `comments_problem_id` (`problem_id`),
    ADD KEY `comments_author_id` (`author_id`);

ALTER TABLE `comments`
    ADD CONSTRAINT `comments_problem_id_fk` FOREIGN KEY (`problem_id`) REFERENCES `problems` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `comments_author_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
