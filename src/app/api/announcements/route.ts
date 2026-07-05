import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, created, bad, parseBody, listResponse } from "@/lib/api-helpers";

export async function GET() {
  const tenantId = await ensureTenant();
  const items = await db.announcement.findMany({
    where: { tenantId },
    orderBy: { publishDate: "desc" },
  });
  return listResponse(items);
}

export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant();
  const body = await parseBody(req);
  if (!body.title) return bad("title is required");
  try {
    const ann = await db.announcement.create({
      data: {
        tenantId,
        title: String(body.title),
        body: body.body ? String(body.body) : null,
        audience: body.audience ? String(body.audience) : "All",
        audienceRef: body.audienceRef ? String(body.audienceRef) : null,
        publishDate: body.publishDate ? new Date(body.publishDate) : new Date(),
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        priority: body.priority ? String(body.priority) : "Normal",
      },
    });
    await db.auditLog.create({
      data: { tenantId, module: "announcements", action: "Create", recordId: ann.id, userName: "HR Admin", details: JSON.stringify({ title: ann.title }) },
    });
    return created(ann);
  } catch {
    return bad("Failed to create announcement", 500);
  }
}
