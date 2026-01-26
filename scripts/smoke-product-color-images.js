const { PrismaClient } = require('@prisma/client');

const TENANT_ID = '33b3d74b-12ce-432d-be27-929e20047e36';

(async () => {
  const prisma = new PrismaClient();
  try {
    const variants = await prisma.productVariant.findMany({
      where: { product: { tenantId: TENANT_ID, active: true } },
      include: { product: true, images: true },
    });

    const byProductColor = new Map();

    for (const v of variants) {
      const key = `${v.productId}::${v.color.toLowerCase()}`;
      const group = byProductColor.get(key) ?? {
        productId: v.productId,
        color: v.color,
        urls: new Set(),
        variants: 0,
        variantsWithPrimary: 0,
      };

      group.variants++;
      for (const img of v.images) {
        group.urls.add(img.url);
      }
      if (v.images.some((i) => i.isPrimary)) group.variantsWithPrimary++;

      byProductColor.set(key, group);
    }

    const groups = Array.from(byProductColor.values());

    const badUrlGroups = groups.filter((g) => g.urls.size !== 1);
    const badPrimaryGroups = groups.filter((g) => g.variantsWithPrimary !== g.variants);

    console.log({
      totalVariants: variants.length,
      groups: groups.length,
      badUrlGroups: badUrlGroups.length,
      badPrimaryGroups: badPrimaryGroups.length,
    });

    if (badUrlGroups.length) {
      console.log('Ejemplo badUrlGroup:', badUrlGroups[0]);
    }
    if (badPrimaryGroups.length) {
      console.log('Ejemplo badPrimaryGroup:', badPrimaryGroups[0]);
    }
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
