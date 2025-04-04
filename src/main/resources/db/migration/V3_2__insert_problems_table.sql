INSERT INTO `problems`
(`user_id`, `technician_id`, `ticket_first_name`, `ticket_last_name`, `ticket_email`, `ticket_phone`, `title`,
 `description`, `category`, `priority`, `status`, `created_at`, `solved_at`, `resolution`)
VALUES (2, NULL, 'Alice', 'Dupont', 'alice@example.com', '0123456789',
        'Ticket 1', 'Le réseau Wi-Fi est instable et coupe régulièrement.', 'Réseau', 'MEDIUM', 'OPEN',
        '2025-03-20 09:15:00', NULL, NULL),

       (3, NULL, 'Bruno', 'Martin', 'bruno@example.com', '0123456790',
        'Ticket 2', 'Le logiciel de traitement de texte plante à chaque ouverture de fichier.', 'Logiciel', 'MEDIUM',
        'OPEN',
        '2025-03-20 12:00:00', NULL, NULL),

       (9, NULL, 'Claire', 'Durand', 'claire@example.com', '0123456791',
        'Ticket 3', 'Impossible d''accéder au portail client en raison d''une erreur 404.', 'Web', 'MEDIUM', 'OPEN',
        '2025-03-21 14:45:00', NULL, NULL),

       (7, NULL, 'David', 'Moreau', 'david@example.com', '0123456792',
        'Ticket 4', 'Les documents partagés ne se synchronisent pas sur l''application mobile.', 'Réseau', 'MEDIUM',
        'OPEN',
        '2025-03-22 08:20:00', '2025-03-22 10:00:00', NULL),

       (3, NULL, 'Emma', 'Lefevre', 'emma@example.com', '0123456793',
        'Ticket 5', 'Le système de messagerie affiche des erreurs lors de l''envoi.', 'Logiciel', 'MEDIUM', 'OPEN',
        '2025-03-22 11:05:00', NULL, NULL);
