import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, bad, ensureTenant } from "@/lib/api-helpers";
import { csvToList, isoDate } from "@/lib/leave-helpers";

// GET /api/leave-calendar?month=YYYY-MM&departmentId=&employeeId=&view=
// Returns:
//   { days: { [date]: [{ employeeId, employeeName, leaveTypeCode, leaveTypeColor,
//                        status, halfDay }] },
//     holidays: [...], weeklyOffs: [...] }
export async function GET(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const sp = req.nextUrl.searchParams;
    const monthRaw = sp.get("month") || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    const departmentId = sp.get("departmentId");
    const employeeId = sp.get("employeeId");

    // Parse month -> [start, end].
    const m = /^(\d{4})-(\d{2})$/.exec(monthRaw);
    if (!m) return bad("month must be in YYYY-MM format");
    const year = Number(m[1]);
    const mon = Number(m[2]); // 1..12
    if (mon < 1 || mon > 12) return bad("Invalid month");

    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0, 23, 59, 59, 999);

    // Fetch applications overlapping this month.
    const where: any = {
      tenantId,
      fromDate: { lte: end },
      toDate: { gte: start },
    };
    if (employeeId) where.employeeId = employeeId;
    if (departmentId) where.employee = { departmentId };

    const apps = await db.leaveApplication.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
        leaveType: { select: { id: true, code: true, name: true, color: true } },
      },
    });

    // Build per-day map.
    const days: Record<string, any[]> = {};
    for (const a of apps) {
      const from = new Date(a.fromDate); from.setHours(0, 0, 0, 0);
      const to = new Date(a.toDate); to.setHours(0, 0, 0, 0);
      const cur = new Date(Math.max(from.getTime(), start.getTime()));
      const stop = new Date(Math.min(to.getTime(), end.getTime()));
      while (cur <= stop) {
        const key = isoDate(cur);
        if (!days[key]) days[key] = [];
        const name = a.employee?.displayName ||
          [a.employee?.firstName, a.employee?.lastName].filter(Boolean).join(" ") ||
          a.employee?.employeeCode ||
          "";
        days[key].push({
          applicationId: a.id,
          employeeId: a.employeeId,
          employeeName: name,
          leaveTypeCode: a.leaveType?.code || "",
          leaveTypeColor: a.leaveType?.color || "#10b981",
          leaveTypeName: a.leaveType?.name || "",
          status: a.status,
          halfDay: a.halfDay,
          halfDayType: a.halfDayType,
        });
        cur.setDate(cur.getDate() + 1);
      }
    }

    // Holidays in the month.
    const holidays = await db.holiday.findMany({
      where: { tenantId, date: { gte: start, lte: end } },
      select: { id: true, name: true, date: true, type: true, country: true, state: true },
      orderBy: { date: "asc" },
    });

    // Weekly offs config (active).
    const weeklyOffCals = await db.weeklyOffCalendar.findMany({
      where: { tenantId, status: "Active" },
      select: { id: true, name: true, code: true, fixedDays: true, weekOffType: true },
    });

    // Compute the weekday numbers that are weekly offs.
    const weeklyOffDays = new Set<number>();
    for (const w of weeklyOffCals) {
      const daysList = csvToList(w.fixedDays) || [];
      for (const d of daysList) {
        const n = Number(d);
        if (Number.isFinite(n)) weeklyOffDays.add(n);
      }
    }

    // Build a list of weekly off dates in the month.
    const weeklyOffs: { date: string; weekday: number }[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      if (weeklyOffDays.has(cursor.getDay())) {
        weeklyOffs.push({ date: isoDate(cursor), weekday: cursor.getDay() });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return ok({
      month: monthRaw,
      days,
      holidays: holidays.map((h) => ({ ...h, date: isoDate(h.date) })),
      weeklyOffs,
      weeklyOffCalendars: weeklyOffCals,
    });
  } catch (err: any) {
    console.error("[leave-calendar GET]", err);
    return bad("Failed to load calendar: " + (err?.message || String(err)), 500);
  }
}
