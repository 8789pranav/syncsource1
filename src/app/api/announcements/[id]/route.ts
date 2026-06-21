import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const body = await parseBody(req);
  const existing = await db.announcement.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Announcement not found", 404);
  try {
    const updated = await db.announcement.update({
      where: { id },
      data: {
        ...(body.title ? { title: String(body.title) } : {}),
        ...(body.body !== undefined ? { body: body.body ? String(body.body) : null } : {}),
        ...(body.audience ? { audience: String(body.audience) } : {}),
        ...(body.audienceRef !== undefined ? { audienceRef: body.audienceRef ? String(body.audienceRef) : null } : {}),
        ...(body.publishDate ? { publishDate: new Date(body.publishDate) } : {}),
        ...(body.expiryDate !== undefined ? { expiryDate: body.expiryDate ? new Date(body.expiryDate) : null } : {}),
        ...(body.priority ? { priority: String(body.priority) } : {}),
      },
    });
    await db.auditLog.create({
      data: { tenantId, module: "announcements", action: "Update", recordId: id, userName: "HR Admin", details: JSON.stringify({ title: updated.title }) },
    });
    return ok(updated);
  } catch {
    return bad("Failed to update announcement", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const existing = await db.announcement.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Announcement not found", 404);
  await db.announcement.delete({ where: { id } });
  await db.auditLog.create({
    data: { tenantId, module: "announcements", action: "Delete", recordId: id, userName: "HR Admin", details: JSON.stringify({ title: existing.title }) },
  });
  return ok({ ok: true });
}
