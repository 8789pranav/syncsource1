import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"
import { authOptions } from "@/lib/auth"
import { unauthorized, forbidden } from "@/lib/api-response"
import { db, DEFAULT_TENANT_ID } from "@/lib/db"

export interface AuthSession {
  userId: string
  role: string
  tenantId: string
  employeeId: string | null
  name: string
  email: string
}

export async function getSession(): Promise<AuthSession | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return {
    userId: session.user.id,
    role: session.user.role,
    tenantId: session.user.tenantId,
    employeeId: session.user.employeeId,
    name: session.user.name || "",
    email: session.user.email || "",
  }
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession()
  if (!session) {
    throw new AuthError("Unauthorized", 401)
  }
  return session
}

export async function requireRole(...roles: string[]): Promise<AuthSession> {
  const session = await requireAuth()
  if (!roles.includes(session.role)) {
    throw new AuthError("Forbidden: insufficient permissions", 403)
  }
  return session
}

export async function requireTenant(): Promise<string> {
  const session = await requireAuth()
  return session.tenantId
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function handleAuthError(err: unknown) {
  if (err instanceof AuthError) {
    if (err.status === 401) return unauthorized(err.message)
    if (err.status === 403) return forbidden(err.message)
  }
  return null
}

export function requireFields(body: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    const val = body[field]
    if (val === undefined || val === null || (typeof val === "string" && !val.trim())) {
      return `${field} is required`
    }
  }
  return null
}
