import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import {
  rawListHRDocuments, rawListHRDocumentsByFolder, rawCreateHRDocument, normalizeHRDoc, attachHRFolderInfo,
} from "@/lib/hr-doc-raw"

function toDate(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}
function toNum(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null
  const n = Number(v)
  return isNaN(n) ? null : n
}
function strOrNull(v: unknown, fallback?: string): string | null {
  if (v === undefined || v === null) return fallback ?? null
  const s = String(v).trim()
  return s === "" ? (fallback ?? null) : s
}
function toBool(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1"
}

// GET — list all HR documents (optionally filtered by folderId via query)
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant()
  const url = new URL(req.url)
  const folderId = url.searchParams.get("folderId") // "root" | "<id>" | null(all)

  let rows
  if (folderId === "root") {
    rows = await rawListHRDocumentsByFolder(tenantId, null)
  } else if (folderId) {
    rows = await rawListHRDocumentsByFolder(tenantId, folderId)
  } else {
    rows = await rawListHRDocuments(tenantId)
  }
  const items = rows.map(normalizeHRDoc)
  await attachHRFolderInfo(tenantId, items)
  return ok({ items })
}

// POST — create an HR document
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const name = strOrNull(body.name)
  if (!name) return bad("Document name is required")

  // Validate folderId belongs to tenant if provided
  let folderId: string | null = strOrNull(body.folderId)
  if (folderId) {
    const rows = (await db.$queryRawUnsafe(
      `SELECT id FROM HRDocumentFolder WHERE id = ? AND tenantId = ? LIMIT 1`,
      folderId, tenantId
    )) as { id: string }[]
    if (!rows[0]) return bad("Folder not found", 400)
  } else {
    folderId = null
  }

  const uploadedBy = strOrNull(body.uploadedBy) || "HR Admin"

  const id = await rawCreateHRDocument({
    tenantId,
    folderId,
    name,
    category: strOrNull(body.category),
    entityId: strOrNull(body.entityId),
    department: strOrNull(body.department),
    visibleTo: strOrNull(body.visibleTo) || "All Employees",
    status: strOrNull(body.status) || "Published",
    fileUrl: strOrNull(body.fileUrl),
    fileExt: strOrNull(body.fileExt),
    fileSize: toNum(body.fileSize),
    version: strOrNull(body.version, "1.0"),
    description: strOrNull(body.description),
    remarks: strOrNull(body.remarks),
    acknowledgmentRequired: toBool(body.acknowledgmentRequired),
    acknowledgmentDueDate: toDate(body.acknowledgmentDueDate),
    uploadedBy,
  })

  // Re-fetch the created doc (with folder info) to return
  const rows = (await db.$queryRawUnsafe(
    `SELECT id, tenantId, folderId, name, category, entityId, department, visibleTo,
       status, fileUrl, fileExt, fileSize, version, description, remarks,
       acknowledgmentRequired, acknowledgmentDueDate, uploadedBy, uploadedAt,
       createdAt, updatedAt
     FROM HRDocument WHERE id = ? LIMIT 1`,
    id
  )) as any[]
  const rec = normalizeHRDoc(rows[0])
  await attachHRFolderInfo(tenantId, [rec])
  return created(rec)
}
