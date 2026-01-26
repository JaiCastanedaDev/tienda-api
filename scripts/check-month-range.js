const { PrismaClient } = require('@prisma/client');

const tenantId = '33b3d74b-12ce-432d-be27-929e20047e36';

function monthRange(year, month1to12) {
  const start = new Date(Date.UTC(year, month1to12 - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month1to12, 1, 0, 0, 0, 0) - 1);
  return { start, end };
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

    for (const p of [
      { year, month },
      { year: prev.year, month: prev.month },
    ]) {
      const { start, end } = monthRange(p.year, p.month);
      const count = await prisma.sale.count({
        where: { tenantId, createdAt: { gte: start, lte: end } },
      });

      console.log(
        JSON.stringify(
          {
            period: p,
            count,
            from: start.toISOString(),
            to: end.toISOString(),
          },
          null,
          2,
        ),
      );
    }
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
