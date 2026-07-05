import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad } from "@/lib/api-helpers";
import {
  writeLedger,
  writeAudit,
  computeAvailable,
  upsertBalance,
} from "@/lib/leave-helpers";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/leave-adjustments/[id]
// Reverses the effect of a manual adjustment: writes a counter ledger entry,
// reverses the balance delta, deletes the adjustment, and writes an audit log.
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const tenantId = await ensureTenant();
    const { id } = await params;
    const actorId = req.nextUrl.searchParams.get("actorId") || "hr-admin";

    const existing = await db.leaveAdjustment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return bad("Leave adjustment not found", 404);

    await db.$transaction(async (tx) => {
      const year = existing.effectiveDate.getFullYear();
      const delta =
        existing.adjustmentType === "Credit" ? -existing.amount : existing.amount;

      // Reverse balance.adjusted
      const bal = await upsertBalance(tx, {
        tenantId,
        employeeId: existing.employeeId,
        leaveTypeId: existing.leaveTypeId,
        year,
      });
      const cur = (bal as any).adjusted || 0;
      const updated = await tx.leaveBalance.update({
        where: { id: bal.id },
        data: { adjusted: cur + delta },
      });

      // Counter ledger entry.
      await writeLedger(tx, {
        tenantId,
        employeeId: existing.employeeId,
        leaveTypeId: existing.leaveTypeId,
        transactionDate: new Date(),
        transactionType:
          existing.adjustmentType === "Credit" ? "ManualDebit" : "ManualCredit",
        credit: existing.adjustmentType === "Credit" ? 0 : existing.amount,
        debit: existing.adjustmentType === "Credit" ? existing.amount : 0,
        referenceType: "LeaveAdjustment",
        referenceId: existing.id,
        remarks: `Reversal of adjustment ${existing.id}`,
        createdBy: actorId,
      });

      // Audit.
      await writeAudit(tx, {
        tenantId,
        employeeId: existing.employeeId,
        action: "BalanceAdjustmentReversed",
        referenceType: "LeaveAdjustment",
        referenceId: existing.id,
        oldValue: JSON.stringify({
          adjustmentType: existing.adjustmentType,
          amount: existing.amount,
        }),
        newValue: JSON.stringify({ available: computeAvailable(updated) }),
        performedBy: actorId,
        reason: "Adjustment deleted",
      });

      await tx.leaveAdjustment.delete({ where: { id: existing.id } });
    });

    return ok({ ok: true });
  } catch (err: any) {
    console.error("[leave-adjustments DELETE]", err);
    return bad("Failed to delete adjustment: " + (err?.message || String(err)), 500);
  }
}
