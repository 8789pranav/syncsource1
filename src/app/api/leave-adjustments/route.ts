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
  toDate,
  writeLedger,
  writeAudit,
  computeAvailable,
  upsertBalance,
} from "@/lib/leave-helpers";

// GET /api/leave-adjustments?employeeId=&leaveTypeId=
// Returns all manual adjustments (Credit / Debit) with employee + leaveType.
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const sp = req.nextUrl.searchParams;
  const employeeId = sp.get("employeeId");
  const leaveTypeId = sp.get("leaveTypeId");

  const where: any = { tenantId };
  if (employeeId) where.employeeId = employeeId;
  if (leaveTypeId) where.leaveTypeId = leaveTypeId;

  const items = await db.leaveAdjustment.findMany({
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
    orderBy: { createdAt: "desc" },
  });
  return listResponse(items);
}

// POST /api/leave-adjustments
// Body: { employeeId, leaveTypeId, adjustmentType: "Credit"|"Debit", amount,
//         effectiveDate?, reason?, remarks?, createdBy? }
// Creates: LeaveAdjustment + LeaveLedger (ManualCredit/ManualDebit) +
//          updates LeaveBalance.adjusted + LeaveAuditLog. Transactional.
export async function POST(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const body = await parseBody(req);

    const employeeId = toStr(body.employeeId, "")!.trim();
    const leaveTypeId = toStr(body.leaveTypeId, "")!.trim();
    if (!employeeId) return bad("employeeId is required");
    if (!leaveTypeId) return bad("leaveTypeId is required");

    const adjustmentType =
      toStr(body.adjustmentType, "Credit") === "Debit" ? "Debit" : "Credit";
    const amount = toNum(body.amount, 0) ?? 0;
    if (amount <= 0) return bad("amount must be greater than zero");

    const effectiveDate = toDate(body.effectiveDate) || new Date();
    const reason = toStr(body.reason);
    const remarks = toStr(body.remarks) || reason;
    const createdBy = toStr(body.createdBy, "hr-admin");

    const [employee, leaveType] = await Promise.all([
      db.employee.findFirst({
        where: { id: employeeId, tenantId },
        select: { id: true },
      }),
      db.leaveType.findFirst({
        where: { id: leaveTypeId, tenantId },
        select: { id: true, code: true, name: true },
      }),
    ]);
    if (!employee) return bad("Employee not found", 404);
    if (!leaveType) return bad("Leave type not found", 404);

    const rec = await db.$transaction(async (tx) => {
      // 1. Create the adjustment record.
      const adjustment = await tx.leaveAdjustment.create({
        data: {
          tenantId,
          employeeId,
          leaveTypeId,
          adjustmentType,
          amount,
          effectiveDate,
          reason,
          remarks,
          createdBy,
        },
      });

      // 2. Update LeaveBalance.adjusted (signed delta).
      const year = effectiveDate.getFullYear();
      const existing = await upsertBalance(tx, {
        tenantId,
        employeeId,
        leaveTypeId,
        year,
      });
      const cur = (existing as any).adjusted || 0;
      const delta = adjustmentType === "Credit" ? amount : -amount;
      const bal = await tx.leaveBalance.update({
        where: { id: existing.id },
        data: { adjusted: cur + delta },
      });

      // 3. Write the immutable ledger entry.
      await writeLedger(tx, {
        tenantId,
        employeeId,
        leaveTypeId,
        transactionDate: effectiveDate,
        transactionType: adjustmentType === "Credit" ? "ManualCredit" : "ManualDebit",
        credit: adjustmentType === "Credit" ? amount : 0,
        debit: adjustmentType === "Debit" ? amount : 0,
        referenceType: "LeaveAdjustment",
        referenceId: adjustment.id,
        remarks: remarks || `Manual ${adjustmentType} of ${amount}`,
        createdBy,
      });

      // 4. Audit.
      await writeAudit(tx, {
        tenantId,
        employeeId,
        action: "BalanceAdjusted",
        referenceType: "LeaveAdjustment",
        referenceId: adjustment.id,
        newValue: JSON.stringify({ adjustmentType, amount, year, available: computeAvailable(bal) }),
        performedBy: createdBy,
        reason,
      });

      return adjustment;
    });

    return created(rec);
  } catch (err: any) {
    console.error("[leave-adjustments POST]", err);
    return bad("Failed to create adjustment: " + (err?.message || String(err)), 500);
  }
}
