import { NextRequest } from "next/server"
import { leaveService } from "@/lib/services/leave.service"
import { ServiceError } from "@/lib/services/employee.service"
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

    const result = await leaveService.list({
      tenantId: session.tenantId,
      employeeId: url.searchParams.get("employeeId") || undefined,
      status: url.searchParams.get("status") || undefined,
      leaveTypeId: url.searchParams.get("leaveTypeId") || undefined,
      fromDate: url.searchParams.get("fromDate") || undefined,
      toDate: url.searchParams.get("toDate") || undefined,
      managerId: url.searchParams.get("managerId") || undefined,
      departmentId: url.searchParams.get("departmentId") || undefined,
      page,
      pageSize,
    })

    return paginated(result.items, result.total, page, pageSize)
  } catch (err: any) {
    const authErr = handleAuthError(err)
    if (authErr) return authErr
    if (err instanceof ServiceError) {
      if (err.status === 404) return notFound(err.message)
      return badRequest(err.message)
    }
    return serverError("Failed to fetch leave applications: " + (err?.message || String(err)))
  }
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req)
    if (limited) return limited

    const session = await requireAuth()
    const body = await parseBody(req)

    const result = await leaveService.apply({
      tenantId: session.tenantId,
      employeeId: String(body.employeeId || ""),
      leaveTypeId: String(body.leaveTypeId || ""),
      fromDate: String(body.fromDate || ""),
      toDate: String(body.toDate || ""),
      halfDay: body.halfDay as boolean | undefined,
      halfDayType: body.halfDayType as string | undefined,
      hours: body.hours as number | undefined,
      reason: body.reason as string | undefined,
      attachmentUrl: body.attachmentUrl as string | undefined,
      attachmentName: body.attachmentName as string | undefined,
      emergencyContact: body.emergencyContact as string | undefined,
      backupPersonId: body.backupPersonId as string | undefined,
      handoverNotes: body.handoverNotes as string | undefined,
      notifyTeamMemberIds: body.notifyTeamMemberIds as string | undefined,
      addressDuringLeave: body.addressDuringLeave as string | undefined,
      contactDuringLeave: body.contactDuringLeave as string | undefined,
      extraFieldsJson: body.extraFieldsJson as string | undefined,
      leavePolicyItemId: body.leavePolicyItemId as string | undefined,
    })

    return created(result)
  } catch (err: any) {
    const authErr = handleAuthError(err)
    if (authErr) return authErr
    if (err instanceof ServiceError) {
      if (err.status === 404) return notFound(err.message)
      if (err.status === 409) return conflict(err.message)
      return badRequest(err.message)
    }
    return serverError("Failed to create leave application: " + (err?.message || String(err)))
  }
}
