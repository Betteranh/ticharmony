-- ── Index notifications (requêtes au chargement de chaque page) ──────────────
CREATE INDEX idx_notif_user_viewed
    ON notifications(user_id, viewed);

CREATE INDEX idx_notif_problem
    ON notifications(problem_id);

-- ── Index user_profiles ────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_user_active
    ON user_profiles(user_id, active);

-- ── Index problems (filtres status + tri par date) ────────────────────────────
CREATE INDEX idx_problems_status
    ON problems(status);

CREATE INDEX idx_problems_status_created
    ON problems(status, created_at DESC);

CREATE INDEX idx_problems_technician_status
    ON problems(technician_id, status);