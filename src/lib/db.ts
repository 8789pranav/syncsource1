import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Single default tenant for Phase 1 (multi-tenant foundation ready, one tenant active).
export const DEFAULT_TENANT_ID = 'tenant-default-hrms'
export const DEFAULT_TENANT_CODE = 'ACME'
