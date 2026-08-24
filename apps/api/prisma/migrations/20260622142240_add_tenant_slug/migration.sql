ALTER TABLE "tenants" ADD COLUMN "slug" TEXT;
UPDATE "tenants" SET "slug" = "id" WHERE "slug" IS NULL;
ALTER TABLE "tenants" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
