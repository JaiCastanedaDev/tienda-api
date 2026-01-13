/*
  Warnings:

  - A unique constraint covering the columns `[storeId,productId,size,color]` on the table `Stock` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `color` to the `SaleItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `SaleItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `color` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `Stock` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Stock_storeId_productId_key";

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "color" TEXT NOT NULL,
ADD COLUMN     "size" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "color" TEXT NOT NULL,
ADD COLUMN     "size" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Stock_storeId_productId_size_color_key" ON "Stock"("storeId", "productId", "size", "color");
