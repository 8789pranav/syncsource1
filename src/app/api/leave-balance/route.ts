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
  computeAvailable,
  writeLedger,
  writeAudit,
} from "@/lib/leave-helpers";

// GET /api/leave-balance?employeeId=&leaveTypeId=&year=&recalculate=1
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const sp = req.nextUrl.searchParams;
  const employeeId = sp.get("employeeId");
  const leaveTypeId = sp.get("leaveTypeId");
  const yearRaw = sp.get("year");
  const recalc = sp.get("recalculate") === "1" || sp.get("recalculate") === "true";
  const year = yearRaw ? Number(yearRaw) : new Date().getFullYear();

  const where: any = { tenantId };
  if (employeeId) where.employeeId = employeeId;
  if (leaveTypeId) where.leaveTypeId = leaveTypeId;
  if (yearRaw) where.year = year;

  let balances = await db.leaveBalance.findMany({
    where,
    include: {
      leaveType: { select: { id: true, code: true, name: true, color: true } },
    },
    orderBy: [{ employeeId: "asc" }, { year: "desc" }],
  });

  if (recalc) {
    // Recompute from ledger (sum credits - debits per type).
    // We will derive a synthetic balance per (employeeId, leaveTypeId, year).
    const keys = new Set<string>();
    for (const b of balances) keys.add(`${b.employeeId}|${b.leaveTypeId}|${b.year}`);

    // Also include employees/leave types that have ledger entries but no balance row.
    const ledgerWhere: any = { tenantId };
    if (employeeId) ledgerWhere.employeeId = employeeId;
    if (leaveTypeId) ledgerWhere.leaveTypeId = leaveTypeId;
    if (yearRaw) ledgerWhere.transactionDate = {
      gte: new Date(year, 0, 1),
      lte: new Date(year, 11, 31, 23, 59, 59),
    };
    const ledger = await db.leaveLedger.findMany({
      where: ledgerWhere,
      select: {
        employeeId: true,
        leaveTypeId: true,
        transactionDate: true,
        transactionType: true,
        credit: true,
        debit: true,
      },
    });
    // Group by key.
    const map = new Map<string, any>();
    for (const l of ledger) {
      const ly = (l.transactionDate as Date).getFullYear();
      if (yearRaw && ly !== year) continue;
      const key = `${l.employeeId}|${l.leaveTypeId}|${ly}`;
      if (!map.has(key)) {
        map.set(key, {
          employeeId: l.employeeId,
          leaveTypeId: l.leaveTypeId,
          year: ly,
          opening: 0,
          accrued: 0,
          granted: 0,
          adjusted: 0,
          carryForward: 0,
          used: 0,
          pending: 0,
          encashed: 0,
          lapsed: 0,
          expired: 0,
        });
      }
      const row = map.get(key);
      const c = l.credit || 0;
      const d = l.debit || 0;
      switch (l.transactionType) {
        case "OpeningBalance":
        case "Migration":
          row.opening += c - d;
          break;
        case "Accrual":
          row.accrued += c - d;
          break;
        case "ManualCredit":
          row.granted += c - d;
          break;
        case "ManualDebit":
          row.adjusted += c - d;
          break;
        case "CarryForward":
          row.carryForward += c - d;
          break;
        case "LeaveApplied":
          row.pending += d - c;
          break;
        case "LeaveApproved":
          row.used += d - c;
          break;
        case "LeaveCancelled":
        case "LeaveRejected":
        case "LeaveWithdrawn":
          // Reversal of pending/used — handled by the original side.
          break;
        case "Encashment":
          row.encashed += d - c;
          break;
        case "Lapse":
          row.lapsed += d - c;
          break;
        case "PayrollAdjustment":
          row.adjusted += c - d;
          break;
        default:
          break;
      }
    }

    // Merge with leave type info.
    const leaveTypes = await db.leaveType.findMany({
      where: { tenantId, ...(leaveTypeId ? { id: leaveTypeId } : {}) },
      select: { id: true, code: true, name: true, color: true },
    });
    const ltMap = new Map(leaveTypes.map((lt) => [lt.id, lt]));

    const items = Array.from(map.values()).map((b) => ({
      ...b,
      leaveType: ltMap.get(b.leaveTypeId) || null,
      available: computeAvailable(b),
      recalculated: true,
    }));
    return listResponse(items);
  }

  const items = balances.map((b: any) => ({
    ...b,
    available: computeAvailable(b),
  }));
  return listResponse(items);
}

// POST /api/leave-balance — create/upsert a LeaveBalance for {employeeId, leaveTypeId, year}
// Body: { employeeId, leaveTypeId, year?, adjustmentType: "Credit"|"Debit", amount, reason?, createdBy? }
// Also creates a LeaveLedger entry ("ManualCredit" or "ManualDebit") and a LeaveAdjustment row.
export async function POST(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const body = await parseBody(req);
    const employeeId = toStr(body.employeeId, "")!.trim();
    const leaveTypeId = toStr(body.leaveTypeId, "")!.trim();
    if (!employeeId) return bad("employeeId is required");
    if (!leaveTypeId) return bad("leaveTypeId is required");
    const year = body.year ? Number(body.year) : new Date().getFullYear();
    const adjustmentType = toStr(body.adjustmentType, "Credit")! === "Debit" ? "Debit" : "Credit";
    const amount = toNum(body.amount, 0) ?? 0;
    if (amount <= 0) return bad("amount must be greater than zero");
    const reason = toStr(body.reason);
    const createdBy = toStr(body.createdBy, "hr-admin");

    const [employee, leaveType] = await Promise.all([
      db.employee.findFirst({ where: { id: employeeId, tenantId }, select: { id: true } }),
      db.leaveType.findFirst({ where: { id: leaveTypeId, tenantId }, select: { id: true, code: true } }),
    ]);
    if (!employee) return bad("Employee not found", 404);
    if (!leaveType) return bad("Leave type not found", 404);

    const rec = await db.$transaction(async (tx) => {
      // Upsert balance.
      const existing = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year },
        },
      });
      const bal = await tx.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year },
        },
        create: {
          tenantId,
          employeeId,
          leaveTypeId,
          year,
          adjusted: adjustmentType === "Credit" ? amount : -amount,
        },
        update: {
          adjusted: (existing?.adjusted || 0) + (adjustmentType === "Credit" ? amount : -amount),
        },
      });

      // Adjustment record.
      const adjustment = await tx.leaveAdjustment.create({
        data: {
          tenantId,
          employeeId,
          leaveTypeId,
          adjustmentType,
          amount,
          effectiveDate: new Date(),
          reason,
          remarks: reason,
          createdBy,
        },
      });

      // Ledger entry.
      await writeLedger(tx, {
        tenantId,
        employeeId,
        leaveTypeId,
        transactionType: adjustmentType === "Credit" ? "ManualCredit" : "ManualDebit",
        credit: adjustmentType === "Credit" ? amount : 0,
        debit: adjustmentType === "Debit" ? amount : 0,
        referenceType: "LeaveAdjustment",
        referenceId: adjustment.id,
        remarks: reason || `Manual ${adjustmentType} of ${amount}`,
        createdBy,
      });

      await writeAudit(tx, {
        tenantId,
        employeeId,
        action: "BalanceAdjusted",
        referenceType: "LeaveAdjustment",
        referenceId: adjustment.id,
        newValue: JSON.stringify({ adjustmentType, amount, year }),
        performedBy: createdBy,
        reason,
      });

      return { balance: bal, adjustment };
    });

    return created(rec);
  } catch (err: any) {
    console.error("[leave-balance POST]", err);
    return bad("Failed to adjust balance: " + (err?.message || String(err)), 500);
  }
}
