import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";
import {
  toStr,
  writeLedger,
  writeAudit,
  adjustBalance,
  computeAvailable,
} from "@/lib/leave-helpers";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/leave-encashments/[id]
// Body: { action: "Approve"|"Reject", comment?, actorId? }
// Approve: status="Approved", compute amount via formula (Basic/30*Days using
//          latest salary assignment, or 0), "Encashment" ledger debit, balance.encashed += days.
// Reject: status="Rejected".
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const tenantId = await ensureTenant();
    const { id } = await params;
    const body = await parseBody(req);

    const action = toStr(body.action, "")!.trim();
    if (!action) return bad("action is required");
    if (action !== "Approve" && action !== "Reject") {
      return bad("action must be 'Approve' or 'Reject'");
    }

    const comment = toStr(body.comment);
    const actorId = toStr(body.actorId, "hr-admin")!;

    const existing = await db.leaveEncashmentRequest.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return bad("Encashment request not found", 404);
    if (existing.status !== "Pending") {
      return bad(`Request already ${existing.status.toLowerCase()}`);
    }

    const rec = await db.$transaction(async (tx) => {
      if (action === "Reject") {
        const updated = await tx.leaveEncashmentRequest.update({
          where: { id: existing.id },
          data: {
            status: "Rejected",
            decisionAt: new Date(),
            decisionBy: actorId,
            decisionComment: comment,
          },
        });
        await writeAudit(tx, {
          tenantId,
          employeeId: existing.employeeId,
          action: "EncashmentRejected",
          referenceType: "LeaveEncashment",
          referenceId: existing.id,
          newValue: JSON.stringify({ status: "Rejected" }),
          performedBy: actorId,
          reason: comment,
        });
        return updated;
      }

      // Approve: compute amount using formula Basic/30*Days.
      // Fetch the latest active salary assignment for the employee.
      const latestSalary = await tx.salaryAssignment.findFirst({
        where: { employeeId: existing.employeeId, isActive: true },
        orderBy: { effectiveDate: "desc" },
        select: { basic: true, ctc: true },
      });
      const basic = latestSalary?.basic || 0;
      const formula = existing.formula || "Basic/30*Days";
      let amount = 0;
      try {
        // Best-effort formula eval. Supports the canonical "Basic/30*Days"
        // pattern plus arithmetic with operands Basic, Days, Hra, Ctc.
        const expr = formula
          .replace(/\bBasic\b/g, String(basic))
          .replace(/\bDays\b/g, String(existing.days))
          .replace(/\bCtc\b/g, String(latestSalary?.ctc || 0));
        // Safe-ish arithmetic eval — only allow digits and operators.
        if (/^[\d\s+\-*/().]+$/.test(expr)) {
          amount = Math.round(Number(Function(`"use strict"; return (${expr})`)()) * 100) / 100;
        }
      } catch {
        amount = 0;
      }

      const updated = await tx.leaveEncashmentRequest.update({
        where: { id: existing.id },
        data: {
          status: "Approved",
          amount,
          decisionAt: new Date(),
          decisionBy: actorId,
          decisionComment: comment,
        },
      });

      // Ledger: Encashment debit + balance.encashed += days.
      const year = new Date().getFullYear();
      await writeLedger(tx, {
        tenantId,
        employeeId: existing.employeeId,
        leaveTypeId: existing.leaveTypeId,
        transactionDate: new Date(),
        transactionType: "Encashment",
        debit: existing.days,
        referenceType: "LeaveEncashment",
        referenceId: existing.id,
        remarks: `Leave encashed (${existing.days} day(s), amount=${amount})`,
        createdBy: actorId,
      });
      const bal = await adjustBalance(tx, {
        tenantId,
        employeeId: existing.employeeId,
        leaveTypeId: existing.leaveTypeId,
        year,
        field: "encashed",
        delta: existing.days,
      });

      await writeAudit(tx, {
        tenantId,
        employeeId: existing.employeeId,
        action: "EncashmentApproved",
        referenceType: "LeaveEncashment",
        referenceId: existing.id,
        newValue: JSON.stringify({ status: "Approved", amount, available: computeAvailable(bal as any) }),
        performedBy: actorId,
        reason: comment,
      });

      return updated;
    });

    return ok(rec);
  } catch (err: any) {
    console.error("[leave-encashments PATCH]", err);
    return bad("Failed to update encashment request: " + (err?.message || String(err)), 500);
  }
}
