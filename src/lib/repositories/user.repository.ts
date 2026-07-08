import { db } from "@/lib/db"

export const userRepository = {
  async findByEmail(tenantId: string, email: string) {
    return db.user.findUnique({
      where: { tenantId_email: { tenantId, email: email.toLowerCase().trim() } },
    })
  },

  async findById(id: string) {
    return db.user.findUnique({ where: { id } })
  },

  async create(data: {
    tenantId: string
    email: string
    passwordHash: string
    name: string
    role?: string
    employeeId?: string | null
  }) {
    return db.user.create({
      data: {
        tenantId: data.tenantId,
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        name: data.name,
        role: data.role || "admin",
        employeeId: data.employeeId || null,
      },
    })
  },

  async updateLastLogin(id: string, ip?: string) {
    return db.user.update({
      where: { id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    })
  },

  async updateFailedAttempts(id: string, attempts: number, lockedUntil?: Date) {
    return db.user.update({
      where: { id },
      data: { failedAttempts: attempts, lockedUntil },
    })
  },

  async resetFailedAttempts(id: string) {
    return db.user.update({
      where: { id },
      data: { failedAttempts: 0, lockedUntil: null },
    })
  },
}
