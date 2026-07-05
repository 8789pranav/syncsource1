import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const form = await db.formSchema.findFirst({ where: { id, tenantId } });
  if (!form) return bad("Form not found", 404);
  let sections: any = [];
  try { sections = JSON.parse(form.sections); } catch {}
  return ok({ ...form, sections });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const body = await parseBody(req);
  const existing = await db.formSchema.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Form not found", 404);
  const sections = Array.isArray(body.sections) ? body.sections : [];
  try {
    const updated = await db.formSchema.update({
      where: { id },
      data: {
        ...(body.code ? { code: String(body.code) } : {}),
        ...(body.name ? { name: String(body.name) } : {}),
        ...(body.module ? { module: String(body.module) } : {}),
        ...(body.description !== undefined ? { description: body.description ? String(body.description) : null } : {}),
        sections: JSON.stringify(sections),
        ...(body.status ? { status: String(body.status) } : {}),
        version: existing.version + 1,
      },
    });
    await db.auditLog.create({
      data: { tenantId, module: "forms", action: "Update", recordId: id, userName: "HR Admin", details: JSON.stringify({ code: updated.code, version: updated.version }) },
    });
    return ok({ ...updated, sections });
  } catch (e: any) {
    if (String(e?.code || "") === "P2002") return bad("Form code already exists", 409);
    return bad("Failed to update form", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const existing = await db.formSchema.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Form not found", 404);
  await db.formSchema.delete({ where: { id } });
  await db.auditLog.create({
    data: { tenantId, module: "forms", action: "Delete", recordId: id, userName: "HR Admin", details: JSON.stringify({ code: existing.code }) },
  });
  return ok({ ok: true });
}
