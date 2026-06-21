import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/leave-types/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const body = await parseBody(req);

  const existing = await db.leaveType.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Leave type not found", 404);

  // If code is changing, ensure uniqueness
  const code = body.code !== undefined ? String(body.code).trim() : undefined;
  if (code && code !== existing.code) {
    const dup = await db.leaveType.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (dup) return bad(`Leave type with code '${code}' already exists`, 409);
  }

  const data: any = {};
  if (code !== undefined) data.code = code;
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.color !== undefined) data.color = String(body.color);
  if (body.isPaid !== undefined) data.isPaid = toBool(body.isPaid);
  if (body.fullDayAllowed !== undefined) data.fullDayAllowed = toBool(body.fullDayAllowed);
  if (body.halfDayAllowed !== undefined) data.halfDayAllowed = toBool(body.halfDayAllowed);
  if (body.hourlyAllowed !== undefined) data.hourlyAllowed = toBool(body.hourlyAllowed);
  if (body.monthlyAccrual !== undefined) data.monthlyAccrual = toNum(body.monthlyAccrual, 0) ?? 0;
  if (body.yearlyAccrual !== undefined) data.yearlyAccrual = toNum(body.yearlyAccrual, 0) ?? 0;
  if (body.openingBalance !== undefined) data.openingBalance = toNum(body.openingBalance, 0) ?? 0;
  if (body.carryForward !== undefined) data.carryForward = toBool(body.carryForward);
  if (body.carryForwardLimit !== undefined) data.carryForwardLimit = body.carryForwardLimit ? toNum(body.carryForwardLimit, null) : null;
  if (body.encashment !== undefined) data.encashment = toBool(body.encashment);
  if (body.negativeAllowed !== undefined) data.negativeAllowed = toBool(body.negativeAllowed);
  if (body.attachmentRequired !== undefined) data.attachmentRequired = toBool(body.attachmentRequired);
  if (body.reasonRequired !== undefined) data.reasonRequired = toBool(body.reasonRequired);
  if (body.genderApplicability !== undefined) data.genderApplicability = String(body.genderApplicability);
  if (body.minDays !== undefined) data.minDays = toNum(body.minDays, 1) ?? 1;
  if (body.maxDays !== undefined) data.maxDays = body.maxDays ? toNum(body.maxDays, null) : null;
  if (body.backdatedAllowed !== undefined) data.backdatedAllowed = toBool(body.backdatedAllowed);
  if (body.futureAllowed !== undefined) data.futureAllowed = toBool(body.futureAllowed);
  if (body.status !== undefined) data.status = String(body.status);

  const updated = await db.leaveType.update({ where: { id }, data });
  return ok(updated);
}

// DELETE /api/leave-types/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const existing = await db.leaveType.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Leave type not found", 404);
  await db.leaveType.delete({ where: { id } });
  return ok({ ok: true });
}

function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true" || v === "1" || v === "yes";
  return Boolean(v);
}
function toNum(v: unknown, def: number | null): number | null {
  if (v === undefined || v === null || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
