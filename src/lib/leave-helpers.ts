// Shared helpers for the Leave module backend.
// All functions are tenant-aware where needed and operate via the provided
// Prisma client (use `db` directly for non-transactional reads, or `tx` for
// inside a `db.$transaction(async (tx) => {...})`).

import type { PrismaClient } from "@prisma/client";

export type Tx = Omit<
  PrismaClient,
  | "$connect"
  | "$disconnect"
  | "$on"
  | "$transaction"
  | "$use"
  | "$extends"
>;

// ----------------------------- type coercion -----------------------------

export function toBool(v: unknown, def = false): boolean {
  if (v === undefined || v === null || v === "") return def;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(s)) return true;
    if (["false", "0", "no", "n", "off"].includes(s)) return false;
  }
  return Boolean(v);
}

export function toNum(v: unknown, def: number | null = 0): number | null {
  if (v === undefined || v === null || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export function toNumNN(v: unknown, def = 0): number {
  const n = toNum(v, def);
  return n === null ? def : n;
}

export function toStr(v: unknown, def: string | null = null): string | null {
  if (v === undefined || v === null || v === "") return def;
  return String(v);
}

export function toStrNN(v: unknown, def = ""): string {
  if (v === undefined || v === null || v === "") return def;
  return String(v);
}

export function toDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(typeof v === "string" ? v : String(v));
  return isNaN(d.getTime()) ? null : d;
}

// comma-separated string -> string[] (filters empties)
export function csvToList(v: unknown): string[] | null {
  if (v === undefined || v === null || v === "") return null;
  if (Array.isArray(v)) {
    const arr = v.map((x) => String(x).trim()).filter(Boolean);
    return arr.length ? arr : null;
  }
  const arr = String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return arr.length ? arr : null;
}

export function listToCsv(arr?: string[] | null): string | null {
  if (!arr || !arr.length) return null;
  return arr.join(",");
}

// ----------------------------- date helpers -----------------------------

// Inclusive day count between two dates (ignoring time component).
export function inclusiveDays(from: Date, to: Date): number {
  const f = new Date(from); f.setHours(0, 0, 0, 0);
  const t = new Date(to); t.setHours(0, 0, 0, 0);
  const ms = t.getTime() - f.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

export function eachDay(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const f = new Date(from); f.setHours(0, 0, 0, 0);
  const t = new Date(to); t.setHours(0, 0, 0, 0);
  if (t < f) return out;
  const cur = new Date(f);
  while (cur <= t) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ISO date (YYYY-MM-DD) — used for holiday lookups.
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ----------------------------- balance ops -----------------------------

export const BALANCE_FIELDS = [
  "opening",
  "accrued",
  "granted",
  "adjusted",
  "carryForward",
  "used",
  "pending",
  "encashed",
  "lapsed",
  "expired",
] as const;

// Compute "available" from a balance row per spec formula:
// opening + accrued + granted + adjusted + carryForward - used - pending - encashed - lapsed - expired
export function computeAvailable(b: {
  opening: number;
  accrued: number;
  granted: number;
  adjusted: number;
  carryForward: number;
  used: number;
  pending: number;
  encashed: number;
  lapsed: number;
  expired: number;
}): number {
  return (
    (b.opening || 0) +
    (b.accrued || 0) +
    (b.granted || 0) +
    (b.adjusted || 0) +
    (b.carryForward || 0) -
    (b.used || 0) -
    (b.pending || 0) -
    (b.encashed || 0) -
    (b.lapsed || 0) -
    (b.expired || 0)
  );
}

// Upsert a balance row keyed on [employeeId, leaveTypeId, year].
export async function upsertBalance(
  tx: Tx,
  args: {
    tenantId: string;
    employeeId: string;
    leaveTypeId: string;
    year: number;
  }
) {
  return tx.leaveBalance.upsert({
    where: {
      employeeId_leaveTypeId_year: {
        employeeId: args.employeeId,
        leaveTypeId: args.leaveTypeId,
        year: args.year,
      },
    },
    create: {
      tenantId: args.tenantId,
      employeeId: args.employeeId,
      leaveTypeId: args.leaveTypeId,
      year: args.year,
    },
    update: {},
  });
}

// Apply a delta to a balance row (signed by `sign`), then return updated row.
export async function adjustBalance(
  tx: Tx,
  args: {
    tenantId: string;
    employeeId: string;
    leaveTypeId: string;
    year: number;
    field: (typeof BALANCE_FIELDS)[number];
    delta: number;
  }
) {
  const b = await upsertBalance(tx, {
    tenantId: args.tenantId,
    employeeId: args.employeeId,
    leaveTypeId: args.leaveTypeId,
    year: args.year,
  });
  const cur = (b as any)[args.field] || 0;
  const next = Math.max(0, cur + args.delta); // never go below zero on materialized fields
  return tx.leaveBalance.update({
    where: { id: b.id },
    data: { [args.field]: next },
  });
}

// Get current balance (creates row if missing).
export async function getBalance(
  tx: Tx,
  args: {
    tenantId: string;
    employeeId: string;
    leaveTypeId: string;
    year: number;
  }
) {
  return upsertBalance(tx, args);
}

// ----------------------------- ledger ops -----------------------------

// Write a LeaveLedger row. Caller is responsible for updating balance separately.
export async function writeLedger(
  tx: Tx,
  args: {
    tenantId: string;
    employeeId: string;
    leaveTypeId: string;
    transactionType: string;
    credit?: number;
    debit?: number;
    referenceType?: string | null;
    referenceId?: string | null;
    applicationId?: string | null;
    remarks?: string | null;
    createdBy?: string | null;
    transactionDate?: Date;
  }
) {
  // Compute balanceAfter from the latest balance row.
  const year = (args.transactionDate || new Date()).getFullYear();
  const bal = await upsertBalance(tx, {
    tenantId: args.tenantId,
    employeeId: args.employeeId,
    leaveTypeId: args.leaveTypeId,
    year,
  });
  const balAfter = computeAvailable(bal);
  return tx.leaveLedger.create({
    data: {
      tenantId: args.tenantId,
      employeeId: args.employeeId,
      leaveTypeId: args.leaveTypeId,
      transactionDate: args.transactionDate || new Date(),
      transactionType: args.transactionType,
      credit: args.credit || 0,
      debit: args.debit || 0,
      balanceAfter: balAfter,
      referenceType: args.referenceType || null,
      referenceId: args.referenceId || null,
      applicationId: args.applicationId || null,
      remarks: args.remarks || null,
      createdBy: args.createdBy || null,
    },
  });
}

// ----------------------------- audit log -----------------------------

export async function writeAudit(
  tx: Tx,
  args: {
    tenantId: string;
    employeeId?: string | null;
    action: string;
    referenceType?: string | null;
    referenceId?: string | null;
    oldValue?: string | null;
    newValue?: string | null;
    performedBy?: string | null;
    reason?: string | null;
    module?: string;
  }
) {
  return tx.leaveAuditLog.create({
    data: {
      tenantId: args.tenantId,
      employeeId: args.employeeId || null,
      module: args.module || "Leave",
      action: args.action,
      referenceType: args.referenceType || null,
      referenceId: args.referenceId || null,
      oldValue: args.oldValue || null,
      newValue: args.newValue || null,
      performedBy: args.performedBy || null,
      reason: args.reason || null,
    },
  });
}

// ----------------------------- approver resolution -----------------------------

// Resolve the approver employee id for a workflow step.
// Returns { approverId, approverName } or null if it cannot be resolved.
export async function resolveApprover(
  dbOrTx: Tx,
  args: {
    tenantId: string;
    step: {
      approverType: string;
      approverId?: string | null;
      approverRole?: string | null;
    };
    employeeId: string; // the applicant
  }
): Promise<{ approverId: string | null; approverName: string | null }> {
  const { step, employeeId, tenantId } = args;
  if (step.approverType === "SpecificEmployee") {
    if (!step.approverId) return { approverId: null, approverName: null };
    const ap = await dbOrTx.employee.findFirst({
      where: { id: step.approverId, tenantId },
      select: { id: true, firstName: true, lastName: true, displayName: true, employeeCode: true },
    });
    return ap
      ? { approverId: ap.id, approverName: empName(ap) }
      : { approverId: null, approverName: null };
  }
  if (step.approverType === "ReportingManager") {
    const emp = await dbOrTx.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: { reportingManagerId: true },
    });
    if (emp?.reportingManagerId) {
      const mgr = await dbOrTx.employee.findFirst({
        where: { id: emp.reportingManagerId, tenantId },
        select: { id: true, firstName: true, lastName: true, displayName: true, employeeCode: true },
      });
      if (mgr) return { approverId: mgr.id, approverName: empName(mgr) };
    }
    return { approverId: null, approverName: null };
  }
  if (step.approverType === "DepartmentHead") {
    const emp = await dbOrTx.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: { departmentId: true },
    });
    if (emp?.departmentId) {
      const dept = await dbOrTx.department.findUnique({
        where: { id: emp.departmentId },
        select: { id: true, name: true, departmentHeadId: true },
      });
      if (dept?.departmentHeadId) {
        const hod = await dbOrTx.employee.findFirst({
          where: { id: dept.departmentHeadId, tenantId },
          select: { id: true, firstName: true, lastName: true, displayName: true, employeeCode: true },
        });
        if (hod) return { approverId: hod.id, approverName: empName(hod) };
      }
    }
    return { approverId: null, approverName: null };
  }
  if (step.approverType === "HRManager") {
    // Heuristic: any employee in HR department whose status=Active.
    const hrDept = await dbOrTx.department.findFirst({
      where: { tenantId, code: { contains: "HR" } },
      select: { id: true },
    });
    const hrEmps = await dbOrTx.employee.findMany({
      where: {
        tenantId,
        employeeStatus: "Active",
        ...(hrDept ? { departmentId: hrDept.id } : {}),
      },
      select: { id: true, firstName: true, lastName: true, displayName: true, employeeCode: true },
      take: 1,
      orderBy: { dateOfJoining: "asc" },
    });
    if (hrEmps[0]) return { approverId: hrEmps[0].id, approverName: empName(hrEmps[0]) };
    // Fallback: any active employee as "HR admin"
    const anyActive = await dbOrTx.employee.findFirst({
      where: { tenantId, employeeStatus: "Active" },
      select: { id: true, firstName: true, lastName: true, displayName: true, employeeCode: true },
      orderBy: { dateOfJoining: "asc" },
    });
    return anyActive
      ? { approverId: anyActive.id, approverName: empName(anyActive) }
      : { approverId: null, approverName: null };
  }
  return { approverId: null, approverName: null };
}

export function empName(e: {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  employeeCode?: string | null;
}): string {
  if (e?.displayName) return e.displayName;
  if (!e) return "";
  const parts = [e.firstName, e.lastName].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return e.employeeCode || "";
}

// ----------------------------- applicability matching -----------------------------

// Check whether an employee matches a LeaveRuleApplicability row.
export async function employeeMatchesApplicability(
  dbOrTx: Tx,
  emp: {
    id: string;
    entityId?: string | null;
    branchId?: string | null;
    locationId?: string | null;
    departmentId?: string | null;
    designationId?: string | null;
    gradeId?: string | null;
    gender?: string | null;
    employmentType?: string | null;
  },
  appl: {
    applyTo: string;
    entityIds?: string | null;
    branchIds?: string | null;
    locationIds?: string | null;
    departmentIds?: string | null;
    designationIds?: string | null;
    gradeIds?: string | null;
    employeeTypeIds?: string | null;
    employeeIds?: string | null;
    excludeEmployeeIds?: string | null;
    gender?: string | null;
  }
): Promise<boolean> {
  // Exclude list applies first
  const exclude = csvToList(appl.excludeEmployeeIds);
  if (exclude && exclude.includes(emp.id)) return false;

  if (appl.gender && appl.gender !== "All") {
    if ((emp.gender || "Male") !== appl.gender) return false;
  }

  switch (appl.applyTo) {
    case "AllEmployees":
      return true;
    case "SelectedEntities": {
      const ids = csvToList(appl.entityIds);
      return !ids || ids.includes(emp.entityId || "");
    }
    case "SelectedLocations": {
      const ids = csvToList(appl.locationIds);
      return !ids || ids.includes(emp.locationId || "");
    }
    case "SelectedDepartments": {
      const ids = csvToList(appl.departmentIds);
      return !ids || ids.includes(emp.departmentId || "");
    }
    case "SelectedGrades": {
      const ids = csvToList(appl.gradeIds);
      return !ids || ids.includes(emp.gradeId || "");
    }
    case "SelectedEmployeeTypes": {
      const ids = csvToList(appl.employeeTypeIds);
      return !ids || ids.includes(emp.employmentType || "");
    }
    case "SpecificEmployees": {
      const ids = csvToList(appl.employeeIds);
      return !!ids && ids.includes(emp.id);
    }
    case "CustomGroup":
      return true;
    default:
      return true;
  }
}

// Find all employees matching ANY applicability of a policy.
export async function findEmployeesForPolicy(
  dbOrTx: Tx,
  policyId: string
): Promise<{ id: string }[]> {
  const appls = await dbOrTx.leaveRuleApplicability.findMany({
    where: { leavePolicyId: policyId },
  });
  if (!appls.length) return [];
  // For performance: iterate applicabilities, build OR clauses when possible.
  const allEmps = await dbOrTx.employee.findMany({
    where: { employeeStatus: { in: ["Active", "On Notice"] } },
    select: {
      id: true,
      entityId: true,
      branchId: true,
      locationId: true,
      departmentId: true,
      designationId: true,
      gradeId: true,
      gender: true,
      employmentType: true,
    },
  });
  const matched = new Set<string>();
  for (const emp of allEmps) {
    for (const a of appls) {
      // need to pass full employee — using await-free matcher
      if (syncMatches(emp as any, a as any)) {
        matched.add(emp.id);
        break;
      }
    }
  }
  return Array.from(matched).map((id) => ({ id }));
}

// Synchronous matcher (subset of employeeMatchesApplicability, no DB calls).
export function syncMatches(
  emp: {
    id: string;
    entityId?: string | null;
    branchId?: string | null;
    locationId?: string | null;
    departmentId?: string | null;
    designationId?: string | null;
    gradeId?: string | null;
    gender?: string | null;
    employmentType?: string | null;
  },
  appl: {
    applyTo: string;
    entityIds?: string | null;
    branchIds?: string | null;
    locationIds?: string | null;
    departmentIds?: string | null;
    designationIds?: string | null;
    gradeIds?: string | null;
    employeeTypeIds?: string | null;
    employeeIds?: string | null;
    excludeEmployeeIds?: string | null;
    gender?: string | null;
  }
): boolean {
  const exclude = csvToList(appl.excludeEmployeeIds);
  if (exclude && exclude.includes(emp.id)) return false;
  if (appl.gender && appl.gender !== "All") {
    if ((emp.gender || "Male") !== appl.gender) return false;
  }
  switch (appl.applyTo) {
    case "AllEmployees":
      return true;
    case "SelectedEntities": {
      const ids = csvToList(appl.entityIds);
      return !ids || ids.includes(emp.entityId || "");
    }
    case "SelectedLocations": {
      const ids = csvToList(appl.locationIds);
      return !ids || ids.includes(emp.locationId || "");
    }
    case "SelectedDepartments": {
      const ids = csvToList(appl.departmentIds);
      return !ids || ids.includes(emp.departmentId || "");
    }
    case "SelectedGrades": {
      const ids = csvToList(appl.gradeIds);
      return !ids || ids.includes(emp.gradeId || "");
    }
    case "SelectedEmployeeTypes": {
      const ids = csvToList(appl.employeeTypeIds);
      return !ids || ids.includes(emp.employmentType || "");
    }
    case "SpecificEmployees": {
      const ids = csvToList(appl.employeeIds);
      return !!ids && ids.includes(emp.id);
    }
    case "CustomGroup":
      return true;
    default:
      return true;
  }
}
