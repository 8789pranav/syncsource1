import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";
import { toBool, toNum, toStr } from "@/lib/leave-helpers";

type Params = { params: Promise<{ id: string }> };

// All settable scalar fields on LeaveType (used by PATCH).
// "clubbingWithCsv" is a special type: accepts array or CSV string, stored as CSV string (or null).
const SETTABLE: Record<string, "bool" | "num" | "str" | "numNull" | "clubbingWithCsv"> = {
  code: "str",
  name: "str",
  description: "str",
  color: "str",
  icon: "str",
  displayOrder: "num",
  category: "str",
  isPaid: "bool",
  paidType: "str",
  leaveUnit: "str",
  balanceRequired: "bool",
  negativeAllowed: "bool",
  payrollImpact: "str",
  attendanceImpact: "str",
  genderApplicability: "str",
  maritalApplicability: "str",
  employmentApplicability: "str",
  countryApplicability: "str",
  fullDayAllowed: "bool",
  halfDayAllowed: "bool",
  hourlyAllowed: "bool",
  quarterDayAllowed: "bool",
  monthlyAccrual: "num",
  yearlyAccrual: "num",
  openingBalance: "num",
  carryForward: "bool",
  carryForwardLimit: "numNull",
  encashment: "bool",
  encashmentLimit: "numNull",
  attachmentRequired: "bool",
  attachmentThresholdDays: "num",
  reasonRequired: "bool",
  minDays: "num",
  maxDays: "numNull",
  maxContinuous: "numNull",
  backdatedAllowed: "bool",
  backdatedLimit: "num",
  futureAllowed: "bool",
  futureLimit: "num",
  advanceNotice: "num",
  allowCancellation: "bool",
  allowWithdrawal: "bool",
  allowClubbing: "bool",
  clubbingWith: "clubbingWithCsv",
  sandwichRule: "bool",
  sandwichIncludeWeeklyOff: "bool",
  sandwichIncludeHolidays: "bool",
  showInCalendar: "bool",
  showInPayslip: "bool",
  showBalanceToEmployee: "bool",
  showPolicyToEmployee: "bool",
  allowManagerApply: "bool",
  allowHrApply: "bool",
  status: "str",
};

// PATCH /api/leave-types/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const tenantId = await ensureTenant();
    const { id } = await params;
    const body = await parseBody(req);

    const existing = await db.leaveType.findFirst({ where: { id, tenantId } });
    if (!existing) return bad("Leave type not found", 404);

    // If code is changing, ensure uniqueness
    const code = body.code !== undefined ? toStr(body.code, "")!.trim() : undefined;
    if (code && code !== existing.code) {
      const dup = await db.leaveType.findUnique({
        where: { tenantId_code: { tenantId, code } },
      });
      if (dup) return bad(`Leave type with code '${code}' already exists`, 409);
    }

    const data: any = {};
    for (const [k, kind] of Object.entries(SETTABLE)) {
      if (body[k] === undefined) continue;
      const v = body[k];
      if (kind === "bool") data[k] = toBool(v);
      else if (kind === "num") data[k] = toNum(v, 0) ?? 0;
      else if (kind === "numNull") data[k] = v === "" || v === null ? null : toNum(v, null);
      else if (kind === "clubbingWithCsv") {
        // Accept array or CSV; store as CSV string or null.
        if (v === null) { data[k] = null; continue; }
        if (Array.isArray(v)) {
          const arr = v.map((x: any) => String(x).trim()).filter(Boolean);
          data[k] = arr.length ? arr.join(",") : null;
        } else {
          const s = String(v).trim();
          data[k] = s === "" ? null : s;
        }
      } else data[k] = toStr(v);
    }

    const updated = await db.leaveType.update({
      where: { id },
      data,
      include: { _count: { select: { applications: true } } },
    });
    return ok(updated);
  } catch (err: any) {
    console.error("[leave-types PATCH]", err);
    return bad("Failed to update leave type: " + (err?.message || String(err)), 500);
  }
}

// DELETE /api/leave-types/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await ensureTenant();
    const { id } = await params;
    const existing = await db.leaveType.findFirst({ where: { id, tenantId } });
    if (!existing) return bad("Leave type not found", 404);
    await db.leaveType.delete({ where: { id } });
    return ok({ ok: true });
  } catch (err: any) {
    console.error("[leave-types DELETE]", err);
    return bad("Failed to delete leave type: " + (err?.message || String(err)), 500);
  }
}
