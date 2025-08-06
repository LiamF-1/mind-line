import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create a safe Prisma client that handles build-time scenarios
function createPrismaClient() {
  // During build time, create a client but don't connect
  if (process.env.IS_BUILD) {
    return new PrismaClient({
      datasourceUrl: 'postgresql://build:build@localhost:5432/build',
    })
  }

  return new PrismaClient()
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
