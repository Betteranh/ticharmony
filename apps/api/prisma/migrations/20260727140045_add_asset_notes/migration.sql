-- CreateTable
CREATE TABLE "asset_notes" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_notes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "asset_notes" ADD CONSTRAINT "asset_notes_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security: scoped via the parent asset's tenant, same pattern as ticket_comments.
ALTER TABLE "asset_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_notes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_asset_notes ON "asset_notes"
  USING (EXISTS (
    SELECT 1 FROM "assets" a
    WHERE a.id = "asset_notes"."asset_id"
      AND a."tenant_id" = current_setting('app.tenant_id', true)
  ));
