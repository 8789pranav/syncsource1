import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, created, bad, parseBody, listResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const category = searchParams.get("category") || "";
  const q = searchParams.get("q") || "";

  const where: any = { tenantId };
  if (status) where.status = status;
  if (category) where.categoryId = category;
  if (q) {
    where.OR = [
      { assetCode: { contains: q } },
      { name: { contains: q } },
      { serialNumber: { contains: q } },
      { assetTag: { contains: q } },
    ];
  }

  const items = await db.asset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });
  // Resolve assignedTo employees separately (no relation on Asset)
  const empIds = items.map((a) => a.assignedToId).filter(Boolean) as string[];
  const emps = empIds.length
    ? await db.employee.findMany({
        where: { id: { in: empIds } },
        select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true },
      })
    : [];
  const empMap = new Map(emps.map((e) => [e.id, e]));
  return listResponse(items.map((a) => ({ ...a, assignedTo: a.assignedToId ? empMap.get(a.assignedToId) || null : null })));
}

export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant();
  const body = await parseBody(req);
  if (!body.assetCode || !body.name) return bad("assetCode and name are required");
  try {
    const data: any = {
      tenantId,
      assetCode: String(body.assetCode),
      name: String(body.name),
      categoryId: body.categoryId ? String(body.categoryId) : null,
      serialNumber: body.serialNumber ? String(body.serialNumber) : null,
      assetTag: body.assetTag ? String(body.assetTag) : null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      purchaseValue: body.purchaseValue !== undefined && body.purchaseValue !== null && body.purchaseValue !== "" ? Number(body.purchaseValue) : null,
      condition: body.condition ? String(body.condition) : "Good",
      status: body.status ? String(body.status) : "In Stock",
      notes: body.notes ? String(body.notes) : null,
    };

    if (body.status === "Assigned" && body.assignedToId) {
      data.assignedToId = String(body.assignedToId);
      data.assignedDate = new Date();
      data.returnDate = null;
    } else if (body.status === "Returned" || body.status === "In Stock") {
      data.assignedToId = null;
      data.returnDate = body.status === "Returned" ? new Date() : null;
    }

    const asset = await db.asset.create({ data });

    if (asset.status === "Assigned" && asset.assignedToId) {
      await db.assetAssignment.create({
        data: {
          assetId: asset.id,
          employeeId: asset.assignedToId,
          assignedDate: asset.assignedDate || new Date(),
          condition: asset.condition,
          notes: "Initial assignment",
        },
      });
    }

    await db.auditLog.create({
      data: { tenantId, module: "asset", action: "Create", recordId: asset.id, userName: "HR Admin", details: JSON.stringify({ code: asset.assetCode, name: asset.name }) },
    });
    return created(asset);
  } catch (e: any) {
    if (String(e?.code || "") === "P2002") return bad("Asset code already exists", 409);
    return bad("Failed to create asset", 500);
  }
}
