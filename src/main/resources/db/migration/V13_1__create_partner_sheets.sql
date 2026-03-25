CREATE TABLE partner_sheets (
    id         INT(11)     NOT NULL AUTO_INCREMENT,
    partner_id INT(11)     NOT NULL,
    notes      TEXT,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_ps_partner (partner_id),
    CONSTRAINT fk_ps_partner FOREIGN KEY (partner_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE partner_sections (
    id         INT(11)      NOT NULL AUTO_INCREMENT,
    sheet_id   INT(11)      NOT NULL,
    title      VARCHAR(100) NOT NULL,
    icon       VARCHAR(10),
    sort_order INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_psec_sheet FOREIGN KEY (sheet_id) REFERENCES partner_sheets (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE partner_entries (
    id          INT(11)      NOT NULL AUTO_INCREMENT,
    section_id  INT(11)      NOT NULL,
    label       VARCHAR(100) NOT NULL,
    value       TEXT,
    is_password TINYINT(1)   NOT NULL DEFAULT 0,
    sort_order  INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_pe_section FOREIGN KEY (section_id) REFERENCES partner_sections (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;