import { z } from "zod"

export function toDate(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

export function toNum(v: unknown, fallback?: number): number | undefined {
  if (v === undefined || v === null || v === "") return fallback
  const n = Number(v)
  return isNaN(n) ? fallback : n
}

export function toFloat(v: unknown): number | undefined {
  return toNum(v)
}

export function toBool(v: unknown, fallback?: boolean): boolean | undefined {
  if (v === undefined || v === null || v === "") return fallback
  if (typeof v === "boolean") return v
  const s = String(v).toLowerCase().trim()
  if (s === "true" || s === "1" || s === "yes" || s === "on") return true
  if (s === "false" || s === "0" || s === "no" || s === "off") return false
  return fallback
}

export function str(v: unknown, fallback = ""): string {
  if (v === undefined || v === null) return fallback
  return String(v)
}

export function strOrNull(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

export function toStr(v: unknown, fallback = ""): string {
  return str(v, fallback)
}

export function toStrNN(v: unknown, fallback = ""): string {
  return str(v, fallback)
}

export function csvToList(v: unknown): string[] | null {
  if (!v || typeof v !== "string") return null
  const parts = v.split(",").map((s) => s.trim()).filter(Boolean)
  return parts.length ? parts : null
}

export function listToCsv(list: string[] | null | undefined): string | null {
  if (!list || !list.length) return null
  return list.join(",")
}

export function isoDate(d: Date): string {
  return d.toISOString().split("T")[0]
}

export function inclusiveDays(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1
}

export function eachDay(from: Date, to: Date): Date[] {
  const days: Date[] = []
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)
  while (d <= end) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  q: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})

export const employeeCreateSchema = z.object({
  employeeCode: z.string().min(1, "Employee code is required"),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  maritalStatus: z.string().optional(),
  bloodGroup: z.string().optional(),
  nationality: z.string().default("Indian"),
  personalEmail: z.string().email().optional().or(z.literal("")),
  officialEmail: z.string().email().optional().or(z.literal("")),
  mobileNumber: z.string().optional(),
  dateOfJoining: z.string().optional(),
  employmentType: z.string().default("Full-time"),
  employeeStatus: z.string().default("Active"),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  branchId: z.string().optional(),
  entityId: z.string().optional(),
  gradeId: z.string().optional(),
  locationId: z.string().optional(),
  reportingManagerId: z.string().optional(),
})

export const leaveApplicationSchema = z.object({
  employeeId: z.string().min(1, "employeeId is required"),
  leaveTypeId: z.string().min(1, "leaveTypeId is required"),
  fromDate: z.string().min(1, "fromDate is required"),
  toDate: z.string().min(1, "toDate is required"),
  reason: z.string().optional(),
  halfDay: z.boolean().default(false),
  halfDayType: z.string().optional(),
  hours: z.number().optional(),
  attachmentUrl: z.string().optional(),
})
