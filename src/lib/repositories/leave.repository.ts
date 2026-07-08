import { db } from "@/lib/db"

export interface LeaveApplicationQueryParams {
  tenantId: string
  employeeId?: string
  status?: string
  leaveTypeId?: string
  fromDate?: string
  toDate?: string
  managerId?: string
  departmentId?: string
  skip?: number
  take?: number
}

const leaveInclude = {
  employee: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      middleName: true,
      lastName: true,
      displayName: true,
      department: { select: { id: true, name: true } },
      designation: { select: { id: true, name: true } },
      reportingManagerId: true,
    },
  },
  approvals: { orderBy: { stepOrder: "asc" } },
  days_log: { orderBy: { date: "asc" } },
}

export const leaveRepository = {
  async findMany(params: LeaveApplicationQueryParams) {
    const employeeWhere: Record<string, unknown> = { tenantId: params.tenantId }
    if (params.managerId) employeeWhere.reportingManagerId = params.managerId
    if (params.departmentId) employeeWhere.departmentId = params.departmentId

    const where: Record<string, unknown> = { tenantId: params.tenantId }
    if (params.employeeId) where.employeeId = params.employeeId
    if (params.status) where.status = params.status
    if (params.leaveTypeId) where.leaveTypeId = params.leaveTypeId
    if (!params.employeeId && (params.managerId || params.departmentId)) {
      where.employee = employeeWhere
    }
    if (params.fromDate || params.toDate) {
      where.fromDate = {
        ...(params.fromDate ? { gte: new Date(params.fromDate) } : {}),
        ...(params.toDate ? { lte: new Date(params.toDate) } : {}),
      }
    }

    const [items, total] = await Promise.all([
      db.leaveApplication.findMany({
        where,
        include: leaveInclude,
        orderBy: { appliedAt: "desc" },
        ...(params.take ? { take: params.take, skip: params.skip || 0 } : {}),
      }),
      db.leaveApplication.count({ where }),
    ])

    return { items, total }
  },

  async findById(id: string, tenantId: string) {
    return db.leaveApplication.findFirst({
      where: { id, tenantId },
      include: {
        ...leaveInclude,
        leaveType: true,
        ledgerEntries: { orderBy: { createdAt: "desc" } },
      },
    })
  },

  async create(data: Record<string, unknown>) {
    return db.leaveApplication.create({ data })
  },

  async update(id: string, data: Record<string, unknown>) {
    return db.leaveApplication.update({ where: { id }, data })
  },

  async countByStatus(tenantId: string, status: string) {
    return db.leaveApplication.count({ where: { tenantId, status } })
  },

  async findActiveWorkflow(tenantId: string) {
    return db.workflow.findFirst({
      where: { tenantId, module: "leave", isActive: true },
      include: { steps: { orderBy: { level: "asc" } } },
    })
  },
}
