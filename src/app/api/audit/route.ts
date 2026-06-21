import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, listResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const { searchParams } = new URL(req.url);
  const moduleFilter = searchParams.get("module") || "";
  const limit = Number(searchParams.get("limit") || "100");

  const where: any = { tenantId };
  if (moduleFilter) where.module = moduleFilter;

  const items = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 500),
  });
  return listResponse(items);
}
