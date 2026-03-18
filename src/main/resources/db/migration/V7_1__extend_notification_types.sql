ALTER TABLE notifications
    MODIFY COLUMN type ENUM(
        'NEW_PROBLEM',
        'PROBLEM_CLOSED',
        'ASSIGNED_TO_PROBLEM',
        'NEW_COMMENT',
        'TICKET_IN_PROGRESS',
        'TICKET_CLOSED',
        'TICKET_REASSIGNED'
    ) NOT NULL;
