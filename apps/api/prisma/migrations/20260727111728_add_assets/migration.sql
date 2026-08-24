-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('LAPTOP', 'DESKTOP', 'SWITCH', 'ROUTER', 'SERVER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('DEPLOYED', 'IN_STOCK', 'DISABLED', 'RETIRED');

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "asset_tag" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "model" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'IN_STOCK',
    "assignee_id" TEXT,
    "location" TEXT,
    "serial_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assets_tenant_id_type_idx" ON "assets"("tenant_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "assets_tenant_id_asset_tag_key" ON "assets"("tenant_id", "asset_tag");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row-Level Security: same tenant isolation pattern as every other tenant-scoped table
-- (see 20260622140236_enable_rls). FORCE is required because the app connects as the
-- table owner otherwise RLS would be silently bypassed.
ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assets" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_assets ON "assets"
  USING ("tenant_id" = current_setting('app.tenant_id', true));
