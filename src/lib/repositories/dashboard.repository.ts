import { db } from "@/lib/db"

export const tenantRepository = {
  async findById(id: string) {
    return db.tenant.findUnique({ where: { id } })
  },

  async ensureDefault(tenantId: string, data?: Record<string, unknown>) {
    let tenant = await db.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      tenant = await db.tenant.create({
        data: {
          id: tenantId,
          code: data?.code || "ACME",
          name: data?.name || "ACME Corporation",
          legalName: data?.legalName || "ACME Services Pvt Ltd",
          brandColor: data?.brandColor || "#10b981",
        },
      })
    }
    return tenant
  },
}

export const auditRepository = {
  async log(data: {
    tenantId: string
    module: string
    action: string
    recordId?: string
    userId?: string
    userName?: string
    details?: string
    ip?: string
  }) {
    try {
      await db.auditLog.create({
        data: {
          tenantId: data.tenantId,
          module: data.module,
          action: data.action,
          recordId: data.recordId,
          userId: data.userId,
          userName: data.userName,
          details: data.details,
          ip: data.ip,
        },
      })
    } catch {
      // best-effort
    }
  },
}

export const dashboardRepository = {
  async getEmployeeStats(tenantId: string) {
    return db.employee.findMany({
      where: { tenantId },
      select: {
        id: true, firstName: true, lastName: true, displayName: true,
        employeeCode: true, gender: true, dateOfBirth: true, dateOfJoining: true,
        employeeStatus: true, departmentId: true, locationId: true, designationId: true,
      },
    })
  },

  async getPendingCounts(tenantId: string) {
    const [pendingLeaves, pendingAssets, openTickets] = await Promise.all([
      db.leaveApplication.count({ where: { tenantId, status: "Pending" } }),
      db.assetRequest.count({ where: { tenantId, status: "Pending" } }),
      db.profileUpdateRequest.count({ where: { tenantId, status: "Pending" } }),
    ])
    return { pendingLeaves, pendingAssets, openTickets }
  },

  async getAssetStats(tenantId: string) {
    const assets = await db.asset.findMany({ where: { tenantId }, select: { id: true, status: true } })
    return {
      assets,
      assigned: assets.filter((a) => a.status === "Assigned").length,
      inStock: assets.filter((a) => a.status === "In Stock").length,
    }
  },

  async getDepartments(tenantId: string) {
    return db.department.findMany({ where: { tenantId }, select: { id: true, name: true } })
  },

  async getDesignations(tenantId: string) {
    return db.designation.findMany({ where: { tenantId }, select: { id: true, name: true } })
  },

  async getLocations(tenantId: string) {
    return db.location.findMany({ where: { tenantId }, select: { id: true, name: true } })
  },

  async getApprovedLeavesToday(tenantId: string, today: Date, todayEnd: Date) {
    return db.leaveApplication.findMany({
      where: {
        tenantId, status: "Approved",
        fromDate: { lte: todayEnd }, toDate: { gte: today },
      },
      select: {
        employeeId: true,
        toDate: true,
        employee: {
          select: { id: true, firstName: true, lastName: true, displayName: true, employeeCode: true, designationId: true },
        },
      },
    })
  },

  async getAttendanceStats(tenantId: string) {
    return db.attendance.findMany({
      where: { tenantId },
      select: { status: true },
    })
  },

  async getLeaveTrend(tenantId: string, since: Date) {
    return db.leaveApplication.findMany({
      where: { tenantId, appliedAt: { gte: since } },
      select: { appliedAt: true },
    })
  },

  async getAttendanceForDay(tenantId: string, dayStart: Date, dayEnd: Date) {
    return db.attendance.findMany({
      where: { tenantId, date: { gte: dayStart, lte: dayEnd } },
      select: { status: true },
    })
  },

  async getUpcomingHolidays(tenantId: string, today: Date, take: number = 3) {
    return db.holiday.findMany({
      where: { tenantId, date: { gte: today } },
      orderBy: { date: "asc" },
      take,
      select: { id: true, name: true, date: true, type: true },
    })
  },

  async getPendingRequests(tenantId: string) {
    const [pendingLeaveApps, pendingAssetReqs] = await Promise.all([
      db.leaveApplication.findMany({
        where: { tenantId, status: "Pending" },
        include: {
          employee: { select: { firstName: true, lastName: true, displayName: true, employeeCode: true } },
          leaveType: { select: { name: true } },
        },
        orderBy: { appliedAt: "desc" },
      }),
      db.assetRequest.findMany({
        where: { tenantId, status: "Pending" },
        include: {
          employee: { select: { firstName: true, lastName: true, displayName: true, employeeCode: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ])
    return { pendingLeaveApps, pendingAssetReqs }
  },
}
