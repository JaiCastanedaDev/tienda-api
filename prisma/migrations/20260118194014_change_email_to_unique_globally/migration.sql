/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/

-- Primero, actualizar emails duplicados agregando un sufijo único basado en el tenant_id
WITH duplicates AS (
  SELECT id, email, tenant_id,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) as rn
  FROM users
)
UPDATE users
SET email = CONCAT(users.email, '_', LEFT(duplicates.tenant_id::text, 8))
FROM duplicates
WHERE users.id = duplicates.id
  AND duplicates.rn > 1;

-- DropIndex
DROP INDEX "users_tenant_id_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
