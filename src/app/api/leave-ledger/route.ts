import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, listResponse } from "@/lib/api-helpers";
import { toDate } from "@/lib/leave-helpers";

// GET /api/leave-ledger?employeeId=&leaveTypeId=&fromDate=&toDate=&transactionType=
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const sp = req.nextUrl.searchParams;
  const employeeId = sp.get("employeeId");
  const leaveTypeId = sp.get("leaveTypeId");
  const fromDate = sp.get("fromDate");
  const toDateParam = sp.get("toDate");
  const transactionType = sp.get("transactionType");

  const where: any = { tenantId };
  if (employeeId) where.employeeId = employeeId;
  if (leaveTypeId) where.leaveTypeId = leaveTypeId;
  if (transactionType) where.transactionType = transactionType;
  if (fromDate || toDateParam) {
    where.transactionDate = {
      ...(fromDate ? { gte: toDate(fromDate)! } : {}),
      ...(toDateParam ? { lte: toDate(toDateParam)! } : {}),
    };
  }

  const items = await db.leaveLedger.findMany({
    where,
    include: {
      leaveType: { select: { id: true, code: true, name: true, color: true } },
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          displayName: true,
        },
      },
    },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  });
  return listResponse(items);
}
