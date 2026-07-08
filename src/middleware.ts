import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/seed", "/api/onboarding-seed", "/api/roles-permissions/seed"]

function isPublic(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  // For API routes, the Python backend handles auth via JWT Bearer token.
  // The frontend apiFetch() adds the token automatically.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // For page routes, check for token cookie
  const token = req.cookies.get("access_token")?.value

  if (!token) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|map)).*)",
  ],
}
