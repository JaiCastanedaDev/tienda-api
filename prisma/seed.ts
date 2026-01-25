import { PrismaClient, StockMovementType } from '@prisma/client';
import { faker } from '@faker-js/faker';

/**
 * Seed realista de 3 meses para una tienda de ropa.
 *
 * - Respeta IDs proporcionados (tenantId / ownerUserId)
 * - Crea productos + variantes + stock
 * - Crea ventas distribuidas en los últimos ~90 días y sus sale_items
 * - Genera movimientos de stock IN (ingresos) y OUT (por ventas)
 *
 * Uso:
 *   npx ts-node prisma/seed.ts
 */

const prisma = new PrismaClient();

const TENANT_ID = '33b3d74b-12ce-432d-be27-929e20047e36';
const OWNER_USER_ID = 'bd845f02-fcd6-4845-b2ad-a3c51faed754';

const SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;
const COLORS = ['Negro', 'Blanco', 'Azul', 'Rojo', 'Verde', 'Beige'] as const;

function randInt(min: number, max: number) {
  return faker.number.int({ min, max });
}

function pickN<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  faker.helpers.shuffle(copy);
  return copy.slice(0, n);
}

function isoDateDaysAgo(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  // variar la hora para que no quede todo igual
  d.setHours(randInt(9, 20), randInt(0, 59), randInt(0, 59), 0);
  return d;
}

async function ensureTenantAndOwner() {
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      name: 'Tienda Demo (3 meses)',
      plan: 'pro',
      active: true,
    },
  });

  // Nota: password debe ser un hash bcrypt válido. Ponemos uno dummy que cumple formato.
  // Si el usuario ya existe, no tocamos su email/password.
  await prisma.user.upsert({
    where: { id: OWNER_USER_ID },
    update: {
      tenantId: TENANT_ID,
      role: 'OWNER',
    },
    create: {
      id: OWNER_USER_ID,
      tenantId: TENANT_ID,
      name: 'Dueño Demo',
      email: `owner.demo.${TENANT_ID.slice(0, 6)}@example.com`,
      password: '$2b$10$YourDefaultHashedPasswordHere',
      role: 'OWNER',
    },
  });
}

async function createCatalog() {
  const productTemplates = [
    {
      base: 'Camiseta Básica',
      skuPrefix: 'TSH',
      priceMin: 35000,
      priceMax: 65000,
    },
    {
      base: 'Camiseta Oversize',
      skuPrefix: 'OVR',
      priceMin: 45000,
      priceMax: 80000,
    },
    { base: 'Jean Slim', skuPrefix: 'JNS', priceMin: 110000, priceMax: 180000 },
    { base: 'Sudadera', skuPrefix: 'SUD', priceMin: 120000, priceMax: 220000 },
    { base: 'Chaqueta', skuPrefix: 'CHQ', priceMin: 180000, priceMax: 320000 },
    {
      base: 'Vestido Casual',
      skuPrefix: 'VST',
      priceMin: 90000,
      priceMax: 160000,
    },
    { base: 'Falda', skuPrefix: 'FLD', priceMin: 70000, priceMax: 130000 },
    { base: 'Short', skuPrefix: 'SRT', priceMin: 65000, priceMax: 120000 },
  ];

  const productsToCreate = randInt(18, 28);
  const createdProducts: Array<{
    id: string;
    price: number;
    name: string;
    sku: string;
  }> = [];

  for (let i = 0; i < productsToCreate; i++) {
    const tpl = faker.helpers.arrayElement(productTemplates);
    const brand = faker.helpers.arrayElement([
      'Adidas',
      'Nike',
      'Puma',
      'Zara',
      'H&M',
      'Levis',
      'Local',
    ]);
    const name = `${tpl.base} ${brand}`;
    const sku = `${tpl.skuPrefix}-${faker.string.alphanumeric({ length: 6, casing: 'upper' })}`;
    const price = randInt(tpl.priceMin, tpl.priceMax);

    const product = await prisma.product.create({
      data: {
        tenantId: TENANT_ID,
        name,
        sku,
        price,
        active: true,
        // no tocamos createdAt/updatedAt -> default now()
      },
      select: { id: true, price: true, name: true, sku: true },
    });

    createdProducts.push(product);

    // Variantes: 4-10 por producto
    const sizeCount = randInt(2, 4);
    const colorCount = randInt(2, 3);
    const sizes = pickN(SIZES, sizeCount);
    const colors = pickN(COLORS, colorCount);

    for (const size of sizes) {
      for (const color of colors) {
        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            size,
            color,
          },
          select: { id: true },
        });

        // Stock inicial (ingreso) hace 60-90 días
        const initialQty = randInt(6, 30);
        const createdAt = isoDateDaysAgo(randInt(60, 90));

        await prisma.stock.create({
          data: {
            productVariantId: variant.id,
            quantity: initialQty,
          },
        });

        await prisma.stockMovement.create({
          data: {
            tenantId: TENANT_ID,
            productVariantId: variant.id,
            type: StockMovementType.IN,
            quantity: initialQty,
            createdAt,
          },
        });
      }
    }
  }

  return createdProducts;
}

async function createExtraSellers() {
  // 1-3 vendedores
  const sellerCount = randInt(1, 3);
  const sellers: Array<{ id: string }> = [];

  for (let i = 0; i < sellerCount; i++) {
    const id = faker.string.uuid();
    const username = faker.internet.username().toLowerCase();

    const user = await prisma.user.create({
      data: {
        id,
        tenantId: TENANT_ID,
        name: faker.person.fullName(),
        email: `seller.${username}.${TENANT_ID.slice(0, 4)}@example.com`,
        password: '$2b$10$YourDefaultHashedPasswordHere',
        role: 'SELLER',
      },
      select: { id: true },
    });
    sellers.push(user);
  }

  return sellers;
}

async function createSales() {
  // Traemos todas las variantes con su producto
  const variants = await prisma.productVariant.findMany({
    where: { product: { tenantId: TENANT_ID, active: true } },
    include: { product: true, stock: true },
  });

  const sellers = await prisma.user.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, role: true },
  });

  // Determinar "best sellers" para que el historial tenga señal
  faker.helpers.shuffle(variants);
  const bestSellerVariants = variants.slice(0, Math.min(12, variants.length));

  // Ventas por día: 0-6, con fines de semana más altos
  for (let day = 90; day >= 0; day--) {
    const date = isoDateDaysAgo(day);
    const isWeekend = [0, 6].includes(date.getDay());

    const salesToday = randInt(0, isWeekend ? 6 : 4);

    for (let s = 0; s < salesToday; s++) {
      const itemsCount = randInt(1, 4);
      const saleVariants: typeof variants = [];

      for (let k = 0; k < itemsCount; k++) {
        // 60% probabilidad de elegir un best seller
        const chooseBest = faker.number.float({ min: 0, max: 1 }) < 0.6;
        const v = chooseBest
          ? faker.helpers.arrayElement(bestSellerVariants)
          : faker.helpers.arrayElement(variants);
        saleVariants.push(v);
      }

      const userId = faker.helpers.arrayElement(sellers).id;

      // Armamos items con cantidades 1-2 (moda/ropa)
      const items = saleVariants.map((v) => {
        const quantity = randInt(1, 2);
        const price = v.product.price;
        return { v, quantity, price };
      });

      const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

      const sale = await prisma.sale.create({
        data: {
          tenantId: TENANT_ID,
          userId,
          total,
          createdAt: date,
        },
        select: { id: true },
      });

      for (const it of items) {
        await prisma.saleItem.create({
          data: {
            saleId: sale.id,
            productVariantId: it.v.id,
            quantity: it.quantity,
            price: it.price,
            createdAt: date,
          },
        });

        // Ajustar stock y registrar movimiento OUT
        // Si no hay suficiente stock, simulamos un reabasto pequeño cercano a la fecha.
        const currentQty = it.v.stock?.quantity ?? 0;
        if (currentQty < it.quantity) {
          const topUp = randInt(5, 20);
          await prisma.stock.update({
            where: { productVariantId: it.v.id },
            data: { quantity: { increment: topUp } },
          });
          await prisma.stockMovement.create({
            data: {
              tenantId: TENANT_ID,
              productVariantId: it.v.id,
              type: StockMovementType.IN,
              quantity: topUp,
              createdAt: date,
            },
          });
        }

        await prisma.stock.update({
          where: { productVariantId: it.v.id },
          data: { quantity: { decrement: it.quantity } },
        });
        await prisma.stockMovement.create({
          data: {
            tenantId: TENANT_ID,
            productVariantId: it.v.id,
            type: StockMovementType.OUT,
            quantity: it.quantity,
            createdAt: date,
          },
        });
      }
    }
  }
}

async function seed() {
  // Protecciones: evitar duplicar si ya hiciste seed
  // Si quieres re-seed, borra primero por tenant.
  await ensureTenantAndOwner();

  const existingSales = await prisma.sale.count({
    where: { tenantId: TENANT_ID },
  });
  if (existingSales > 0) {
    console.log(
      `Seed cancelado: ya existen ${existingSales} ventas para tenant ${TENANT_ID}. ` +
        'Si quieres regenerar, borra datos del tenant y vuelve a ejecutar.',
    );
    return;
  }

  await createExtraSellers();
  await createCatalog();
  await createSales();

  const [products, variants, sales, items] = await Promise.all([
    prisma.product.count({ where: { tenantId: TENANT_ID } }),
    prisma.productVariant.count({
      where: { product: { tenantId: TENANT_ID } },
    }),
    prisma.sale.count({ where: { tenantId: TENANT_ID } }),
    prisma.saleItem.count({ where: { sale: { tenantId: TENANT_ID } } }),
  ]);

  console.log('Seed completado OK', { products, variants, sales, items });
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
