import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, created, bad, parseBody, listResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const employeeId = searchParams.get("employeeId") || "";

  const where: any = { tenantId };
  if (status) where.status = status;
  if (employeeId) where.employeeId = employeeId;

  const items = await db.assetRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true, departmentId: true } },
      category: true,
    },
  });
  return listResponse(items);
}

export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant();
  const body = await parseBody(req);
  if (!body.employeeId) return bad("employeeId is required");
  try {
    const req2 = await db.assetRequest.create({
      data: {
        tenantId,
        employeeId: String(body.employeeId),
        categoryId: body.categoryId ? String(body.categoryId) : null,
        requestType: body.requestType ? String(body.requestType) : "New",
        reason: body.reason ? String(body.reason) : null,
        priority: body.priority ? String(body.priority) : "Medium",
        status: "Pending",
      },
      include: { employee: true, category: true },
    });
    await db.auditLog.create({
      data: { tenantId, module: "assetRequest", action: "Create", recordId: req2.id, userName: "HR Admin", details: JSON.stringify({ employeeId: req2.employeeId, type: req2.requestType }) },
    });
    return created(req2);
  } catch {
    return bad("Failed to create asset request", 500);
  }
}
