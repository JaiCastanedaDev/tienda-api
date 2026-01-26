const { PrismaClient } = require('@prisma/client');

const TENANT_ID = '33b3d74b-12ce-432d-be27-929e20047e36';

(async () => {
  const prisma = new PrismaClient();
  try {
    const totalImages = await prisma.variantImage.count({
      where: { productVariant: { product: { tenantId: TENANT_ID } } },
    });

    const variantsWithAny = await prisma.productVariant.count({
      where: { product: { tenantId: TENANT_ID }, images: { some: {} } },
    });

    const variantsNoPrimary = await prisma.productVariant.count({
      where: {
        product: { tenantId: TENANT_ID },
        images: { some: {} },
        AND: [{ images: { none: { isPrimary: true } } }],
      },
    });

    console.log({ totalImages, variantsWithAny, variantsNoPrimary });
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
