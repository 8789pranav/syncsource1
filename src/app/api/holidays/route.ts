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

// GET /api/holidays -> { items: [...] }
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const type = req.nextUrl.searchParams.get("type");
  const country = req.nextUrl.searchParams.get("country");
  const upcoming = req.nextUrl.searchParams.get("upcoming");

  const where: any = { tenantId };
  if (type) where.type = type;
  if (country) where.country = country;

  if (upcoming === "1" || upcoming === "true") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    where.date = { gte: start };
  }

  const items = await db.holiday.findMany({
    where,
    orderBy: { date: "asc" },
  });
  return listResponse(items);
}

// POST /api/holidays
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant();
  const body = await parseBody(req);
  const name = String(body.name || "").trim();
  const dateRaw = body.date ? String(body.date) : "";
  if (!name) return bad("name is required");
  if (!dateRaw) return bad("date is required");

  const date = new Date(dateRaw);
  if (isNaN(date.getTime())) return bad("Invalid date");

  const rec = await db.holiday.create({
    data: {
      tenantId,
      name,
      date,
      type: body.type ? String(body.type) : "National",
      description: body.description ? String(body.description) : null,
      country: body.country ? String(body.country) : "India",
      state: body.state ? String(body.state) : null,
    },
  });
  return created(rec);
}
