import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const body = await parseBody(req);
  const existing = await db.assetCategory.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Category not found", 404);
  try {
    const updated = await db.assetCategory.update({
      where: { id },
      data: {
        ...(body.code !== undefined ? { code: String(body.code) } : {}),
        ...(body.name !== undefined ? { name: String(body.name) } : {}),
        ...(body.icon !== undefined ? { icon: body.icon ? String(body.icon) : null } : {}),
        ...(body.description !== undefined ? { description: body.description ? String(body.description) : null } : {}),
      },
    });
    await db.auditLog.create({
      data: { tenantId, module: "assetCategory", action: "Update", recordId: id, userName: "HR Admin", details: JSON.stringify(body) },
    });
    return ok(updated);
  } catch (e: any) {
    if (String(e?.code || "") === "P2002") return bad("Code already exists", 409);
    return bad("Failed to update category", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const existing = await db.assetCategory.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Category not found", 404);
  await db.assetCategory.delete({ where: { id } });
  await db.auditLog.create({
    data: { tenantId, module: "assetCategory", action: "Delete", recordId: id, userName: "HR Admin", details: JSON.stringify({ code: existing.code }) },
  });
  return ok({ ok: true });
}
