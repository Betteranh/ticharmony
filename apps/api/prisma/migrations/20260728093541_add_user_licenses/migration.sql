-- CreateTable
CREATE TABLE "user_licenses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_licenses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "user_licenses" ADD CONSTRAINT "user_licenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security: scoped via the parent user's tenant, same pattern as asset_notes.
ALTER TABLE "user_licenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_licenses" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_user_licenses ON "user_licenses"
  USING (EXISTS (
    SELECT 1 FROM "users" u
    WHERE u.id = "user_licenses"."user_id"
      AND u."tenant_id" = current_setting('app.tenant_id', true)
  ));
