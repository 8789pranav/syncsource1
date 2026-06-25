import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/attendance-overtime/[id] — approve/reject/send-to-payroll
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const tenantId = await ensureTenant();
    const { id } = await params;
    const body = await parseBody(req);
    const existing = await db.attendanceOvertime.findFirst({ where: { id, tenantId } });
    if (!existing) return bad("Overtime record not found", 404);

    const data: any = {};
    if (body.status) {
      data.status = String(body.status);
      if (body.status === "Approved") {
        data.approvedBy = body.approvedBy || "Approver";
        data.approvedAt = new Date();
      }
    }
    if (body.payrollStatus) data.payrollStatus = String(body.payrollStatus);
    if (body.remarks !== undefined) data.remarks = body.remarks;
    if (body.overtimeHours !== undefined) data.overtimeHours = Number(body.overtimeHours);

    const updated = await db.attendanceOvertime.update({ where: { id }, data });
    return ok(updated);
  } catch (err: any) {
    return bad("Failed: " + (err?.message || String(err)), 500);
  }
}
