import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad } from "@/lib/api-helpers";
import {
  findEmployeesForPolicy,
  toNum,
  computeAvailable,
} from "@/lib/leave-helpers";

type Params = { params: Promise<{ id: string }> };

// POST /api/leave-policies/[id]/recalculate
// Best-effort bulk: for each employee matching the policy's applicability,
// recompute LeaveBalance for the current year based on the rule's items
// (opening + accrued + carryForward) and create LeaveLedger entries.
// Partial success allowed.
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await ensureTenant();
    const { id } = await params;

    const policy = await db.leavePolicy.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        applicabilities: true,
      },
    });
    if (!policy) return bad("Leave policy not found", 404);

    const emps = await findEmployeesForPolicy(db as any, id);
    const year = new Date().getFullYear();
    let processed = 0;
    const errors: { employeeId: string; error: string }[] = [];

    for (const e of emps) {
      try {
        await db.$transaction(async (tx) => {
          for (const item of policy.items) {
            if (!item.isActive) continue;
            const totalEntitlement = toNum(item.totalEntitlement, 0) ?? 0;
            const accrualAmount = toNum(item.accrualAmount, 0) ?? 0;
            // Accrued so far this year (best-effort: pro-rata by months elapsed).
            const now = new Date();
            const monthIdx = now.getMonth(); // 0..11
            const accruedThisYear =
              item.accrualFrequency === "Monthly"
                ? Math.round(accrualAmount * (monthIdx + 1) * 100) / 100
                : item.accrualFrequency === "Quarterly"
                  ? Math.round(accrualAmount * Math.floor((monthIdx + 3) / 3) * 100) / 100
                  : item.accrualFrequency === "Yearly"
                    ? totalEntitlement
                    : 0;

            // Upsert the balance row.
            const existing = await tx.leaveBalance.findUnique({
              where: {
                employeeId_leaveTypeId_year: {
                  employeeId: e.id,
                  leaveTypeId: item.leaveTypeId,
                  year,
                },
              },
            });

            const opening = existing?.opening || 0;
            const carryForward = existing?.carryForward || 0;
            const used = existing?.used || 0;
            const pending = existing?.pending || 0;
            const encashed = existing?.encashed || 0;
            const lapsed = existing?.lapsed || 0;
            const expired = existing?.expired || 0;

            // Set opening = leaveType.openingBalance the first time (if was 0).
            const newOpening = opening > 0 ? opening : 0;
            const newAccrued = Math.max(0, accrualAmount || 0) > 0 ? accruedThisYear : (existing?.accrued || 0);

            const bal = await tx.leaveBalance.upsert({
              where: {
                employeeId_leaveTypeId_year: {
                  employeeId: e.id,
                  leaveTypeId: item.leaveTypeId,
                  year,
                },
              },
              create: {
                tenantId,
                employeeId: e.id,
                leaveTypeId: item.leaveTypeId,
                year,
                opening: newOpening,
                accrued: newAccrued,
                carryForward,
                used,
                pending,
                encashed,
                lapsed,
                expired,
              },
              update: {
                opening: newOpening,
                accrued: newAccrued,
              },
            });

            // Ledger: an "Accrual" credit entry (best-effort, idempotent-ish:
            // we skip if a similar accrual entry already exists for this month).
            if (newAccrued > 0) {
              const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              const existingLedger = await tx.leaveLedger.findFirst({
                where: {
                  tenantId,
                  employeeId: e.id,
                  leaveTypeId: item.leaveTypeId,
                  transactionType: "Accrual",
                  referenceType: "LeavePolicy",
                  referenceId: policy.id,
                  transactionDate: { gte: startOfMonth },
                },
                select: { id: true },
              });
              if (!existingLedger) {
                await tx.leaveLedger.create({
                  data: {
                    tenantId,
                    employeeId: e.id,
                    leaveTypeId: item.leaveTypeId,
                    transactionDate: new Date(),
                    transactionType: "Accrual",
                    credit: newAccrued,
                    debit: 0,
                    balanceAfter: computeAvailable(bal),
                    referenceType: "LeavePolicy",
                    referenceId: policy.id,
                    remarks: `Accrual for ${now.toLocaleString("default", { month: "long" })} ${year}`,
                    createdBy: "system",
                  },
                });
              }
            }
          }
        });
        processed++;
      } catch (err: any) {
        errors.push({ employeeId: e.id, error: err?.message || String(err) });
      }
    }

    return ok({
      policyId: id,
      totalEmployees: emps.length,
      processed,
      errors,
      year,
    });
  } catch (err: any) {
    console.error("[leave-policies recalculate]", err);
    return bad("Failed to recalculate: " + (err?.message || String(err)), 500);
  }
}
