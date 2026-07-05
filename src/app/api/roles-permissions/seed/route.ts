import { ok, bad } from "@/lib/api-helpers"
import { seedRolesAndPermissions } from "@/lib/permissions-audit"

export async function POST() {
  try {
    const result = await seedRolesAndPermissions()
    return ok(result)
  } catch (e: any) {
    return bad(`Seed failed: ${e.message}`, 500)
  }
}
