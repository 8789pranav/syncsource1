import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/attendance-locks/[id] — unlock (remove lock + clear isLocked on attendance)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await ensureTenant();
    const { id } = await params;
    const existing = await db.attendanceLock.findFirst({ where: { id, tenantId } });
    if (!existing) return bad("Lock not found", 404);

    const start = new Date(existing.fromDate); start.setHours(0, 0, 0, 0);
    const end = new Date(existing.toDate); end.setHours(23, 59, 59, 999);
    await db.attendance.updateMany({
      where: { tenantId, date: { gte: start, lte: end } },
      data: { isLocked: false },
    });
    await db.attendanceLock.delete({ where: { id } });
    return ok({ ok: true });
  } catch (err: any) {
    return bad("Failed: " + (err?.message || String(err)), 500);
  }
}
