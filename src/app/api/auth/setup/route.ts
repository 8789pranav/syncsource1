import { NextRequest } from "next/server"
import { authService } from "@/lib/services/auth.service"
import { ok, serverError } from "@/lib/api-response"

export async function POST(_req: NextRequest) {
  try {
    const user = await authService.ensureDefaultAdmin()
    if (!user) {
      return ok({ message: "Default admin already exists" })
    }
    return ok({
      message: "Default admin created",
      credentials: { email: "admin@nexushr.com", password: "admin123456" },
    })
  } catch (err: any) {
    return serverError("Setup failed: " + (err?.message || String(err)))
  }
}
