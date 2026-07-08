import { userRepository } from "@/lib/repositories/user.repository"
import { hashPassword, verifyPassword } from "@/lib/auth"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ServiceError } from "@/lib/services/employee.service"

export const authService = {
  async register(params: {
    email: string
    password: string
    name: string
    role?: string
    employeeId?: string | null
  }) {
    const { email, password, name } = params
    if (!email || !password || !name) {
      throw new ServiceError("Email, password, and name are required", 400)
    }
    if (password.length < 8) {
      throw new ServiceError("Password must be at least 8 characters", 400)
    }

    const existing = await userRepository.findByEmail(DEFAULT_TENANT_ID, email)
    if (existing) {
      throw new ServiceError("User already exists with this email", 409)
    }

    const passwordHash = await hashPassword(password)
    const user = await userRepository.create({
      tenantId: DEFAULT_TENANT_ID,
      email,
      passwordHash,
      name,
      role: params.role || "admin",
      employeeId: params.employeeId || null,
    })

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }
  },

  async verifyCredentials(email: string, password: string) {
    const user = await userRepository.findByEmail(DEFAULT_TENANT_ID, email)
    if (!user || !user.isActive) return null

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ServiceError("Account temporarily locked. Try again later.", 423)
    }

    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      const failedAttempts = user.failedAttempts + 1
      const shouldLock = failedAttempts >= 5
      await userRepository.updateFailedAttempts(
        user.id,
        failedAttempts,
        shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : undefined
      )
      return null
    }

    await userRepository.resetFailedAttempts(user.id)
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      employeeId: user.employeeId,
    }
  },

  async ensureDefaultAdmin() {
    const existing = await userRepository.findByEmail(DEFAULT_TENANT_ID, "admin@nexushr.com")
    if (existing) return null

    const passwordHash = await hashPassword("admin123456")
    return userRepository.create({
      tenantId: DEFAULT_TENANT_ID,
      email: "admin@nexushr.com",
      passwordHash,
      name: "System Admin",
      role: "admin",
    })
  },
}
