import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, created, bad, parseBody, listResponse } from "@/lib/api-helpers";

// GET /api/attendance-locks
export async function GET(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const items = await db.attendanceLock.findMany({
      where: { tenantId },
      orderBy: { lockedAt: "desc" },
    });
    return listResponse(items);
  } catch (err: any) {
    return bad("Failed: " + (err?.message || String(err)), 500);
  }
}

// POST /api/attendance-locks — create a lock
export async function POST(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const body = await parseBody(req);
    const rec = await db.attendanceLock.create({
      data: {
        tenantId,
        lockType: body.lockType || "Manual",
        fromDate: body.fromDate ? new Date(body.fromDate) : new Date(),
        toDate: body.toDate ? new Date(body.toDate) : new Date(),
        scope: body.scope || "Tenant",
        scopeId: body.scopeId || null,
        lockedBy: body.lockedBy || "HR Admin",
        unlockApprovalRequired: Boolean(body.unlockApprovalRequired),
        reason: body.reason || null,
      },
    });

    // Apply lock to attendance records in range
    const start = new Date(rec.fromDate); start.setHours(0, 0, 0, 0);
    const end = new Date(rec.toDate); end.setHours(23, 59, 59, 999);
    await db.attendance.updateMany({
      where: { tenantId, date: { gte: start, lte: end } },
      data: { isLocked: true },
    });

    return created(rec);
  } catch (err: any) {
    return bad("Failed: " + (err?.message || String(err)), 500);
  }
}
