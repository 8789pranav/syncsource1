import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  __hrmsPrismaV3?: PrismaClient | undefined
  prisma: PrismaClient | undefined
}

// Always use a fresh client keyed under a new global symbol to bust stale caches
// after schema extensions (the old `prisma` key may hold a client missing newer models).
let client = globalForPrisma.__hrmsPrismaV3
if (!client || typeof (client as any).onboardingSetting === 'undefined') {
  if (client) { try { client.$disconnect() } catch { /* ignore */ } }
  client = new PrismaClient({ log: ['error', 'warn'] })
  globalForPrisma.__hrmsPrismaV3 = client
  // Also clear the old key so nothing else reuses the stale client.
  globalForPrisma.prisma = client
}

export const db = client

// Single default tenant for Phase 1 (multi-tenant foundation ready, one tenant active).
export const DEFAULT_TENANT_ID = 'tenant-default-hrms'
export const DEFAULT_TENANT_CODE = 'ACME'
