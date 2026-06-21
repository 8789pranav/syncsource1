import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, created, bad, parseBody } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

// POST /api/rosters/[id]/entries — add an entry
// Body: { employeeId, shiftId?, date, isWeeklyOff?, isHoliday?, notes? }
export async function POST(req: NextRequest, { params }: Params) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const body = await parseBody(req);

  const roster = await db.roster.findFirst({ where: { id, tenantId } });
  if (!roster) return bad("Roster not found", 404);

  const employeeId = String(body.employeeId || "").trim();
  const dateRaw = body.date ? String(body.date) : "";
  if (!employeeId || !dateRaw) return bad("employeeId and date are required");

  const date = new Date(dateRaw);
  if (isNaN(date.getTime())) return bad("Invalid date");

  const employee = await db.employee.findFirst({ where: { id: employeeId, tenantId } });
  if (!employee) return bad("Employee not found", 404);

  const shiftId = body.shiftId ? String(body.shiftId) : null;
  if (shiftId) {
    const shift = await db.shift.findFirst({ where: { id: shiftId, tenantId } });
    if (!shift) return bad("Shift not found", 404);
  }

  // Upsert: if an entry already exists for (rosterId, employeeId, date), replace it
  const existing = await db.rosterEntry.findFirst({
    where: { rosterId: id, employeeId, date },
  });
  if (existing) {
    const updated = await db.rosterEntry.update({
      where: { id: existing.id },
      data: {
        shiftId,
        isWeeklyOff: toBool(body.isWeeklyOff, false),
        isHoliday: toBool(body.isHoliday, false),
        notes: body.notes ? String(body.notes) : null,
      },
      include: { shift: true, employee: { select: { id: true, firstName: true, lastName: true, displayName: true, employeeCode: true } } },
    });
    return ok(updated);
  }

  const rec = await db.rosterEntry.create({
    data: {
      rosterId: id,
      employeeId,
      shiftId,
      date,
      isWeeklyOff: toBool(body.isWeeklyOff, false),
      isHoliday: toBool(body.isHoliday, false),
      notes: body.notes ? String(body.notes) : null,
    },
    include: { shift: true, employee: { select: { id: true, firstName: true, lastName: true, displayName: true, employeeCode: true } } },
  });
  return created(rec);
}

// DELETE /api/rosters/[id]/entries?entryId=...   (or ?employeeId=&date=)
export async function DELETE(req: NextRequest, { params }: Params) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const entryId = sp.get("entryId");
  const employeeId = sp.get("employeeId");
  const dateStr = sp.get("date");

  const roster = await db.roster.findFirst({ where: { id, tenantId } });
  if (!roster) return bad("Roster not found", 404);

  if (entryId) {
    const entry = await db.rosterEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.rosterId !== id) return bad("Entry not found", 404);
    await db.rosterEntry.delete({ where: { id: entryId } });
    return ok({ ok: true });
  }

  if (employeeId && dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return bad("Invalid date");
    const entry = await db.rosterEntry.findFirst({
      where: { rosterId: id, employeeId, date },
    });
    if (!entry) return bad("Entry not found", 404);
    await db.rosterEntry.delete({ where: { id: entry.id } });
    return ok({ ok: true });
  }

  return bad("Provide entryId or (employeeId & date) to delete an entry");
}

function toBool(v: unknown, def: boolean): boolean {
  if (v === undefined || v === null || v === "") return def;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true" || v === "1" || v === "yes";
  return Boolean(v);
}
