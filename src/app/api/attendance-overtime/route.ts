import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, created, bad, parseBody, listResponse } from "@/lib/api-helpers";

// GET /api/attendance-overtime?employeeId=&status=&from=&to=
export async function GET(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const sp = req.nextUrl.searchParams;
    const where: any = { tenantId };
    if (sp.get("employeeId")) where.employeeId = sp.get("employeeId");
    if (sp.get("status")) where.status = sp.get("status");
    if (sp.get("overtimeType")) where.overtimeType = sp.get("overtimeType");
    if (sp.get("from") || sp.get("to")) {
      where.date = {};
      if (sp.get("from")) where.date.gte = new Date(sp.get("from")!);
      if (sp.get("to")) where.date.lte = new Date(sp.get("to")!);
    }
    const items = await db.attendanceOvertime.findMany({
      where,
      include: {
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true,
          department: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
    });
    return listResponse(items);
  } catch (err: any) {
    return bad("Failed: " + (err?.message || String(err)), 500);
  }
}

// POST /api/attendance-overtime
export async function POST(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const body = await parseBody(req);
    const rec = await db.attendanceOvertime.create({
      data: {
        tenantId,
        employeeId: String(body.employeeId),
        date: body.date ? new Date(body.date) : new Date(),
        shiftHours: Number(body.shiftHours) || 0,
        actualHours: Number(body.actualHours) || 0,
        overtimeHours: Number(body.overtimeHours) || 0,
        overtimeType: body.overtimeType || "Weekday",
        status: "Pending",
        remarks: body.remarks || null,
      },
    });
    return created(rec);
  } catch (err: any) {
    return bad("Failed: " + (err?.message || String(err)), 500);
  }
}
