import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, bad, ensureTenant } from "@/lib/api-helpers";
import { computeAvailable, toDate } from "@/lib/leave-helpers";
// Force re-evaluation after Prisma schema regeneration.

// GET /api/leave-reports?type=balance|ledger|requests|lop|encashment|carryforward|compoff
//                &fromDate=&toDate=&departmentId=&employeeId=&format=json|csv
// Returns JSON { items } by default, or CSV with Content-Disposition for download.
export async function GET(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const sp = req.nextUrl.searchParams;
    const type = sp.get("type") || "balance";
    const fromDate = sp.get("fromDate") ? toDate(sp.get("fromDate")) : null;
    const toDateEnd = sp.get("toDate") ? toDate(sp.get("toDate")) : null;
    const departmentId = sp.get("departmentId");
    const employeeId = sp.get("employeeId");
    const format = sp.get("format") || "json";

    const validTypes = ["balance", "ledger", "requests", "lop", "encashment", "carryforward", "compoff"];
    if (!validTypes.includes(type)) {
      return bad(`Invalid report type. Allowed: ${validTypes.join(", ")}`);
    }

    let rows: any[] = [];
    let headers: string[] = [];
    let filename = `${type}-report.csv`;

    if (type === "balance") {
      headers = ["EmployeeCode", "EmployeeName", "LeaveType", "Year", "Opening", "Accrued", "Granted", "Adjusted", "CarryForward", "Used", "Pending", "Encashed", "Lapsed", "Expired", "Available"];
      const where: any = { tenantId };
      if (employeeId) where.employeeId = employeeId;
      const balances = await db.leaveBalance.findMany({
        where,
        include: {
          employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true, departmentId: true } },
          leaveType: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ employeeId: "asc" }, { year: "desc" }],
      });
      rows = balances
        .filter((b) => !departmentId || b.employee?.departmentId === departmentId)
        .map((b) => ({
          EmployeeCode: b.employee?.employeeCode || "",
          EmployeeName: b.employee?.displayName || [b.employee?.firstName, b.employee?.lastName].filter(Boolean).join(" "),
          LeaveType: b.leaveType?.code || "",
          Year: b.year,
          Opening: b.opening,
          Accrued: b.accrued,
          Granted: b.granted,
          Adjusted: b.adjusted,
          CarryForward: b.carryForward,
          Used: b.used,
          Pending: b.pending,
          Encashed: b.encashed,
          Lapsed: b.lapsed,
          Expired: b.expired,
          Available: computeAvailable(b),
        }));
    } else if (type === "ledger") {
      headers = ["Date", "EmployeeCode", "EmployeeName", "LeaveType", "TransactionType", "Credit", "Debit", "BalanceAfter", "Reference", "Remarks"];
      const where: any = { tenantId };
      if (employeeId) where.employeeId = employeeId;
      if (fromDate || toDateEnd) {
        where.transactionDate = {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDateEnd ? { lte: toDateEnd } : {}),
        };
      }
      const ledger = await db.leaveLedger.findMany({
        where,
        include: {
          employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true, departmentId: true } },
          leaveType: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      });
      rows = ledger
        .filter((l) => !departmentId || l.employee?.departmentId === departmentId)
        .map((l) => ({
          Date: new Date(l.transactionDate).toISOString().slice(0, 10),
          EmployeeCode: l.employee?.employeeCode || "",
          EmployeeName: l.employee?.displayName || [l.employee?.firstName, l.employee?.lastName].filter(Boolean).join(" "),
          LeaveType: l.leaveType?.code || "",
          TransactionType: l.transactionType,
          Credit: l.credit,
          Debit: l.debit,
          BalanceAfter: l.balanceAfter,
          Reference: l.referenceType ? `${l.referenceType}:${l.referenceId || ""}` : "",
          Remarks: l.remarks || "",
        }));
    } else if (type === "requests" || type === "lop") {
      headers = ["AppliedAt", "EmployeeCode", "EmployeeName", "Department", "LeaveType", "FromDate", "ToDate", "Days", "Status", "DecisionAt", "DecisionBy", "Reason"];
      const where: any = { tenantId };
      if (employeeId) where.employeeId = employeeId;
      if (departmentId) where.employee = { departmentId };
      if (type === "lop") {
        where.leaveType = { payrollImpact: "LOP" };
      }
      if (fromDate || toDateEnd) {
        where.appliedAt = {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDateEnd ? { lte: toDateEnd } : {}),
        };
      }
      const apps = await db.leaveApplication.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true, employeeCode: true, firstName: true, lastName: true, displayName: true,
              department: { select: { id: true, name: true } },
            },
          },
          leaveType: { select: { id: true, code: true, name: true } },
        },
        orderBy: { appliedAt: "desc" },
      });
      rows = apps.map((a) => ({
        AppliedAt: new Date(a.appliedAt).toISOString().slice(0, 10),
        EmployeeCode: a.employee?.employeeCode || "",
        EmployeeName: a.employee?.displayName || [a.employee?.firstName, a.employee?.lastName].filter(Boolean).join(" "),
        Department: a.employee?.department?.name || "",
        LeaveType: a.leaveType?.code || "",
        FromDate: new Date(a.fromDate).toISOString().slice(0, 10),
        ToDate: new Date(a.toDate).toISOString().slice(0, 10),
        Days: a.days,
        Status: a.status,
        DecisionAt: a.decisionAt ? new Date(a.decisionAt).toISOString().slice(0, 10) : "",
        DecisionBy: a.decisionBy || "",
        Reason: a.reason || "",
      }));
    } else if (type === "encashment") {
      headers = ["RequestedAt", "EmployeeCode", "EmployeeName", "LeaveType", "Days", "Amount", "Status", "DecisionAt", "DecisionComment"];
      const where: any = { tenantId };
      if (employeeId) where.employeeId = employeeId;
      const encs = await db.leaveEncashmentRequest.findMany({
        where,
        include: {
          employee: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true, departmentId: true },
          },
          leaveType: { select: { id: true, code: true, name: true } },
        },
        orderBy: { requestedAt: "desc" },
      });
      rows = encs
        .filter((e) => !departmentId || e.employee?.departmentId === departmentId)
        .map((e) => ({
          RequestedAt: new Date(e.requestedAt).toISOString().slice(0, 10),
          EmployeeCode: e.employee?.employeeCode || "",
          EmployeeName: e.employee?.displayName || [e.employee?.firstName, e.employee?.lastName].filter(Boolean).join(" "),
          LeaveType: e.leaveType?.code || "",
          Days: e.days,
          Amount: e.amount ?? 0,
          Status: e.status,
          DecisionAt: e.decisionAt ? new Date(e.decisionAt).toISOString().slice(0, 10) : "",
          DecisionComment: e.decisionComment || "",
        }));
    } else if (type === "carryforward") {
      headers = ["ProcessedAt", "EmployeeCode", "EmployeeName", "LeaveType", "FromYear", "ToYear", "CarriedForward", "Lapsed", "Encashed"];
      const logs = await db.leaveCarryForwardLog.findMany({
        where: { tenantId, ...(employeeId ? { employeeId } : {}) },
        include: {
          employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true, departmentId: true } },
          leaveType: { select: { id: true, code: true, name: true } },
        },
        orderBy: { processedAt: "desc" },
      });
      rows = logs
        .filter((l) => !departmentId || l.employee?.departmentId === departmentId)
        .map((l) => ({
          ProcessedAt: new Date(l.processedAt).toISOString().slice(0, 10),
          EmployeeCode: l.employee?.employeeCode || "",
          EmployeeName: l.employee?.displayName || [l.employee?.firstName, l.employee?.lastName].filter(Boolean).join(" "),
          LeaveType: l.leaveType?.code || "",
          FromYear: l.fromYear,
          ToYear: l.toYear,
          CarriedForward: l.carriedForward,
          Lapsed: l.lapsed,
          Encashed: l.encashed,
        }));
    } else if (type === "compoff") {
      headers = ["SourceDate", "EmployeeCode", "EmployeeName", "Source", "Hours", "Days", "ExpiryDate", "Status"];
      const compOffs = await db.compOffCredit.findMany({
        where: { tenantId, ...(employeeId ? { employeeId } : {}) },
        include: {
          employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true, departmentId: true } },
        },
        orderBy: { sourceDate: "desc" },
      });
      rows = compOffs
        .filter((c) => !departmentId || c.employee?.departmentId === departmentId)
        .map((c) => ({
          SourceDate: new Date(c.sourceDate).toISOString().slice(0, 10),
          EmployeeCode: c.employee?.employeeCode || "",
          EmployeeName: c.employee?.displayName || [c.employee?.firstName, c.employee?.lastName].filter(Boolean).join(" "),
          Source: c.source,
          Hours: c.hours,
          Days: c.days,
          ExpiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString().slice(0, 10) : "",
          Status: c.status,
        }));
    }

    // CSV output.
    if (format === "csv") {
      const csv = toCSV(headers, rows);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return ok({ items: rows, type, count: rows.length });
  } catch (err: any) {
    console.error("[leave-reports GET]", err);
    return bad("Failed to generate report: " + (err?.message || String(err)), 500);
  }
}

// RFC-4180-ish CSV serializer.
function toCSV(headers: string[], rows: any[]): string {
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(escape).join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escape((r as any)[h])).join(","));
  }
  return lines.join("\r\n");
}
