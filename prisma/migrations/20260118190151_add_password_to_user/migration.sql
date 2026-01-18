/*
  Warnings:

  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable - Agregamos la columna con un valor temporal
ALTER TABLE "users" ADD COLUMN "password" TEXT NOT NULL DEFAULT '$2b$10$YourDefaultHashedPasswordHere';

-- Removemos el default después de agregar la columna
ALTER TABLE "users" ALTER COLUMN "password" DROP DEFAULT;
