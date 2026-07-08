import { NextResponse } from "next/server"

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { status: 200, ...init })
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 })
}

export function noContent() {
  return new NextResponse(null, { status: 204 })
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status: 400 }
  )
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 })
}

export function tooManyRequests(message = "Too many requests", retryAfter?: number) {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined,
    }
  )
}

export function serverError(message: string, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status: 500 }
  )
}

export function paginated<T>(items: T[], total: number, page: number, pageSize: number) {
  const totalPages = Math.ceil(total / pageSize)
  return NextResponse.json({
    data: {
      items,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  })
}

export async function parseBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    const body = await req.json()
    return (body || {}) as T
  } catch {
    return {} as T
  }
}

export function getPaginationParams(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "50", 10))
  )
  const skip = (page - 1) * pageSize
  return { page, pageSize, skip, take: pageSize }
}

export function getSearchParams(url: URL, keys: string[]): Record<string, string | undefined> {
  const params: Record<string, string | undefined> = {}
  for (const key of keys) {
    const val = url.searchParams.get(key)
    if (val) params[key] = val
  }
  return params
}
