-- Defense-in-depth: enforce tenant isolation at the database level via Row-Level Security.
-- The application sets `app.tenant_id` for the duration of each request/transaction
-- (see PrismaService / TenantContext). If that setting is missing, no rows are visible.
--
-- FORCE ROW LEVEL SECURITY is required because the application connects using the same
-- role that owns these tables; without FORCE, table owners bypass RLS entirely.

-- users
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON "users"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- categories
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_categories ON "categories"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- tickets
ALTER TABLE "tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tickets" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_tickets ON "tickets"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ticket_comments (scoped via parent ticket)
ALTER TABLE "ticket_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ticket_comments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_ticket_comments ON "ticket_comments"
  USING (EXISTS (
    SELECT 1 FROM "tickets" t
    WHERE t.id = "ticket_comments"."ticket_id"
      AND t."tenant_id" = current_setting('app.tenant_id', true)
  ));

-- ticket_attachments (scoped via parent ticket)
ALTER TABLE "ticket_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ticket_attachments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_ticket_attachments ON "ticket_attachments"
  USING (EXISTS (
    SELECT 1 FROM "tickets" t
    WHERE t.id = "ticket_attachments"."ticket_id"
      AND t."tenant_id" = current_setting('app.tenant_id', true)
  ));

-- notifications (scoped via owning user)
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_notifications ON "notifications"
  USING (EXISTS (
    SELECT 1 FROM "users" u
    WHERE u.id = "notifications"."user_id"
      AND u."tenant_id" = current_setting('app.tenant_id', true)
  ));

-- knowledge_articles (tenant_id nullable: NULL = globally public article)
ALTER TABLE "knowledge_articles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "knowledge_articles" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_knowledge_articles ON "knowledge_articles"
  USING ("tenant_id" IS NULL OR "tenant_id" = current_setting('app.tenant_id', true));

-- audit_logs
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_audit_logs ON "audit_logs"
  USING ("tenant_id" = current_setting('app.tenant_id', true));
