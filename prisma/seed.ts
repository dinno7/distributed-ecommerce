import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, ProductType } from '../src/generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const SEED_PRODUCTS = [
  {
    id: '019338a0-0000-7000-8000-000000000001',
    name: 'Mechanical Keyboard',
    type: ProductType.PHYSICAL,
    unitPriceMinor: 12900n,
    subscriptionDays: null,
    digitalMetadata: null,
    initialStock: 25,
  },
  {
    id: '019338a0-0000-7000-8000-000000000002',
    name: 'System Design E-Book',
    type: ProductType.DIGITAL,
    unitPriceMinor: 2900n,
    subscriptionDays: null,
    digitalMetadata: {
      deliveryType: 'download',
      assetKey: 'sys-design-v1.pdf',
    },
    initialStock: null,
  },
  {
    id: '019338a0-0000-7000-8000-000000000003',
    name: 'Pro Plan Monthly',
    type: ProductType.SUBSCRIPTION,
    unitPriceMinor: 1999n,
    subscriptionDays: 30,
    digitalMetadata: null,
    initialStock: null,
  },
] as const;

async function main() {
  console.log('Seeding...');
  for (const item of SEED_PRODUCTS) {
    await prisma.product.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        name: item.name,
        type: item.type,
        unitPriceMinor: item.unitPriceMinor,
        subscriptionDays: item.subscriptionDays,
        digitalMetadata: item.digitalMetadata ?? undefined,
      },
    });

    if (item.type === ProductType.PHYSICAL && item.initialStock !== null) {
      await prisma.inventory.upsert({
        where: { productId: item.id },
        update: {}, // Keep live stock changes if already seeded
        create: {
          productId: item.id,
          available: item.initialStock,
        },
      });
    }
  }

  console.log(`Seeded ${SEED_PRODUCTS.length} products successfully.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
