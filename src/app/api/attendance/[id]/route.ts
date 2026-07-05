import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/attendance/[id] — regularize
// Body: { status?, clockIn?, clockOut?, remarks?, isLate?, isEarlyGoing?, source? }
export async function PATCH(req: NextRequest, { params }: Params) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const body = await parseBody(req);

  const existing = await db.attendance.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Attendance record not found", 404);

  const data: any = {};
  if (body.status !== undefined) data.status = String(body.status);
  if (body.clockIn !== undefined) {
    data.clockIn = body.clockIn ? new Date(body.clockIn) : null;
  }
  if (body.clockOut !== undefined) {
    data.clockOut = body.clockOut ? new Date(body.clockOut) : null;
  }
  if (body.remarks !== undefined) data.remarks = body.remarks ? String(body.remarks) : null;
  if (body.isLate !== undefined) data.isLate = toBool(body.isLate);
  if (body.isEarlyGoing !== undefined) data.isEarlyGoing = toBool(body.isEarlyGoing);
  if (body.source !== undefined) data.source = String(body.source);

  // Recompute workHours if clockIn/clockOut both present
  const ci = data.clockIn !== undefined ? data.clockIn : existing.clockIn;
  const co = data.clockOut !== undefined ? data.clockOut : existing.clockOut;
  if (ci && co) {
    const diffMs = (co as Date).getTime() - (ci as Date).getTime();
    data.workHours = diffMs > 0 ? Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100 : 0;
  } else if ((ci && !co) || (!ci && co)) {
    data.workHours = 0;
  }

  const updated = await db.attendance.update({
    where: { id },
    data,
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          middleName: true,
          lastName: true,
          displayName: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
  });
  return ok(updated);
}

function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true" || v === "1" || v === "yes";
  return Boolean(v);
}
