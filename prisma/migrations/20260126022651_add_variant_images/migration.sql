-- CreateTable
CREATE TABLE "variant_images" (
    "id" TEXT NOT NULL,
    "product_variant_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variant_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "variant_images_product_variant_id_idx" ON "variant_images"("product_variant_id");

-- AddForeignKey
ALTER TABLE "variant_images" ADD CONSTRAINT "variant_images_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
