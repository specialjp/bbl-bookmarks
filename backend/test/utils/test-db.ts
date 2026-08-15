import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../src/generated/prisma/client';

let prisma: PrismaClient | undefined;

/** Direct Prisma handle to the TEST database, for fixtures and assertions. */
export function getTestPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL as string,
      }),
    });
  }
  return prisma;
}

export async function truncateAll(): Promise<void> {
  await getTestPrisma().$executeRawUnsafe(
    'TRUNCATE "User", "Collection", "Bookmark", "CollectionShare" RESTART IDENTITY CASCADE',
  );
}

export async function disconnectTestPrisma(): Promise<void> {
  await prisma?.$disconnect();
  prisma = undefined;
}
