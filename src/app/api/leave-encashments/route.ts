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
import {
  toNum,
  toStr,
  writeAudit,
  computeAvailable,
} from "@/lib/leave-helpers";

// GET /api/leave-encashments?employeeId=&status=
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const sp = req.nextUrl.searchParams;
  const employeeId = sp.get("employeeId");
  const status = sp.get("status");

  const where: any = { tenantId };
  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;

  const items = await db.leaveEncashmentRequest.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          displayName: true,
          department: { select: { id: true, name: true } },
        },
      },
      leaveType: {
        select: { id: true, code: true, name: true, color: true },
      },
    },
    orderBy: { requestedAt: "desc" },
  });
  return listResponse(items);
}

// POST /api/leave-encashments
// Body: { employeeId, leaveTypeId, days, formula?, payrollComponent?, remarks? }
// Validates balance >= days. Status = "Pending". Writes audit log.
export async function POST(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const body = await parseBody(req);

    const employeeId = toStr(body.employeeId, "")!.trim();
    const leaveTypeId = toStr(body.leaveTypeId, "")!.trim();
    if (!employeeId) return bad("employeeId is required");
    if (!leaveTypeId) return bad("leaveTypeId is required");

    const days = toNum(body.days, 0) ?? 0;
    if (days <= 0) return bad("days must be greater than zero");

    const formula = toStr(body.formula);
    const payrollComponent = toStr(body.payrollComponent);

    const [employee, leaveType] = await Promise.all([
      db.employee.findFirst({ where: { id: employeeId, tenantId }, select: { id: true } }),
      db.leaveType.findFirst({ where: { id: leaveTypeId, tenantId }, select: { id: true, code: true, name: true, encashment: true, encashmentLimit: true } }),
    ]);
    if (!employee) return bad("Employee not found", 404);
    if (!leaveType) return bad("Leave type not found", 404);
    if (!leaveType.encashment) {
      return bad(`Leave type '${leaveType.code}' does not allow encashment`);
    }
    if (leaveType.encashmentLimit && days > leaveType.encashmentLimit) {
      return bad(
        `Encashment exceeds the limit of ${leaveType.encashmentLimit} days for '${leaveType.code}'`,
      );
    }

    // Validate available balance >= days.
    const year = new Date().getFullYear();
    const balance = await db.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year },
      },
    });
    const available = balance ? computeAvailable(balance) : 0;
    if (available < days) {
      return bad(
        `Insufficient balance. Available: ${available}, requested: ${days}`,
      );
    }

    const rec = await db.$transaction(async (tx) => {
      const enc = await tx.leaveEncashmentRequest.create({
        data: {
          tenantId,
          employeeId,
          leaveTypeId,
          days,
          amount: 0, // computed on approval
          formula,
          payrollComponent,
          status: "Pending",
        },
      });

      await writeAudit(tx, {
        tenantId,
        employeeId,
        action: "EncashmentRequested",
        referenceType: "LeaveEncashment",
        referenceId: enc.id,
        newValue: JSON.stringify({ days, leaveTypeId, formula }),
      });

      return enc;
    });

    return created(rec);
  } catch (err: any) {
    console.error("[leave-encashments POST]", err);
    return bad("Failed to create encashment request: " + (err?.message || String(err)), 500);
  }
}
