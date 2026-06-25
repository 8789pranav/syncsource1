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
  toBool,
  toNum,
  toStr,
  csvToList,
  listToCsv,
  toDate,
} from "@/lib/leave-helpers";

// GET /api/leave-policies?status=&country=&isDefault=
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const country = sp.get("country");
  const isDefault = sp.get("isDefault");

  const where: any = { tenantId };
  if (status) where.status = status;
  if (country) where.country = country;
  if (isDefault === "true" || isDefault === "1") where.isDefault = true;
  if (isDefault === "false" || isDefault === "0") where.isDefault = false;

  const items = await db.leavePolicy.findMany({
    where,
    include: {
      items: { include: { leaveType: true }, orderBy: { createdAt: "asc" } },
      applicabilities: { orderBy: { createdAt: "asc" } },
      _count: { select: { items: true, applicabilities: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  return listResponse(items);
}

// POST /api/leave-policies — create a policy with nested items + applicabilities.
export async function POST(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const body = await parseBody(req);
    const name = toStr(body.name, "")!.trim();
    const code = toStr(body.code, "")!.trim();
    if (!name || !code) return bad("name and code are required");

    const exists = await db.leavePolicy.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (exists) return bad(`Leave policy with code '${code}' already exists`, 409);

    const isDefault = toBool(body.isDefault, false);

    const rec = await db.$transaction(async (tx) => {
      // If isDefault, unset other defaults first.
      if (isDefault) {
        await tx.leavePolicy.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const policy = await tx.leavePolicy.create({
        data: {
          tenantId,
          name,
          code,
          description: toStr(body.description),
          country: toStr(body.country, "India")!,
          leaveYearType: toStr(body.leaveYearType, "CalendarYear")!,
          calendarStartMonth: toNum(body.calendarStartMonth, 1) ?? 1,
          effectiveFrom: toDate(body.effectiveFrom),
          effectiveTo: toDate(body.effectiveTo),
          isDefault,
          priority: toNum(body.priority, 0) ?? 0,
          status: toStr(body.status, "Active")!,
          settingsJson: toStr(body.settingsJson),
          createdBy: toStr(body.createdBy),
        },
      });

      // Nested items (per leave-type config)
      const items = Array.isArray(body.items) ? body.items : [];
      for (const it of items) {
        if (!it || !it.leaveTypeId) continue;
        await tx.leavePolicyItem.create({
          data: buildItemData(policy.id, it),
        });
      }

      // Applicabilities (replace-all semantics)
      const appls = Array.isArray(body.applicabilities) ? body.applicabilities : [];
      for (const a of appls) {
        if (!a || !a.applyTo) continue;
        await tx.leaveRuleApplicability.create({
          data: buildApplicabilityData(tenantId, policy.id, a),
        });
      }

      return tx.leavePolicy.findUnique({
        where: { id: policy.id },
        include: {
          items: { include: { leaveType: true } },
          applicabilities: true,
          _count: { select: { items: true, applicabilities: true } },
        },
      });
    });

    return created(rec);
  } catch (err: any) {
    console.error("[leave-policies POST]", err);
    return bad("Failed to create leave policy: " + (err?.message || String(err)), 500);
  }
}

// Build a LeavePolicyItem create payload from a raw item object.
function buildItemData(policyId: string, it: any) {
  return {
    leavePolicyId: policyId,
    leaveTypeId: String(it.leaveTypeId),
    displayName: toStr(it.displayName),
    isActive: toBool(it.isActive, true),

    entitlementType: toStr(it.entitlementType, "Fixed")!,
    totalEntitlement: toNum(it.totalEntitlement, 0) ?? 0,
    entitlementUnit: toStr(it.entitlementUnit, "Days")!,
    creditTiming: toStr(it.creditTiming, "YearStart")!,
    prorateNewJoiner: toBool(it.prorateNewJoiner, true),
    roundingRule: toStr(it.roundingRule, "NoRounding")!,

    accrualFrequency: toStr(it.accrualFrequency, "Yearly")!,
    accrualAmount: toNum(it.accrualAmount, 0) ?? 0,
    accrualDate: toNum(it.accrualDate, 1) ?? 1,
    accrualStartFrom: toStr(it.accrualStartFrom, "PolicyStart")!,
    maxAccrualLimit: toNum(it.maxAccrualLimit, null),
    stopAccrualOnLop: toBool(it.stopAccrualOnLop, false),
    stopAccrualOnNotice: toBool(it.stopAccrualOnNotice, false),

    minLeavePerRequest: toNum(it.minLeavePerRequest, 1) ?? 1,
    maxLeavePerRequest: toNum(it.maxLeavePerRequest, null),
    maxContinuous: toNum(it.maxContinuous, null),
    maxPerMonth: toNum(it.maxPerMonth, null),
    maxPerYear: toNum(it.maxPerYear, null),
    minGapBetweenLeaves: toNum(it.minGapBetweenLeaves, 0) ?? 0,

    attachmentRequired: toBool(it.attachmentRequired, false),
    attachmentThresholdDays: toNum(it.attachmentThresholdDays, 0) ?? 0,

    carryForward: toBool(it.carryForward, false),
    maxCarryForward: toNum(it.maxCarryForward, null),
    carryForwardExpiryMonths: toNum(it.carryForwardExpiryMonths, 0) ?? 0,
    carryForwardApprovalRequired: toBool(it.carryForwardApprovalRequired, false),

    encashment: toBool(it.encashment, false),
    encashmentMinBalance: toNum(it.encashmentMinBalance, null),
    encashmentMaxDays: toNum(it.encashmentMaxDays, null),
    encashmentFormula: toStr(it.encashmentFormula),
    encashmentPayrollComponent: toStr(it.encashmentPayrollComponent),

    allowNegativeBalance: toBool(it.allowNegativeBalance, false),
    maxNegativeBalance: toNum(it.maxNegativeBalance, null),

    isLop: toBool(it.isLop, false),
    autoConvertAbsentToLop: toBool(it.autoConvertAbsentToLop, false),

    workflowOverrideJson: toStr(it.workflowOverrideJson),
    clubbingAllowed: toBool(it.clubbingAllowed, true),
    clubbingConfigJson: toStr(it.clubbingConfigJson),

    sandwichRule: toBool(it.sandwichRule, false),
    includeHolidays: toBool(it.includeHolidays, false),
    includeWeeklyOffs: toBool(it.includeWeeklyOffs, false),
    sandwichConfigJson: toStr(it.sandwichConfigJson),
  } as any;
}

// Build a LeaveRuleApplicability create payload from a raw applicability object.
function buildApplicabilityData(tenantId: string, policyId: string, a: any) {
  return {
    tenantId,
    leavePolicyId: policyId,
    applyTo: toStr(a.applyTo, "AllEmployees")!,
    entityIds: listToCsv(csvToList(a.entityIds)),
    branchIds: listToCsv(csvToList(a.branchIds)),
    locationIds: listToCsv(csvToList(a.locationIds)),
    departmentIds: listToCsv(csvToList(a.departmentIds)),
    designationIds: listToCsv(csvToList(a.designationIds)),
    gradeIds: listToCsv(csvToList(a.gradeIds)),
    employeeTypeIds: listToCsv(csvToList(a.employeeTypeIds)),
    employeeIds: listToCsv(csvToList(a.employeeIds)),
    excludeEmployeeIds: listToCsv(csvToList(a.excludeEmployeeIds)),
    gender: toStr(a.gender, "All")!,
  } as any;
}

export { buildItemData, buildApplicabilityData };
