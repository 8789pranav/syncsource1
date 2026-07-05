import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, listResponse } from "@/lib/api-helpers"

// GET /api/payslips?employeeId=&payrollRunId=&status=
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant()
  const url = new URL(req.url)
  const employeeId = url.searchParams.get("employeeId") || undefined
  const payrollRunId = url.searchParams.get("payrollRunId") || undefined
  const status = url.searchParams.get("status") || undefined
  const where: any = { tenantId }
  if (employeeId) where.employeeId = employeeId
  if (payrollRunId) where.payrollRunId = payrollRunId
  if (status) where.status = status
  const items = await db.payslip.findMany({
    where,
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true, department: { select: { name: true } }, designation: { select: { name: true } } } },
    },
    orderBy: { payPeriodStart: "desc" },
  })
  return listResponse(items)
}
