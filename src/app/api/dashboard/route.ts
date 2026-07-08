import { NextRequest } from "next/server"
import { dashboardService } from "@/lib/services/dashboard.service"
import { requireAuth, handleAuthError } from "@/lib/session"
import { ok, serverError } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  try {
    const limited = rateLimit(req)
    if (limited) return limited

    const session = await requireAuth()
    const data = await dashboardService.getDashboardData(session.tenantId)
    return ok(data)
  } catch (err: any) {
    const authErr = handleAuthError(err)
    if (authErr) return authErr
    return serverError("Failed to fetch dashboard data: " + (err?.message || String(err)))
  }
}
