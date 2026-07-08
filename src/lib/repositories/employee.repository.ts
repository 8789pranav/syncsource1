import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"

export interface EmployeeQueryParams {
  tenantId: string
  q?: string
  departmentId?: string
  entityId?: string
  branchId?: string
  status?: string
  skip?: number
  take?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface EmployeeCreateData {
  tenantId: string
  employeeCode: string
  firstName: string
  middleName?: string | null
  lastName?: string | null
  displayName?: string | null
  gender?: string | null
  dateOfBirth?: Date | null
  maritalStatus?: string | null
  bloodGroup?: string | null
  nationality?: string
  personalEmail?: string | null
  officialEmail?: string | null
  mobileNumber?: string | null
  alternateNumber?: string | null
  dateOfJoining?: Date | null
  employmentType?: string
  workerType?: string
  employeeStatus?: string
  entityId?: string | null
  branchId?: string | null
  departmentId?: string | null
  designationId?: string | null
  gradeId?: string | null
  locationId?: string | null
  reportingManagerId?: string | null
  bankName?: string | null
  accountNumber?: string | null
  ifscCode?: string | null
  panNumber?: string | null
  aadhaarNumber?: string | null
  ctc?: number | null
  basicSalary?: number | null
  hra?: number | null
  customData?: string | null
}

const employeeInclude = {
  entity: { select: { id: true, code: true, legalName: true, tradeName: true } },
  department: { select: { id: true, code: true, name: true } },
  designation: { select: { id: true, code: true, name: true } },
  location: { select: { id: true, code: true, name: true, city: true } },
  branch: { select: { id: true, code: true, name: true, city: true } },
  grade: { select: { id: true, code: true, name: true, hierarchyLevel: true } },
}

export const employeeRepository = {
  async findMany(params: EmployeeQueryParams) {
    const where: Record<string, unknown> = { tenantId: params.tenantId }

    if (params.q) {
      where.OR = [
        { firstName: { contains: params.q } },
        { lastName: { contains: params.q } },
        { employeeCode: { contains: params.q } },
        { officialEmail: { contains: params.q } },
        { mobileNumber: { contains: params.q } },
        { displayName: { contains: params.q } },
      ]
    }
    if (params.departmentId) where.departmentId = params.departmentId
    if (params.entityId) where.entityId = params.entityId
    if (params.branchId) where.branchId = params.branchId
    if (params.status) where.employeeStatus = params.status

    const [items, total] = await Promise.all([
      db.employee.findMany({
        where,
        include: employeeInclude,
        orderBy: { [params.sortBy || "createdAt"]: params.sortOrder || "desc" },
        ...(params.take ? { take: params.take, skip: params.skip || 0 } : {}),
      }),
      db.employee.count({ where }),
    ])

    return { items, total }
  },

  async findById(id: string, tenantId: string) {
    return db.employee.findFirst({
      where: { id, tenantId },
      include: {
        ...employeeInclude,
        _count: {
          select: {
            familyMembers: true,
            educationRecords: true,
            experienceRecords: true,
            bankHistory: true,
            statutoryDetails: true,
            documents: true,
            compensationHistory: true,
            notes: true,
            timelineEvents: true,
            auditLogs: true,
            statusHistory: true,
            transferHistory: true,
            promotionHistory: true,
            probationReviews: true,
            exitRecords: true,
            loginAccess: true,
            roleMappings: true,
            customFieldValues: true,
            formSubmissions: true,
            skills: true,
            certifications: true,
            trainings: true,
            performanceGoals: true,
            performanceReviews: true,
            expenses: true,
            helpdeskTickets: true,
            letters: true,
            requests: true,
          },
        },
      },
    })
  },

  async findByCode(tenantId: string, employeeCode: string) {
    return db.employee.findUnique({
      where: { tenantId_employeeCode: { tenantId, employeeCode } },
    })
  },

  async create(data: EmployeeCreateData) {
    return db.employee.create({ data })
  },

  async update(id: string, data: Record<string, unknown>) {
    return db.employee.update({ where: { id }, data })
  },

  async delete(id: string) {
    return db.employee.delete({ where: { id } })
  },

  async findManager(id: string, tenantId: string) {
    return db.employee.findFirst({
      where: { id, tenantId },
      select: { id: true, firstName: true, lastName: true, employeeCode: true, displayName: true },
    })
  },

  async countByStatus(tenantId: string) {
    const employees = await db.employee.findMany({
      where: { tenantId },
      select: { employeeStatus: true },
    })
    return {
      total: employees.length,
      active: employees.filter((e) => e.employeeStatus === "Active").length,
      onNotice: employees.filter((e) => e.employeeStatus === "On Notice").length,
    }
  },
}
