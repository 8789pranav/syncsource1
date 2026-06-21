import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/holidays/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const body = await parseBody(req);

  const existing = await db.holiday.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Holiday not found", 404);

  const data: any = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.date !== undefined) {
    const d = new Date(body.date);
    if (isNaN(d.getTime())) return bad("Invalid date");
    data.date = d;
  }
  if (body.type !== undefined) data.type = String(body.type);
  if (body.description !== undefined) data.description = body.description ? String(body.description) : null;
  if (body.country !== undefined) data.country = String(body.country);
  if (body.state !== undefined) data.state = body.state ? String(body.state) : null;

  const updated = await db.holiday.update({ where: { id }, data });
  return ok(updated);
}

// DELETE /api/holidays/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const existing = await db.holiday.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Holiday not found", 404);
  await db.holiday.delete({ where: { id } });
  return ok({ ok: true });
}
