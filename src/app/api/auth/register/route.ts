import { NextRequest } from "next/server"
import { authService } from "@/lib/services/auth.service"
import { ok, badRequest, conflict, serverError } from "@/lib/api-response"
import { parseBody } from "@/lib/api-response"

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req)
    const { email, password, name, role } = body

    if (!email || !password || !name) {
      return badRequest("Email, password, and name are required")
    }

    const user = await authService.register({
      email: String(email),
      password: String(password),
      name: String(name),
      role: role ? String(role) : undefined,
    })

    return ok(user)
  } catch (err: any) {
    if (err?.message?.includes("already exists")) return conflict(err.message)
    if (err?.message?.includes("required") || err?.message?.includes("Password")) {
      return badRequest(err.message)
    }
    return serverError("Registration failed: " + (err?.message || String(err)))
  }
}
