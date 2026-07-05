import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, created, bad, parseBody, listResponse } from "@/lib/api-helpers"

// ---------- helpers ----------
function toDate(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}
function toNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}
function toFloat(v: unknown): number | undefined {
  return toNum(v)
}
function str(v: unknown, fallback = ""): string {
  if (v === undefined || v === null) return fallback
  return String(v)
}
function strOrNull(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

// Known scalar/relation fields on Employee model — anything else goes to customData.
const EMPLOYEE_FIELDS = new Set([
  "employeeCode", "firstName", "middleName", "lastName", "displayName", "gender",
  "dateOfBirth", "maritalStatus", "bloodGroup", "nationality", "profilePhotoUrl",
  "personalEmail", "officialEmail", "mobileNumber", "alternateNumber",
  "dateOfJoining", "employmentType", "workerType", "probationStatus", "probationEndDate",
  "confirmationDate", "noticePeriod", "employeeStatus",
  "entityId", "branchId", "departmentId", "designationId", "gradeId", "locationId",
  "reportingManagerId",
  "bankName", "accountNumber", "ifscCode", "branchName",
  "panNumber", "aadhaarNumber", "uanNumber", "pfNumber", "esiNumber",
  "currentAddress", "permanentAddress",
  "ctc", "basicSalary", "hra",
])

// ---------- GET list (with search + filters) ----------
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant()
  const url = new URL(req.url)
  const q = (url.searchParams.get("q") || "").trim()
  const departmentId = url.searchParams.get("departmentId") || undefined
  const entityId = url.searchParams.get("entityId") || undefined
  const status = url.searchParams.get("status") || undefined
  const limit = Number(url.searchParams.get("limit")) || 0

  const where: Record<string, unknown> = { tenantId }
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { employeeCode: { contains: q } },
      { officialEmail: { contains: q } },
      { mobileNumber: { contains: q } },
      { displayName: { contains: q } },
    ]
  }
  if (departmentId) where.departmentId = departmentId
  if (entityId) where.entityId = entityId
  if (status) where.employeeStatus = status

  const items = await db.employee.findMany({
    where,
    include: {
      entity: { select: { id: true, code: true, legalName: true, tradeName: true } },
      department: { select: { id: true, code: true, name: true } },
      designation: { select: { id: true, code: true, name: true } },
      location: { select: { id: true, code: true, name: true, city: true } },
      branch: { select: { id: true, code: true, name: true, city: true } },
      grade: { select: { id: true, code: true, name: true, hierarchyLevel: true } },
    },
    orderBy: { createdAt: "desc" },
    ...(limit && limit > 0 ? { take: limit } : {}),
  })
  return listResponse(items)
}

// ---------- POST create ----------
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const employeeCode = str(body.employeeCode).trim()
  const firstName = str(body.firstName).trim()
  if (!employeeCode) return bad("Employee code is required")
  if (!firstName) return bad("First name is required")

  const existing = await db.employee.findUnique({ where: { tenantId_employeeCode: { tenantId, employeeCode } } })
  if (existing) return bad("Employee code already exists", 409)

  // Capture extra (non-model) fields into customData JSON string
  const extras: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (!EMPLOYEE_FIELDS.has(k)) extras[k] = v
  }
  const customData = Object.keys(extras).length ? JSON.stringify(extras) : null

  const rec = await db.employee.create({
    data: {
      tenantId,
      employeeCode,
      firstName,
      middleName: strOrNull(body.middleName),
      lastName: strOrNull(body.lastName),
      displayName: strOrNull(body.displayName),
      gender: strOrNull(body.gender),
      dateOfBirth: toDate(body.dateOfBirth),
      maritalStatus: strOrNull(body.maritalStatus),
      bloodGroup: strOrNull(body.bloodGroup),
      nationality: str(body.nationality, "Indian"),
      profilePhotoUrl: strOrNull(body.profilePhotoUrl),
      personalEmail: strOrNull(body.personalEmail),
      officialEmail: strOrNull(body.officialEmail),
      mobileNumber: strOrNull(body.mobileNumber),
      alternateNumber: strOrNull(body.alternateNumber),
      dateOfJoining: toDate(body.dateOfJoining),
      employmentType: str(body.employmentType, "Full-time"),
      workerType: str(body.workerType, "Permanent"),
      probationStatus: strOrNull(body.probationStatus),
      probationEndDate: toDate(body.probationEndDate),
      confirmationDate: toDate(body.confirmationDate),
      noticePeriod: toNum(body.noticePeriod),
      employeeStatus: str(body.employeeStatus, "Active"),
      entityId: strOrNull(body.entityId),
      branchId: strOrNull(body.branchId),
      departmentId: strOrNull(body.departmentId),
      designationId: strOrNull(body.designationId),
      gradeId: strOrNull(body.gradeId),
      locationId: strOrNull(body.locationId),
      reportingManagerId: strOrNull(body.reportingManagerId),
      bankName: strOrNull(body.bankName),
      accountNumber: strOrNull(body.accountNumber),
      ifscCode: strOrNull(body.ifscCode),
      branchName: strOrNull(body.branchName),
      panNumber: strOrNull(body.panNumber),
      aadhaarNumber: strOrNull(body.aadhaarNumber),
      uanNumber: strOrNull(body.uanNumber),
      pfNumber: strOrNull(body.pfNumber),
      esiNumber: strOrNull(body.esiNumber),
      currentAddress: strOrNull(body.currentAddress),
      permanentAddress: strOrNull(body.permanentAddress),
      ctc: toFloat(body.ctc),
      basicSalary: toFloat(body.basicSalary),
      hra: toFloat(body.hra),
      customData,
    },
  })
  return created(rec)
}
