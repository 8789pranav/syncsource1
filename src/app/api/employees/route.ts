import { NextRequest } from "next/server"
import { employeeService, ServiceError } from "@/lib/services/employee.service"
import { requireAuth, handleAuthError } from "@/lib/session"
import { ok, created, paginated, badRequest, notFound, conflict, serverError, parseBody, getPaginationParams } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  try {
    const limited = rateLimit(req)
    if (limited) return limited

    const session = await requireAuth()
    const url = new URL(req.url)
    const { page, pageSize } = getPaginationParams(url)

    const result = await employeeService.list({
      tenantId: session.tenantId,
      q: url.searchParams.get("q") || undefined,
      departmentId: url.searchParams.get("departmentId") || undefined,
      entityId: url.searchParams.get("entityId") || undefined,
      branchId: url.searchParams.get("branchId") || undefined,
      status: url.searchParams.get("status") || undefined,
      page,
      pageSize,
      sortBy: url.searchParams.get("sortBy") || undefined,
      sortOrder: (url.searchParams.get("sortOrder") as "asc" | "desc") || undefined,
    })

    return paginated(result.items, result.total, page, pageSize)
  } catch (err: any) {
    const authErr = handleAuthError(err)
    if (authErr) return authErr
    if (err instanceof ServiceError) {
      if (err.status === 404) return notFound(err.message)
      if (err.status === 409) return conflict(err.message)
      return badRequest(err.message)
    }
    return serverError("Failed to fetch employees: " + (err?.message || String(err)))
  }
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req)
    if (limited) return limited

    const session = await requireAuth()
    const body = await parseBody(req)

    const rec = await employeeService.create(body, session.tenantId, session.name)
    return created(rec)
  } catch (err: any) {
    const authErr = handleAuthError(err)
    if (authErr) return authErr
    if (err instanceof ServiceError) {
      if (err.status === 409) return conflict(err.message)
      return badRequest(err.message)
    }
    return serverError("Failed to create employee: " + (err?.message || String(err)))
  }
}
