const { PrismaClient } = require('@prisma/client');

const TENANT_ID = '33b3d74b-12ce-432d-be27-929e20047e36';

(async () => {
  const prisma = new PrismaClient();
  try {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 30);

    const salesLast30 = await prisma.sale.count({
      where: { tenantId: TENANT_ID, createdAt: { gte: start, lte: now } },
    });

    const revenueAgg = await prisma.sale.aggregate({
      where: { tenantId: TENANT_ID, createdAt: { gte: start, lte: now } },
      _sum: { total: true },
    });

    const lowStock = await prisma.stock.count({
      where: {
        quantity: { lt: 5 },
        productVariant: { product: { tenantId: TENANT_ID, active: true } },
      },
    });

    console.log({
      tenantId: TENANT_ID,
      salesLast30,
      revenueLast30: revenueAgg._sum.total ?? 0,
      lowStock,
    });
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
