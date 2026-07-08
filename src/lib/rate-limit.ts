import { NextRequest, NextResponse } from "next/server"

interface RateLimitEntry {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()
const MAX_REQUESTS = 100
const WINDOW_MS = 60 * 1000

export function rateLimit(
  req: NextRequest,
  limit: number = MAX_REQUESTS,
  windowMs: number = WINDOW_MS
): NextResponse | null {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
  const key = `${ip}:${req.nextUrl.pathname}`
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs })
    return null
  }

  entry.count++

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(entry.resetTime),
        },
      }
    )
  }

  return null
}

export function getRateLimitHeaders(req: NextRequest): Record<string, string> {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
  const key = `${ip}:${req.nextUrl.pathname}`
  const entry = store.get(key)
  return {
    "X-RateLimit-Limit": String(MAX_REQUESTS),
    "X-RateLimit-Remaining": String(entry ? Math.max(0, MAX_REQUESTS - entry.count) : MAX_REQUESTS),
  }
}
