import { PrismaClient } from '@prisma/client';

/**
 * Seed de imágenes de prueba.
 *
 * Objetivo (nuevo): 1 imagen por combinación producto + color
 * (la talla no importa, se replica para todas las variantes/tallas de ese color).
 *
 * Estrategia:
 * - (Opcional) borrar imágenes existentes del tenant para evitar basura.
 * - Agrupar variantes por (productId + color).
 * - Elegir URL placeholder según categoría del producto.
 * - Crear 1 imagen primary por cada variante del grupo (mismo url/alt).
 */

const prisma = new PrismaClient();

const TENANT_ID = '33b3d74b-12ce-432d-be27-929e20047e36';

const PLACEHOLDER_IMAGES = {
  camiseta: [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=60',
    'https://images.unsplash.com/photo-1520975958225-6e8f99f7e8dd?auto=format&fit=crop&w=900&q=60',
  ],
  jean: [
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=60',
    'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=60',
  ],
  sudadera: [
    'https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=900&q=60',
    'https://images.unsplash.com/photo-1520975693411-35a5a73fbb92?auto=format&fit=crop&w=900&q=60',
  ],
  chaqueta: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=60',
    'https://images.unsplash.com/photo-1542060748-10c28b62716b?auto=format&fit=crop&w=900&q=60',
  ],
  vestido: [
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=60',
    'https://images.unsplash.com/photo-1520975708794-1a3c8a0f5c6f?auto=format&fit=crop&w=900&q=60',
  ],
  falda: [
    'https://images.unsplash.com/photo-1520975696997-06d2a6f6f28f?auto=format&fit=crop&w=900&q=60',
    'https://images.unsplash.com/photo-1520975750666-2b1b7c1d09d7?auto=format&fit=crop&w=900&q=60',
  ],
  short: [
    'https://images.unsplash.com/photo-1593032465175-481ac7f401c4?auto=format&fit=crop&w=900&q=60',
    'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=900&q=60',
  ],
};

function pickCategory(productName: string): keyof typeof PLACEHOLDER_IMAGES {
  const n = productName.toLowerCase();
  if (n.includes('jean')) return 'jean';
  if (n.includes('sudadera')) return 'sudadera';
  if (n.includes('chaqueta')) return 'chaqueta';
  if (n.includes('vestido')) return 'vestido';
  if (n.includes('falda')) return 'falda';
  if (n.includes('short')) return 'short';
  return 'camiseta';
}

const RESET_EXISTING = true;

async function main() {
  const variants = await prisma.productVariant.findMany({
    where: { product: { tenantId: TENANT_ID, active: true } },
    include: { product: true },
  });

  if (RESET_EXISTING) {
    const deleted = await prisma.variantImage.deleteMany({
      where: { productVariant: { product: { tenantId: TENANT_ID } } },
    });
    console.log('Reset imágenes existentes', { deleted: deleted.count });
  }

  const groups = new Map<string, typeof variants>();

  for (const v of variants) {
    const key = `${v.productId}::${v.color.toLowerCase()}`;
    const arr = groups.get(key);
    if (arr) arr.push(v);
    else groups.set(key, [v]);
  }

  let created = 0;

  for (const groupVariants of groups.values()) {
    const sample = groupVariants[0];
    const category = pickCategory(sample.product.name);
    const urls = PLACEHOLDER_IMAGES[category];

    // 1 imagen por color (misma para todas las tallas)
    const url = urls[0];
    const altBase = `${sample.product.name} - ${sample.color}`;

    // Creamos una imagen por variante (porque la relación es variante->imagenes)
    await prisma.variantImage.createMany({
      data: groupVariants.map((v) => ({
        productVariantId: v.id,
        url,
        alt: `${altBase} (talla ${v.size})`,
        isPrimary: true,
        sortOrder: 0,
      })),
      skipDuplicates: true,
    });

    created += groupVariants.length;
  }

  console.log('Seed imágenes (producto+color) completado', {
    variants: variants.length,
    groups: groups.size,
    created,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
