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
import { toBool, toNum, toStr } from "@/lib/leave-helpers";

// GET /api/leave-types?status=&category=&paidType=
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const category = sp.get("category");
  const paidType = sp.get("paidType");

  const items = await db.leaveType.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(paidType ? { paidType } : {}),
    },
    include: {
      _count: { select: { applications: true, balances: true } },
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
  return listResponse(items);
}

// POST /api/leave-types — accept ALL LeaveType fields with defensive coercion.
// Backward compat: keeps accepting old field names (e.g. isPaid) and newer ones.
export async function POST(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const body = await parseBody(req);
    const code = toStr(body.code, "")!.trim();
    const name = toStr(body.name, "")!.trim();
    if (!code || !name) return bad("code and name are required");

    const exists = await db.leaveType.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (exists) return bad(`Leave type with code '${code}' already exists`, 409);

    const data: any = {
      tenantId,
      code,
      name,
      description: toStr(body.description),
      color: toStr(body.color, "#10b981"),
      icon: toStr(body.icon),
      displayOrder: toNum(body.displayOrder, 0) ?? 0,

      // Classification
      category: toStr(body.category, "Annual")!,
      isPaid: toBool(body.isPaid ?? body.paid, true),
      paidType: toStr(body.paidType, "Paid")!,
      leaveUnit: toStr(body.leaveUnit, "FullDay")!,
      balanceRequired: toBool(body.balanceRequired, true),
      negativeAllowed: toBool(body.negativeAllowed, false),
      payrollImpact: toStr(body.payrollImpact, "Paid")!,
      attendanceImpact: toStr(body.attendanceImpact, "Leave")!,

      // Eligibility
      genderApplicability: toStr(body.genderApplicability, "All")!,
      maritalApplicability: toStr(body.maritalApplicability, "All")!,
      employmentApplicability: toStr(body.employmentApplicability, "All")!,
      countryApplicability: toStr(body.countryApplicability),

      // Allowed modes
      fullDayAllowed: toBool(body.fullDayAllowed, true),
      halfDayAllowed: toBool(body.halfDayAllowed, false),
      hourlyAllowed: toBool(body.hourlyAllowed, false),
      quarterDayAllowed: toBool(body.quarterDayAllowed, false),

      // Accrual defaults
      monthlyAccrual: toNum(body.monthlyAccrual, 0) ?? 0,
      yearlyAccrual: toNum(body.yearlyAccrual, 0) ?? 0,
      openingBalance: toNum(body.openingBalance, 0) ?? 0,

      // Carry forward / encashment
      carryForward: toBool(body.carryForward, false),
      carryForwardLimit: toNum(body.carryForwardLimit, null),
      encashment: toBool(body.encashment, false),
      encashmentLimit: toNum(body.encashmentLimit, null),

      // Document rules
      attachmentRequired: toBool(body.attachmentRequired, false),
      attachmentThresholdDays: toNum(body.attachmentThresholdDays, 0) ?? 0,
      reasonRequired: toBool(body.reasonRequired, true),

      // Application window
      minDays: toNum(body.minDays, 1) ?? 1,
      maxDays: toNum(body.maxDays, null),
      maxContinuous: toNum(body.maxContinuous, null),
      backdatedAllowed: toBool(body.backdatedAllowed, true),
      backdatedLimit: toNum(body.backdatedLimit, 0) ?? 0,
      futureAllowed: toBool(body.futureAllowed, true),
      futureLimit: toNum(body.futureLimit, 0) ?? 0,
      advanceNotice: toNum(body.advanceNotice, 0) ?? 0,

      // Advanced toggles
      allowCancellation: toBool(body.allowCancellation, true),
      allowWithdrawal: toBool(body.allowWithdrawal, true),
      allowClubbing: toBool(body.allowClubbing, true),
      // Clubbing config — comma-separated leave type codes this type can be clubbed with.
      // Accept array or CSV. null/empty = club with all allowed types.
      clubbingWith: (() => {
        const v = body.clubbingWith;
        if (v == null) return null;
        if (Array.isArray(v)) {
          const arr = v.map((x: any) => String(x).trim()).filter(Boolean);
          return arr.length ? arr.join(",") : null;
        }
        const s = String(v).trim();
        return s === "" ? null : s;
      })(),
      // Sandwich rule config
      sandwichRule: toBool(body.sandwichRule, false),
      sandwichIncludeWeeklyOff: toBool(body.sandwichIncludeWeeklyOff, false),
      sandwichIncludeHolidays: toBool(body.sandwichIncludeHolidays, false),
      showInCalendar: toBool(body.showInCalendar, true),
      showInPayslip: toBool(body.showInPayslip, true),
      showBalanceToEmployee: toBool(body.showBalanceToEmployee, true),
      showPolicyToEmployee: toBool(body.showPolicyToEmployee, true),
      allowManagerApply: toBool(body.allowManagerApply, false),
      allowHrApply: toBool(body.allowHrApply, true),

      status: toStr(body.status, "Active")!,
    };

    const rec = await db.leaveType.create({ data, include: { _count: { select: { applications: true } } } });
    return created(rec);
  } catch (err: any) {
    console.error("[leave-types POST]", err);
    return bad("Failed to create leave type: " + (err?.message || String(err)), 500);
  }
}
