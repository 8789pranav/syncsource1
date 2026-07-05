// ============================================================================
//  Raw SQL helpers for HRDocument + HRDocumentFolder
// ----------------------------------------------------------------------------
//  Same pattern as employee-doc-raw.ts: raw SQL bypasses any stale Prisma
//  client cache in the long-running dev server. Tables exist because we ran
//  `prisma db:push`. Once the dev server restarts, regular Prisma ORM
//  delegates (db.hrDocument.*, db.hrDocumentFolder.*) will also work.
// ============================================================================
import { db } from "@/lib/db"

export interface RawHRFolderRow {
  id: string
  tenantId: string
  name: string
  description: string | null
  color: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface RawHRDocRow {
  id: string
  tenantId: string
  folderId: string | null
  name: string
  category: string | null
  entityId: string | null
  department: string | null
  visibleTo: string
  status: string
  fileUrl: string | null
  fileExt: string | null
  fileSize: number | null
  version: string | null
  description: string | null
  remarks: string | null
  acknowledgmentRequired: number
  acknowledgmentDueDate: string | null
  uploadedBy: string | null
  uploadedAt: string
  createdAt: string
  updatedAt: string
}

export interface RawHRFolderWithCount extends RawHRFolderRow {
  docCount: number
  lastActivityAt: string
}

// Generate a CUID-like id (good enough for raw inserts; collision-resistant)
export function newId(prefix = "rec"): string {
  const ts = Date.now().toString(36)
  const rnd = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${ts}-${rnd}`
}

// Convert raw date string (SQLite stores as ISO string) to a normalized string
export function isoOrNull(d: unknown): string | null {
  if (!d) return null
  if (d instanceof Date) return d.toISOString()
  if (typeof d === "string") {
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? null : dt.toISOString()
  }
  return null
}

// ---------- Documents ----------

const DOC_COLUMNS = `id, tenantId, folderId, name, category, entityId, department,
  visibleTo, status, fileUrl, fileExt, fileSize, version, description, remarks,
  acknowledgmentRequired, acknowledgmentDueDate, uploadedBy, uploadedAt,
  createdAt, updatedAt`

export async function rawListHRDocuments(
  tenantId: string
): Promise<RawHRDocRow[]> {
  return (await db.$queryRawUnsafe(
    `SELECT ${DOC_COLUMNS} FROM HRDocument WHERE tenantId = ? ORDER BY uploadedAt DESC`,
    tenantId
  )) as RawHRDocRow[]
}

export async function rawListHRDocumentsByFolder(
  tenantId: string,
  folderId: string | null
): Promise<RawHRDocRow[]> {
  if (folderId) {
    return (await db.$queryRawUnsafe(
      `SELECT ${DOC_COLUMNS} FROM HRDocument WHERE tenantId = ? AND folderId = ? ORDER BY uploadedAt DESC`,
      tenantId, folderId
    )) as RawHRDocRow[]
  }
  return (await db.$queryRawUnsafe(
    `SELECT ${DOC_COLUMNS} FROM HRDocument WHERE tenantId = ? AND folderId IS NULL ORDER BY uploadedAt DESC`,
    tenantId
  )) as RawHRDocRow[]
}

export async function rawGetHRDocument(
  tenantId: string,
  id: string
): Promise<RawHRDocRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT ${DOC_COLUMNS} FROM HRDocument WHERE id = ? AND tenantId = ? LIMIT 1`,
    id, tenantId
  )) as RawHRDocRow[]
  return rows[0] || null
}

export async function rawCreateHRDocument(input: {
  tenantId: string
  folderId: string | null
  name: string
  category: string | null
  entityId: string | null
  department: string | null
  visibleTo: string
  status: string
  fileUrl: string | null
  fileExt: string | null
  fileSize: number | null
  version: string | null
  description: string | null
  remarks: string | null
  acknowledgmentRequired: boolean
  acknowledgmentDueDate: Date | null
  uploadedBy: string
}): Promise<string> {
  const id = newId("hrdoc")
  const now = new Date()
  await db.$executeRawUnsafe(
    `INSERT INTO HRDocument
       (id, tenantId, folderId, name, category, entityId, department, visibleTo,
        status, fileUrl, fileExt, fileSize, version, description, remarks,
        acknowledgmentRequired, acknowledgmentDueDate, uploadedBy, uploadedAt,
        createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, input.tenantId, input.folderId, input.name, input.category,
    input.entityId, input.department, input.visibleTo, input.status,
    input.fileUrl, input.fileExt, input.fileSize, input.version,
    input.description, input.remarks,
    input.acknowledgmentRequired ? 1 : 0, input.acknowledgmentDueDate,
    input.uploadedBy, now, now, now
  )
  return id
}

export async function rawUpdateHRDocument(
  id: string,
  fields: Record<string, unknown>
): Promise<void> {
  const allowed = [
    "name", "category", "entityId", "department", "visibleTo", "status",
    "fileUrl", "fileExt", "fileSize", "version", "description", "remarks",
    "acknowledgmentRequired", "acknowledgmentDueDate", "uploadedBy", "folderId",
  ]
  const sets: string[] = []
  const params: unknown[] = []
  for (const k of allowed) {
    if (k in fields) {
      let v = fields[k]
      if (k === "acknowledgmentRequired" && typeof v === "boolean") v = v ? 1 : 0
      sets.push(`${k} = ?`)
      params.push(v)
    }
  }
  if (sets.length === 0) return
  sets.push(`updatedAt = ?`)
  params.push(new Date())
  params.push(id)
  await db.$executeRawUnsafe(
    `UPDATE HRDocument SET ${sets.join(", ")} WHERE id = ?`,
    ...params
  )
}

export async function rawDeleteHRDocument(id: string): Promise<void> {
  await db.$executeRawUnsafe(`DELETE FROM HRDocument WHERE id = ?`, id)
}

// ---------- Folders ----------

export async function rawListHRFolders(
  tenantId: string
): Promise<RawHRFolderWithCount[]> {
  return (await db.$queryRawUnsafe(
    `SELECT f.id, f.tenantId, f.name, f.description, f.color, f.createdBy,
            f.createdAt, f.updatedAt,
            (SELECT COUNT(*) FROM HRDocument d WHERE d.folderId = f.id) AS docCount,
            COALESCE((SELECT MAX(d.uploadedAt) FROM HRDocument d WHERE d.folderId = f.id), f.createdAt) AS lastActivityAt
     FROM HRDocumentFolder f
     WHERE f.tenantId = ?
     ORDER BY f.createdAt DESC`,
    tenantId
  )) as RawHRFolderWithCount[]
}

export async function rawGetHRFolder(
  tenantId: string,
  folderId: string
): Promise<RawHRFolderRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT id, tenantId, name, description, color, createdBy, createdAt, updatedAt
     FROM HRDocumentFolder
     WHERE id = ? AND tenantId = ?
     LIMIT 1`,
    folderId, tenantId
  )) as RawHRFolderRow[]
  return rows[0] || null
}

export async function rawCreateHRFolder(input: {
  tenantId: string
  name: string
  description: string | null
  color: string | null
  createdBy: string
}): Promise<string> {
  const id = newId("hrfld")
  const now = new Date()
  await db.$executeRawUnsafe(
    `INSERT INTO HRDocumentFolder
       (id, tenantId, name, description, color, createdBy, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id, input.tenantId, input.name, input.description, input.color,
    input.createdBy, now, now
  )
  return id
}

export async function rawUpdateHRFolder(
  folderId: string,
  fields: { name?: string; description?: string | null; color?: string | null }
): Promise<void> {
  const sets: string[] = []
  const params: unknown[] = []
  if ("name" in fields && fields.name !== undefined) { sets.push(`name = ?`); params.push(fields.name) }
  if ("description" in fields) { sets.push(`description = ?`); params.push(fields.description) }
  if ("color" in fields) { sets.push(`color = ?`); params.push(fields.color) }
  if (sets.length === 0) return
  sets.push(`updatedAt = ?`)
  params.push(new Date())
  params.push(folderId)
  await db.$executeRawUnsafe(
    `UPDATE HRDocumentFolder SET ${sets.join(", ")} WHERE id = ?`,
    ...params
  )
}

export async function rawDeleteHRFolder(folderId: string): Promise<{ movedToRoot: number }> {
  const countRows = (await db.$queryRawUnsafe(
    `SELECT COUNT(*) AS cnt FROM HRDocument WHERE folderId = ?`,
    folderId
  )) as { cnt: bigint | number }[]
  const movedToRoot = Number(countRows[0]?.cnt ?? 0)
  if (movedToRoot > 0) {
    await db.$executeRawUnsafe(
      `UPDATE HRDocument SET folderId = NULL, updatedAt = ? WHERE folderId = ?`,
      new Date(), folderId
    )
  }
  await db.$executeRawUnsafe(`DELETE FROM HRDocumentFolder WHERE id = ?`, folderId)
  return { movedToRoot }
}

// ---------- Normalizers ----------

export function normalizeHRDoc(row: RawHRDocRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    folderId: row.folderId,
    folder: null as { id: string; name: string; color: string | null } | null,
    name: row.name,
    category: row.category,
    entityId: row.entityId,
    department: row.department,
    visibleTo: row.visibleTo,
    status: row.status,
    fileUrl: row.fileUrl,
    fileExt: row.fileExt,
    fileSize: row.fileSize,
    version: row.version,
    description: row.description,
    remarks: row.remarks,
    acknowledgmentRequired: !!row.acknowledgmentRequired,
    acknowledgmentDueDate: isoOrNull(row.acknowledgmentDueDate),
    uploadedBy: row.uploadedBy,
    uploadedAt: isoOrNull(row.uploadedAt) || new Date().toISOString(),
    createdAt: isoOrNull(row.createdAt) || new Date().toISOString(),
    updatedAt: isoOrNull(row.updatedAt) || new Date().toISOString(),
  }
}

export function normalizeHRFolder(row: RawHRFolderRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description,
    color: row.color,
    createdBy: row.createdBy,
    createdAt: isoOrNull(row.createdAt) || new Date().toISOString(),
    updatedAt: isoOrNull(row.updatedAt) || new Date().toISOString(),
  }
}

// Attach folder info to a list of normalized docs (single batched query)
export async function attachHRFolderInfo(
  tenantId: string,
  docs: ReturnType<typeof normalizeHRDoc>[]
): Promise<void> {
  const folderIds = Array.from(new Set(docs.map(d => d.folderId).filter(Boolean))) as string[]
  if (folderIds.length === 0) return
  const placeholders = folderIds.map(() => "?").join(",")
  const rows = (await db.$queryRawUnsafe(
    `SELECT id, name, color FROM HRDocumentFolder WHERE tenantId = ? AND id IN (${placeholders})`,
    tenantId, ...folderIds
  )) as { id: string; name: string; color: string | null }[]
  const m = new Map(rows.map(r => [r.id, r]))
  for (const d of docs) {
    if (d.folderId && m.has(d.folderId)) {
      d.folder = m.get(d.folderId)!
    }
  }
}
