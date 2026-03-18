ALTER TABLE users
    ADD COLUMN active      BOOLEAN  NOT NULL DEFAULT TRUE,
    ADD COLUMN active_from DATE     NULL,
    ADD COLUMN active_to   DATE     NULL,
    ADD COLUMN support_from DATE    NULL,
    ADD COLUMN support_to  DATE     NULL;