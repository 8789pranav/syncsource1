import { ok, bad, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// GET /api/onboarding-settings — returns all settings grouped by category
export async function GET() {
  const tenantId = await ensureTenant()
  const rows = await db.onboardingSetting.findMany({ where: { tenantId } })

  const grouped: Record<string, Record<string, any>> = {}
  for (const r of rows) {
    if (!grouped[r.category]) grouped[r.category] = {}
    let val: any = r.value
    try { val = JSON.parse(r.value || "null") } catch { /* keep raw */ }
    grouped[r.category][r.key] = val
  }
  return ok({ settings: grouped })
}

// PATCH /api/onboarding-settings — bulk upsert
// Body: { settings: { general: { enableOnboardingModule: true, ... }, candidate: {...}, ... } }
export async function PATCH(req: NextRequest) {
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const { settings } = body as any
  if (!settings || typeof settings !== "object") return bad("settings object is required")

  const ops: Promise<any>[] = []
  for (const [category, kv] of Object.entries(settings)) {
    if (!kv || typeof kv !== "object") continue
    for (const [key, value] of Object.entries(kv as Record<string, any>)) {
      const serialized = value === null ? null : JSON.stringify(value)
      ops.push(
        db.onboardingSetting.upsert({
          where: { tenantId_category_key: { tenantId, category, key } },
          create: { tenantId, category, key, value: serialized },
          update: { value: serialized },
        })
      )
    }
  }

  await Promise.all(ops)
  return ok({ saved: true, count: ops.length })
}
