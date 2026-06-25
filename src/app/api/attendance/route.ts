import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, listResponse } from "@/lib/api-helpers";

// GET /api/attendance?employeeId=&from=&to= -> { items: [...] }
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const employeeId = req.nextUrl.searchParams.get("employeeId");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const where: any = { tenantId };
  if (employeeId) where.employeeId = employeeId;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  const items = await db.attendance.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          middleName: true,
          lastName: true,
          displayName: true,
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          entity: { select: { id: true, legalName: true, tradeName: true } },
        },
      },
      shift: true,
    },
    orderBy: { date: "desc" },
  });
  return listResponse(items);
}
