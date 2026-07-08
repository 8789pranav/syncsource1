import { NextRequest } from "next/server"
import { employeeService, ServiceError } from "@/lib/services/employee.service"
import { requireAuth, handleAuthError } from "@/lib/session"
import { ok, badRequest, notFound, conflict, serverError, parseBody } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const limited = rateLimit(req)
    if (limited) return limited

    const session = await requireAuth()
    const { id } = await ctx.params

    const rec = await employeeService.getById(id, session.tenantId)
    if (!rec) return notFound("Employee not found")

    return ok(rec)
  } catch (err: any) {
    const authErr = handleAuthError(err)
    if (authErr) return authErr
    return serverError("Failed to fetch employee: " + (err?.message || String(err)))
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const limited = rateLimit(req)
    if (limited) return limited

    const session = await requireAuth()
    const { id } = await ctx.params
    const body = await parseBody(req)

    const updated = await employeeService.update(id, body, session.tenantId, session.name)
    return ok(updated)
  } catch (err: any) {
    const authErr = handleAuthError(err)
    if (authErr) return authErr
    if (err instanceof ServiceError) {
      if (err.status === 404) return notFound(err.message)
      if (err.status === 409) return conflict(err.message)
      return badRequest(err.message)
    }
    return serverError("Failed to update employee: " + (err?.message || String(err)))
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const limited = rateLimit(req)
    if (limited) return limited

    const session = await requireAuth()
    const { id } = await ctx.params

    const result = await employeeService.delete(id, session.tenantId, session.name)
    return ok(result)
  } catch (err: any) {
    const authErr = handleAuthError(err)
    if (authErr) return authErr
    if (err instanceof ServiceError) {
      if (err.status === 404) return notFound(err.message)
      return badRequest(err.message)
    }
    return serverError("Failed to delete employee: " + (err?.message || String(err)))
  }
}