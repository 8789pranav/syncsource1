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

// GET /api/rosters -> { items: [...] }
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const status = req.nextUrl.searchParams.get("status");
  const items = await db.roster.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    orderBy: { startDate: "desc" },
    include: { _count: { select: { entries: true } } },
  });
  return listResponse(items);
}

// POST /api/rosters
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant();
  const body = await parseBody(req);
  const name = String(body.name || "").trim();
  const code = String(body.code || "").trim();
  const startRaw = body.startDate ? String(body.startDate) : "";
  const endRaw = body.endDate ? String(body.endDate) : "";
  if (!name || !code) return bad("name and code are required");
  if (!startRaw || !endRaw) return bad("startDate and endDate are required");

  const startDate = new Date(startRaw);
  const endDate = new Date(endRaw);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return bad("Invalid startDate / endDate");
  }
  if (endDate < startDate) return bad("endDate cannot be before startDate");

  const exists = await db.roster.findUnique({
    where: { tenantId_code: { tenantId, code } },
  });
  if (exists) return bad(`Roster with code '${code}' already exists`, 409);

  const rec = await db.roster.create({
    data: {
      tenantId,
      name,
      code,
      startDate,
      endDate,
      cycle: body.cycle ? String(body.cycle) : "Weekly",
      status: body.status ? String(body.status) : "Draft",
    },
  });
  return created(rec);
}
