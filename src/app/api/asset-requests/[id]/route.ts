import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const body = await parseBody(req);
  const existing = await db.assetRequest.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Asset request not found", 404);

  const newStatus = body.status ? String(body.status) : existing.status;
  const decisionComment = body.decisionComment ? String(body.decisionComment) : null;

  try {
    const updated = await db.assetRequest.update({
      where: { id },
      data: {
        ...(body.status ? { status: newStatus } : {}),
        ...(body.priority ? { priority: String(body.priority) } : {}),
        ...(body.reason ? { reason: String(body.reason) } : {}),
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId ? String(body.categoryId) : null } : {}),
        ...(body.requestType ? { requestType: String(body.requestType) } : {}),
        updatedAt: new Date(),
      },
      include: { employee: true, category: true },
    });

    await db.auditLog.create({
      data: {
        tenantId,
        module: "assetRequest",
        action: newStatus === "Approved" ? "Approve" : newStatus === "Rejected" ? "Reject" : "Update",
        recordId: id,
        userName: "HR Admin",
        details: JSON.stringify({ from: existing.status, to: newStatus, comment: decisionComment }),
      },
    });
    return ok(updated);
  } catch {
    return bad("Failed to update asset request", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const existing = await db.assetRequest.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Asset request not found", 404);
  await db.assetRequest.delete({ where: { id } });
  return ok({ ok: true });
}
