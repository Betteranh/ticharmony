CREATE TABLE `users`
(
    `id`             INT(11) NOT NULL AUTO_INCREMENT,
    `login`          VARCHAR(60) COLLATE utf8mb4_unicode_ci  NOT NULL,
    `password`       VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `firstname`      VARCHAR(60) COLLATE utf8mb4_unicode_ci  NOT NULL,
    `lastname`       VARCHAR(60) COLLATE utf8mb4_unicode_ci  NOT NULL,
    `email`          VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `type_client`    VARCHAR(20) COLLATE utf8mb4_unicode_ci  NOT NULL,
    `nom_entreprise` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `tva`            VARCHAR(50) COLLATE utf8mb4_unicode_ci  DEFAULT NULL,
    `telephone`      VARCHAR(50) COLLATE utf8mb4_unicode_ci  DEFAULT NULL,
    `adresse`        VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `langue`         VARCHAR(2) COLLATE utf8mb4_unicode_ci   NOT NULL,
    `role`           ENUM('ADMIN','MEMBER','CLIENT') COLLATE utf8mb4_unicode_ci NOT NULL,
    `created_at`     DATETIME                                NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
