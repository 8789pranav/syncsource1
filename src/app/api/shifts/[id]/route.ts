import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/shifts/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const body = await parseBody(req);

  const existing = await db.shift.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Shift not found", 404);

  if (body.code !== undefined) {
    const code = String(body.code).trim();
    if (code && code !== existing.code) {
      const dup = await db.shift.findUnique({
        where: { tenantId_code: { tenantId, code } },
      });
      if (dup) return bad(`Shift with code '${code}' already exists`, 409);
    }
  }

  const data: any = {};
  if (body.code !== undefined) data.code = String(body.code).trim();
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.startTime !== undefined) data.startTime = String(body.startTime);
  if (body.endTime !== undefined) data.endTime = String(body.endTime);
  if (body.breakStart !== undefined) data.breakStart = body.breakStart ? String(body.breakStart) : null;
  if (body.breakEnd !== undefined) data.breakEnd = body.breakEnd ? String(body.breakEnd) : null;
  if (body.workingHours !== undefined) data.workingHours = toNum(body.workingHours, 8) ?? 8;
  if (body.graceMinutes !== undefined) data.graceMinutes = toNum(body.graceMinutes, 15) ?? 15;
  if (body.halfDayHours !== undefined) data.halfDayHours = toNum(body.halfDayHours, 4) ?? 4;
  if (body.fullDayHours !== undefined) data.fullDayHours = toNum(body.fullDayHours, 8) ?? 8;
  if (body.isNightShift !== undefined) data.isNightShift = toBool(body.isNightShift);
  if (body.isFlexible !== undefined) data.isFlexible = toBool(body.isFlexible);
  if (body.autoPunchOut !== undefined) data.autoPunchOut = toBool(body.autoPunchOut);
  if (body.overtimeEligible !== undefined) data.overtimeEligible = toBool(body.overtimeEligible);
  if (body.color !== undefined) data.color = String(body.color);
  if (body.status !== undefined) data.status = String(body.status);

  const updated = await db.shift.update({ where: { id }, data });
  return ok(updated);
}

// DELETE /api/shifts/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const existing = await db.shift.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Shift not found", 404);
  await db.shift.delete({ where: { id } });
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
