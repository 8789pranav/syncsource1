import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, created, bad, parseBody, listResponse } from "@/lib/api-helpers";

// GET /api/attendance-rules?status=
export async function GET(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const sp = req.nextUrl.searchParams;
    const where: any = { tenantId };
    if (sp.get("status")) where.status = sp.get("status");
    const items = await db.attendanceRule.findMany({
      where,
      include: { applicabilities: true },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    return listResponse(items);
  } catch (err: any) {
    return bad("Failed: " + (err?.message || String(err)), 500);
  }
}

// POST /api/attendance-rules
export async function POST(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const body = await parseBody(req);
    const name = String(body.name || "").trim();
    const code = String(body.code || "").trim();
    if (!name || !code) return bad("name and code are required");

    const exists = await db.attendanceRule.findUnique({ where: { tenantId_code: { tenantId, code } } });
    if (exists) return bad(`Rule with code '${code}' already exists`, 409);

    const isDefault = Boolean(body.isDefault);
    if (isDefault) {
      await db.attendanceRule.updateMany({ where: { tenantId, isDefault: true }, data: { isDefault: false } });
    }

    const rec = await db.attendanceRule.create({
      data: {
        tenantId,
        name, code,
        description: body.description || null,
        country: body.country || "India",
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : null,
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
        isDefault,
        priority: Number(body.priority) || 0,
        status: body.status || "Active",
        settingsJson: body.settingsJson ? (typeof body.settingsJson === "string" ? body.settingsJson : JSON.stringify(body.settingsJson)) : null,
        createdBy: body.createdBy || null,
      },
      include: { applicabilities: true },
    });

    // Create applicabilities
    const appls = Array.isArray(body.applicabilities) ? body.applicabilities : [];
    for (const a of appls) {
      if (!a || !a.applyTo) continue;
      await db.attendanceRuleApplicability.create({
        data: {
          tenantId,
          attendanceRuleId: rec.id,
          applyTo: a.applyTo,
          entityIds: a.entityIds || null,
          branchIds: a.branchIds || null,
          locationIds: a.locationIds || null,
          departmentIds: a.departmentIds || null,
          designationIds: a.designationIds || null,
          gradeIds: a.gradeIds || null,
          employeeTypeIds: a.employeeTypeIds || null,
          employeeIds: a.employeeIds || null,
          excludeEmployeeIds: a.excludeEmployeeIds || null,
          gender: a.gender || "All",
        },
      });
    }

    return created(rec);
  } catch (err: any) {
    console.error("[attendance-rules POST]", err);
    return bad("Failed: " + (err?.message || String(err)), 500);
  }
}
