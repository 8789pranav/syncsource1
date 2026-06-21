import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  ensureTenant,
  ok,
  created,
  bad,
  parseBody,
  listResponse,
} from "@/lib/api-helpers";

// GET /api/leave-applications?employeeId=&status=
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const employeeId = req.nextUrl.searchParams.get("employeeId");
  const status = req.nextUrl.searchParams.get("status");

  const items = await db.leaveApplication.findMany({
    where: {
      tenantId,
      ...(employeeId ? { employeeId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          middleName: true,
          lastName: true,
          displayName: true,
        },
      },
      leaveType: true,
    },
    orderBy: { appliedAt: "desc" },
  });
  return listResponse(items);
}

// POST /api/leave-applications — apply leave
// Body: { employeeId, leaveTypeId, fromDate, toDate, halfDay?, reason?, attachmentUrl? }
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant();
  const body = await parseBody(req);

  const employeeId = String(body.employeeId || "").trim();
  const leaveTypeId = String(body.leaveTypeId || "").trim();
  const fromRaw = body.fromDate ? String(body.fromDate) : "";
  const toRaw = body.toDate ? String(body.toDate) : "";

  if (!employeeId) return bad("employeeId is required");
  if (!leaveTypeId) return bad("leaveTypeId is required");
  if (!fromRaw || !toRaw) return bad("fromDate and toDate are required");

  const fromDate = new Date(fromRaw);
  const toDate = new Date(toRaw);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return bad("Invalid fromDate / toDate");
  }
  if (toDate < fromDate) return bad("toDate cannot be before fromDate");

  // Verify employee & leave type belong to tenant
  const [employee, leaveType] = await Promise.all([
    db.employee.findFirst({ where: { id: employeeId, tenantId } }),
    db.leaveType.findFirst({ where: { id: leaveTypeId, tenantId } }),
  ]);
  if (!employee) return bad("Employee not found", 404);
  if (!leaveType) return bad("Leave type not found", 404);

  const halfDay = toBool(body.halfDay, false);

  // Compute days: inclusive count; if halfDay -> 0.5
  const days = computeDays(fromDate, toDate, halfDay);

  const rec = await db.leaveApplication.create({
    data: {
      tenantId,
      employeeId,
      leaveTypeId,
      fromDate,
      toDate,
      days,
      halfDay,
      reason: body.reason ? String(body.reason) : null,
      attachmentUrl: body.attachmentUrl ? String(body.attachmentUrl) : null,
      status: "Pending",
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          middleName: true,
          lastName: true,
          displayName: true,
        },
      },
      leaveType: true,
    },
  });
  return created(rec);
}

// Count inclusive days between two dates; halfDay -> 0.5
function computeDays(from: Date, to: Date, halfDay: boolean): number {
  if (halfDay) return 0.5;
  const ms = to.getTime() - from.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const inclusive = Math.floor(ms / dayMs) + 1;
  return Math.max(0.5, inclusive);
}

function toBool(v: unknown, def: boolean): boolean {
  if (v === undefined || v === null || v === "") return def;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true" || v === "1" || v === "yes";
  return Boolean(v);
}
