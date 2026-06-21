import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";

async function closeOpenAssignment(assetId: string, returnDate: Date) {
  const open = await db.assetAssignment.findFirst({
    where: { assetId, returnDate: null },
    orderBy: { assignedDate: "desc" },
  });
  if (open) {
    await db.assetAssignment.update({ where: { id: open.id }, data: { returnDate } });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const asset = await db.asset.findFirst({
    where: { id, tenantId },
    include: {
      category: true,
      assignments: {
        include: { employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true } } },
        orderBy: { assignedDate: "desc" },
      },
    },
  });
  if (!asset) return bad("Asset not found", 404);
  // Resolve assignedTo (no relation on Asset)
  let assignedTo: any = null;
  if (asset.assignedToId) {
    const e = await db.employee.findUnique({
      where: { id: asset.assignedToId },
      select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true },
    });
    assignedTo = e;
  }
  return ok({ ...asset, assignedTo });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const body = await parseBody(req);
  const existing = await db.asset.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Asset not found", 404);

  const data: any = {};
  for (const k of ["assetCode", "name", "serialNumber", "assetTag", "condition", "status", "notes"]) {
    if (body[k] !== undefined) data[k] = body[k] === null || body[k] === "" ? null : String(body[k]);
  }
  if (body.categoryId !== undefined) data.categoryId = body.categoryId ? String(body.categoryId) : null;
  if (body.purchaseDate !== undefined) data.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
  if (body.purchaseValue !== undefined && body.purchaseValue !== "") {
    data.purchaseValue = body.purchaseValue === null ? null : Number(body.purchaseValue);
  }

  const newStatus = body.status ? String(body.status) : existing.status;

  // Assignment logic
  if (newStatus === "Assigned" && body.assignedToId) {
    data.assignedToId = String(body.assignedToId);
    data.assignedDate = new Date();
    data.returnDate = null;
  } else if (newStatus === "Returned") {
    data.assignedToId = null;
    data.returnDate = new Date();
  } else if (newStatus === "In Stock") {
    data.assignedToId = null;
    data.returnDate = null;
  } else if (body.assignedToId !== undefined) {
    data.assignedToId = body.assignedToId ? String(body.assignedToId) : null;
  }

  try {
    const updated = await db.asset.update({ where: { id }, data });

    // Manage AssetAssignment records
    if (newStatus === "Assigned" && body.assignedToId && body.assignedToId !== existing.assignedToId) {
      // close any prior open assignment on this asset
      await closeOpenAssignment(id, new Date());
      await db.assetAssignment.create({
        data: {
          assetId: id,
          employeeId: String(body.assignedToId),
          assignedDate: updated.assignedDate || new Date(),
          condition: updated.condition,
          notes: "Reassigned",
        },
      });
    } else if (newStatus === "Returned" || newStatus === "In Stock") {
      await closeOpenAssignment(id, new Date());
    }
    await db.auditLog.create({
      data: { tenantId, module: "asset", action: "Update", recordId: id, userName: "HR Admin", details: JSON.stringify(body) },
    });
    return ok(updated);
  } catch (e: any) {
    if (String(e?.code || "") === "P2002") return bad("Asset code already exists", 409);
    return bad("Failed to update asset", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const existing = await db.asset.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Asset not found", 404);
  await db.asset.delete({ where: { id } });
  await db.auditLog.create({
    data: { tenantId, module: "asset", action: "Delete", recordId: id, userName: "HR Admin", details: JSON.stringify({ code: existing.assetCode }) },
  });
  return ok({ ok: true });
}
