import { NextRequest } from "next/server"
import { authService } from "@/lib/services/auth.service"
import { ok, badRequest, serverError } from "@/lib/api-response"
import { parseBody } from "@/lib/api-response"

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req)
    const { email, password } = body

    if (!email || !password) {
      return badRequest("Email and password are required")
    }

    const user = await authService.verifyCredentials(String(email), String(password))
    if (!user) {
      return badRequest("Invalid credentials", 401)
    }

    return ok(user)
  } catch (err: any) {
    if (err?.message?.includes("locked")) {
      return serverError(err.message)
    }
    return serverError("Login failed: " + (err?.message || String(err)))
  }
}
