import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, created, bad, parseBody, listResponse } from "@/lib/api-helpers";

// GET /api/attendance-raw-logs?employeeId=&source=&syncStatus=&from=&to=
export async function GET(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const sp = req.nextUrl.searchParams;
    const where: any = { tenantId };
    if (sp.get("employeeId")) where.employeeId = sp.get("employeeId");
    if (sp.get("source")) where.source = sp.get("source");
    if (sp.get("syncStatus")) where.syncStatus = sp.get("syncStatus");
    if (sp.get("processedStatus")) where.processedStatus = sp.get("processedStatus");
    if (sp.get("from") || sp.get("to")) {
      where.punchTime = {};
      if (sp.get("from")) where.punchTime.gte = new Date(sp.get("from")!);
      if (sp.get("to")) where.punchTime.lte = new Date(sp.get("to")!);
    }
    const items = await db.attendanceRawLog.findMany({
      where,
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true,
            department: { select: { name: true } } },
        },
      },
      orderBy: { punchTime: "desc" },
      take: 500,
    });
    return listResponse(items);
  } catch (err: any) {
    console.error("[attendance-raw-logs GET]", err);
    return bad("Failed: " + (err?.message || String(err)), 500);
  }
}

// POST /api/attendance-raw-logs — create a raw log (simulated device punch)
export async function POST(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const body = await parseBody(req);
    const rec = await db.attendanceRawLog.create({
      data: {
        tenantId,
        employeeId: body.employeeId || null,
        deviceEmpId: body.deviceEmpId || null,
        deviceName: body.deviceName || null,
        punchTime: body.punchTime ? new Date(body.punchTime) : new Date(),
        punchType: body.punchType || "In",
        location: body.location || null,
        latitude: body.latitude ? Number(body.latitude) : null,
        longitude: body.longitude ? Number(body.longitude) : null,
        source: body.source || "Biometric",
        syncStatus: body.syncStatus || "Synced",
        errorMessage: body.errorMessage || null,
        processedStatus: body.processedStatus || "Processed",
      },
    });
    return created(rec);
  } catch (err: any) {
    console.error("[attendance-raw-logs POST]", err);
    return bad("Failed: " + (err?.message || String(err)), 500);
  }
}
