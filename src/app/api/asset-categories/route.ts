import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, created, bad, parseBody, listResponse } from "@/lib/api-helpers";

export async function GET() {
  const tenantId = await ensureTenant();
  const items = await db.assetCategory.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: { _count: { select: { assets: true } } },
  });
  return listResponse(
    items.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      icon: c.icon,
      description: c.description,
      assetCount: c._count.assets,
      createdAt: c.createdAt,
    })),
  );
}

export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant();
  const body = await parseBody(req);
  if (!body.code || !body.name) return bad("code and name are required");
  try {
    const cat = await db.assetCategory.create({
      data: {
        tenantId,
        code: String(body.code),
        name: String(body.name),
        icon: body.icon ? String(body.icon) : null,
        description: body.description ? String(body.description) : null,
      },
    });
    await db.auditLog.create({
      data: {
        tenantId,
        module: "assetCategory",
        action: "Create",
        recordId: cat.id,
        userName: "HR Admin",
        details: JSON.stringify({ code: cat.code, name: cat.name }),
      },
    });
    return created(cat);
  } catch (e: any) {
    if (String(e?.code || "") === "P2002") return bad("Code already exists", 409);
    return bad("Failed to create category", 500);
  }
}
