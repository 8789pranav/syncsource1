import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad } from "@/lib/api-helpers"
import { getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

// Status history is read-only.
export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeStatusHistory.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Status history record not found", 404)
  return ok(rec)
}
