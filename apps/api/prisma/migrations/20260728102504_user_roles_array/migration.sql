-- Migrate `role` (single value) to `roles` (array) on `users`, preserving existing data.
ALTER TABLE "users" ADD COLUMN "roles" "UserRole"[] NOT NULL DEFAULT '{}';
UPDATE "users" SET "roles" = ARRAY["role"];
ALTER TABLE "users" DROP COLUMN "role";
ALTER TABLE "users" ALTER COLUMN "roles" DROP DEFAULT;
