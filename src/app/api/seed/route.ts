// Comprehensive seed endpoint for the HRMS demo tenant.
// GET or POST /api/seed → wipes & re-creates demo data for the default tenant.
// Returns { ok: true, counts: {...} }

import { db } from "@/lib/db"
import { ensureTenant, ok, bad } from "@/lib/api-helpers"
import { defaultFormSchemas } from "@/lib/form-schemas"

// ---------- date helpers ----------
function daysAgo(n: number): Date {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d
}
function daysFromNow(n: number): Date {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + n)
  return d
}
function monthsAgo(n: number): Date {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setMonth(d.getMonth() - n)
  return d
}
function yearsAgo(n: number, day = 1, month = 0): Date {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setFullYear(d.getFullYear() - n)
  d.setMonth(month)
  d.setDate(day)
  return d
}
function dateOnly(year: number, month: number, day: number): Date {
  const d = new Date(year, month, day, 12, 0, 0, 0)
  return d
}

export async function GET() {
  return runSeed()
}

export async function POST() {
  return runSeed()
}

async function runSeed() {
  try {
    // Ensure tenant exists first (creates ACME default tenant if absent)
    await ensureTenant()

    // ---------- WIPE existing data in dependency order (children first) ----------
    await db.workflowAction.deleteMany()
    await db.workflowInstance.deleteMany()
    await db.workflowStep.deleteMany()
    await db.workflow.deleteMany()
    await db.formSchema.deleteMany()
    await db.auditLog.deleteMany()
    await db.announcement.deleteMany()
    await db.assetAssignment.deleteMany()
    await db.assetRequest.deleteMany()
    await db.asset.deleteMany()
    await db.assetCategory.deleteMany()
    await db.holiday.deleteMany()
    await db.attendance.deleteMany()
    await db.rosterEntry.deleteMany()
    await db.roster.deleteMany()
    await db.shiftAssignment.deleteMany()
    await db.shift.deleteMany()
    await db.leaveApplication.deleteMany()
    await db.leaveBalance.deleteMany()
    await db.leavePolicyItem.deleteMany()
    await db.leavePolicy.deleteMany()
    await db.leaveType.deleteMany()
    await db.profileUpdateRequest.deleteMany()
    await db.employee.deleteMany()
    await db.designation.deleteMany()
    await db.grade.deleteMany()
    await db.department.deleteMany()
    await db.branch.deleteMany()
    await db.location.deleteMany()
    await db.entity.deleteMany()

    const tenantId = await ensureTenant()
    const counts: Record<string, number> = {}

    // ---------- ENTITIES ----------
    const espl = await db.entity.create({
      data: {
        tenantId,
        code: "ESPL",
        legalName: "Example Services Private Limited",
        tradeName: "Example Services",
        pan: "AABCE1234F",
        gstin: "27AABCE1234F1Z5",
        tan: "MUME12345B",
        pfNumber: "BGBNG0012345000",
        esiNumber: "BGBNG0012345000",
        address: "Plot 14, MIDC Marol, Andheri East",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        currency: "INR",
        payrollApplicable: true,
        attendanceApplicable: true,
        leaveApplicable: true,
        status: "Active",
      },
    })
    const et = await db.entity.create({
      data: {
        tenantId,
        code: "ET",
        legalName: "Example Technologies Private Limited",
        tradeName: "Example Tech",
        pan: "AABCT5678G",
        gstin: "29AABCT5678G1Z2",
        tan: "BLRE98765C",
        pfNumber: "BGKAR0012345000",
        esiNumber: "BGKAR0012345000",
        address: "Outer Ring Road, Bellandur",
        city: "Bangalore",
        state: "Karnataka",
        country: "India",
        currency: "INR",
        payrollApplicable: true,
        attendanceApplicable: true,
        leaveApplicable: true,
        status: "Active",
      },
    })
    counts.entities = 2

    // ---------- BRANCHES (linked to ESPL) ----------
    const bomHq = await db.branch.create({
      data: {
        tenantId, entityId: espl.id, code: "BOM-HQ",
        name: "Mumbai HQ", address: "Plot 14, MIDC Marol, Andheri East",
        city: "Mumbai", state: "Maharashtra", country: "India",
        lat: 19.1136, lng: 72.8697, workingDays: "Mon,Tue,Wed,Thu,Fri", status: "Active",
      },
    })
    const blrTech = await db.branch.create({
      data: {
        tenantId, entityId: espl.id, code: "BLR-TECH",
        name: "Bangalore Tech", address: "Outer Ring Road, Bellandur",
        city: "Bangalore", state: "Karnataka", country: "India",
        lat: 12.9279, lng: 77.6271, workingDays: "Mon,Tue,Wed,Thu,Fri", status: "Active",
      },
    })
    const delSales = await db.branch.create({
      data: {
        tenantId, entityId: espl.id, code: "DEL-SALES",
        name: "Delhi Sales", address: "Connaught Place, New Delhi",
        city: "New Delhi", state: "Delhi", country: "India",
        lat: 28.6315, lng: 77.2167, workingDays: "Mon,Tue,Wed,Thu,Fri", status: "Active",
      },
    })
    counts.branches = 3

    // ---------- DEPARTMENTS (under ESPL) ----------
    const deptDefs = [
      { code: "DEPT-HR", name: "Human Resources" },
      { code: "DEPT-ENG", name: "Engineering" },
      { code: "DEPT-SAL", name: "Sales" },
      { code: "DEPT-FIN", name: "Finance" },
      { code: "DEPT-MKT", name: "Marketing" },
      { code: "DEPT-OPS", name: "Operations" },
    ]
    const depts: Record<string, { id: string; name: string }> = {}
    for (const d of deptDefs) {
      const rec = await db.department.create({
        data: { tenantId, entityId: espl.id, code: d.code, name: d.name, status: "Active" },
      })
      depts[d.code] = { id: rec.id, name: rec.name }
    }
    counts.departments = 6

    // ---------- GRADES ----------
    const grades: Record<string, string> = {}
    const gradeDefs = [
      { code: "L4-MID", name: "L4 — Mid", hierarchyLevel: 4, minSalary: 500000, maxSalary: 1200000, leaveEligibility: 18, approvalAuthority: false },
      { code: "L5-SEN", name: "L5 — Senior", hierarchyLevel: 5, minSalary: 1200000, maxSalary: 2200000, leaveEligibility: 22, approvalAuthority: true },
      { code: "L6-LEAD", name: "L6 — Lead", hierarchyLevel: 6, minSalary: 2200000, maxSalary: 3500000, leaveEligibility: 26, approvalAuthority: true },
    ]
    for (const g of gradeDefs) {
      const rec = await db.grade.create({ data: { tenantId, ...g, status: "Active" } })
      grades[g.code] = rec.id
    }
    counts.grades = 3

    // ---------- DESIGNATIONS (mapped to grades) ----------
    const desigs: Record<string, string> = {}
    const desigDefs = [
      { code: "DES-HR-EXEC", name: "HR Executive", gradeId: grades["L4-MID"], level: 1 },
      { code: "DES-SWE", name: "Software Engineer", gradeId: grades["L4-MID"], level: 2 },
      { code: "DES-SSWE", name: "Senior Software Engineer", gradeId: grades["L5-SEN"], level: 3 },
      { code: "DES-SALES-MGR", name: "Sales Manager", gradeId: grades["L6-LEAD"], level: 3 },
      { code: "DES-FIN-ANL", name: "Finance Analyst", gradeId: grades["L4-MID"], level: 2 },
      { code: "DES-DEVOPS", name: "DevOps Engineer", gradeId: grades["L5-SEN"], level: 3 },
    ]
    for (const d of desigDefs) {
      const rec = await db.designation.create({ data: { tenantId, ...d, status: "Active" } })
      desigs[d.code] = rec.id
    }
    counts.designations = 6

    // ---------- LOCATIONS ----------
    const locs: Record<string, string> = {}
    const locDefs = [
      { code: "LOC-MUM", name: "Mumbai Office", address: "Andheri East, Mumbai", city: "Mumbai", state: "Maharashtra", country: "India", geoFenceRadius: 100, timezone: "Asia/Kolkata", attendanceMode: "Web" },
      { code: "LOC-BLR", name: "Bangalore Office", address: "Bellandur, Bangalore", city: "Bangalore", state: "Karnataka", country: "India", geoFenceRadius: 100, timezone: "Asia/Kolkata", attendanceMode: "Web" },
      { code: "LOC-DEL", name: "Delhi Office", address: "Connaught Place, New Delhi", city: "New Delhi", state: "Delhi", country: "India", geoFenceRadius: 100, timezone: "Asia/Kolkata", attendanceMode: "Web" },
    ]
    for (const l of locDefs) {
      const rec = await db.location.create({ data: { tenantId, ...l, status: "Active" } })
      locs[l.code] = rec.id
    }
    counts.locations = 3

    // ---------- EMPLOYEES (12) ----------
    // Realistic Indian names; varied departments/designations/grades/locations; manager hierarchy.
    type EmpSeed = {
      code: string; first: string; last: string; gender: "Male" | "Female"
      dob: Date; doj: Date; mobile: string; personalEmail: string; officialEmail: string
      entity: string; branch: string; dept: string; desig: string; grade: string; loc: string
      mgrCode: string | null; ctc: number; basic: number; hra: number
      status: string; pan: string; bank: string; account: string; ifsc: string
    }
    const empSeeds: EmpSeed[] = [
      { code: "EMP-0001", first: "Aarav", last: "Sharma", gender: "Male", dob: dateOnly(1990, 4, 15), doj: yearsAgo(2, 15, 0), mobile: "+91-9876543210", personalEmail: "aarav.sharma@gmail.com", officialEmail: "aarav.sharma@acme.com", entity: "ESPL", branch: "BOM-HQ", dept: "DEPT-ENG", desig: "DES-SSWE", grade: "L5-SEN", loc: "LOC-MUM", mgrCode: null, ctc: 2200000, basic: 1100000, hra: 440000, status: "Active", pan: "ABCPS1234A", bank: "HDFC Bank", account: "501000123456789", ifsc: "HDFC0001234" },
      { code: "EMP-0002", first: "Vivaan", last: "Mehta", gender: "Male", dob: dateOnly(1991, 7, 22), doj: monthsAgo(22), mobile: "+91-9876543211", personalEmail: "vivaan.mehta@gmail.com", officialEmail: "vivaan.mehta@acme.com", entity: "ESPL", branch: "BLR-TECH", dept: "DEPT-ENG", desig: "DES-SSWE", grade: "L5-SEN", loc: "LOC-BLR", mgrCode: "EMP-0001", ctc: 2000000, basic: 1000000, hra: 400000, status: "Active", pan: "BCDPM2345B", bank: "ICICI Bank", account: "012301234567", ifsc: "ICIC0000123" },
      { code: "EMP-0003", first: "Ananya", last: "Iyer", gender: "Female", dob: dateOnly(1994, 2, 8), doj: monthsAgo(18), mobile: "+91-9876543212", personalEmail: "ananya.iyer@gmail.com", officialEmail: "ananya.iyer@acme.com", entity: "ESPL", branch: "BOM-HQ", dept: "DEPT-HR", desig: "DES-HR-EXEC", grade: "L4-MID", loc: "LOC-MUM", mgrCode: "EMP-0001", ctc: 700000, basic: 350000, hra: 140000, status: "Active", pan: "CDEPI3456C", bank: "SBI", account: "30123456789", ifsc: "SBIN0001234" },
      { code: "EMP-0004", first: "Aditya", last: "Reddy", gender: "Male", dob: dateOnly(1996, 10, 12), doj: monthsAgo(14), mobile: "+91-9876543213", personalEmail: "aditya.reddy@gmail.com", officialEmail: "aditya.reddy@acme.com", entity: "ESPL", branch: "BLR-TECH", dept: "DEPT-ENG", desig: "DES-SWE", grade: "L4-MID", loc: "LOC-BLR", mgrCode: "EMP-0002", ctc: 1200000, basic: 600000, hra: 240000, status: "Active", pan: "DEFPR4567D", bank: "Axis Bank", account: "917020001234", ifsc: "UTIB0000123" },
      { code: "EMP-0005", first: "Saanvi", last: "Nair", gender: "Female", dob: dateOnly(1997, 5, 30), doj: monthsAgo(11), mobile: "+91-9876543214", personalEmail: "saanvi.nair@gmail.com", officialEmail: "saanvi.nair@acme.com", entity: "ESPL", branch: "BLR-TECH", dept: "DEPT-ENG", desig: "DES-SWE", grade: "L4-MID", loc: "LOC-BLR", mgrCode: "EMP-0002", ctc: 1100000, basic: 550000, hra: 220000, status: "Active", pan: "EFGPN5678E", bank: "Kotak Mahindra", account: "12341234567", ifsc: "KKBK0001234" },
      { code: "EMP-0006", first: "Arjun", last: "Gupta", gender: "Male", dob: dateOnly(1989, 1, 18), doj: monthsAgo(17), mobile: "+91-9876543215", personalEmail: "arjun.gupta@gmail.com", officialEmail: "arjun.gupta@acme.com", entity: "ESPL", branch: "DEL-SALES", dept: "DEPT-SAL", desig: "DES-SALES-MGR", grade: "L6-LEAD", loc: "LOC-DEL", mgrCode: "EMP-0001", ctc: 1900000, basic: 950000, hra: 380000, status: "Active", pan: "FGHPG6789F", bank: "HDFC Bank", account: "501009876543", ifsc: "HDFC0001234" },
      { code: "EMP-0007", first: "Ishita", last: "Verma", gender: "Female", dob: dateOnly(1998, 9, 5), doj: monthsAgo(5), mobile: "+91-9876543216", personalEmail: "ishita.verma@gmail.com", officialEmail: "ishita.verma@acme.com", entity: "ESPL", branch: "BOM-HQ", dept: "DEPT-FIN", desig: "DES-FIN-ANL", grade: "L4-MID", loc: "LOC-MUM", mgrCode: "EMP-0001", ctc: 900000, basic: 450000, hra: 180000, status: "Active", pan: "GHIPV7890G", bank: "ICICI Bank", account: "012309876543", ifsc: "ICIC0000123" },
      { code: "EMP-0008", first: "Kabir", last: "Singh", gender: "Male", dob: dateOnly(1992, 11, 27), doj: monthsAgo(13), mobile: "+91-9876543217", personalEmail: "kabir.singh@gmail.com", officialEmail: "kabir.singh@acme.com", entity: "ESPL", branch: "BLR-TECH", dept: "DEPT-OPS", desig: "DES-DEVOPS", grade: "L5-SEN", loc: "LOC-BLR", mgrCode: "EMP-0001", ctc: 1700000, basic: 850000, hra: 340000, status: "On Notice", pan: "HIJPS8901H", bank: "Axis Bank", account: "917020009876", ifsc: "UTIB0000123" },
      { code: "EMP-0009", first: "Aanya", last: "Joshi", gender: "Female", dob: dateOnly(1995, 6, 14), doj: monthsAgo(3), mobile: "+91-9876543218", personalEmail: "aanya.joshi@gmail.com", officialEmail: "aanya.joshi@acme.com", entity: "ESPL", branch: "DEL-SALES", dept: "DEPT-MKT", desig: "DES-SALES-MGR", grade: "L6-LEAD", loc: "LOC-DEL", mgrCode: "EMP-0006", ctc: 1400000, basic: 700000, hra: 280000, status: "Active", pan: "IJKPJ9012I", bank: "SBI", account: "30129876543", ifsc: "SBIN0001234" },
      { code: "EMP-0010", first: "Reyansh", last: "Kumar", gender: "Male", dob: dateOnly(1993, 3, 19), doj: monthsAgo(2), mobile: "+91-9876543219", personalEmail: "reyansh.kumar@gmail.com", officialEmail: "reyansh.kumar@acme.com", entity: "ESPL", branch: "BOM-HQ", dept: "DEPT-SAL", desig: "DES-SALES-MGR", grade: "L6-LEAD", loc: "LOC-MUM", mgrCode: "EMP-0006", ctc: 1500000, basic: 750000, hra: 300000, status: "Active", pan: "JKLPK0123J", bank: "Kotak Mahindra", account: "12340987654", ifsc: "KKBK0001234" },
      { code: "EMP-0011", first: "Myra", last: "Desai", gender: "Female", dob: dateOnly(2000, 8, 11), doj: daysAgo(15), mobile: "+91-9876543220", personalEmail: "myra.desai@gmail.com", officialEmail: "myra.desai@acme.com", entity: "ESPL", branch: "BOM-HQ", dept: "DEPT-HR", desig: "DES-HR-EXEC", grade: "L4-MID", loc: "LOC-MUM", mgrCode: "EMP-0003", ctc: 650000, basic: 325000, hra: 130000, status: "Active", pan: "KLMPL1234K", bank: "HDFC Bank", account: "501005678901", ifsc: "HDFC0001234" },
      { code: "EMP-0012", first: "Vihaan", last: "Rao", gender: "Male", dob: dateOnly(1999, 12, 3), doj: daysAgo(5), mobile: "+91-9876543221", personalEmail: "vihaan.rao@gmail.com", officialEmail: "vihaan.rao@acme.com", entity: "ESPL", branch: "BLR-TECH", dept: "DEPT-OPS", desig: "DES-SWE", grade: "L4-MID", loc: "LOC-BLR", mgrCode: "EMP-0008", ctc: 1000000, basic: 500000, hra: 200000, status: "Active", pan: "LMNPM2345L", bank: "ICICI Bank", account: "012356789012", ifsc: "ICIC0000123" },
    ]

    const empByCode: Record<string, { id: string; name: string }> = {}
    for (const e of empSeeds) {
      const rec = await db.employee.create({
        data: {
          tenantId,
          employeeCode: e.code,
          firstName: e.first,
          lastName: e.last,
          displayName: `${e.first} ${e.last}`,
          gender: e.gender,
          dateOfBirth: e.dob,
          maritalStatus: e.gender === "Male" ? "Single" : "Single",
          bloodGroup: "B+",
          nationality: "Indian",
          personalEmail: e.personalEmail,
          officialEmail: e.officialEmail,
          mobileNumber: e.mobile,
          dateOfJoining: e.doj,
          employmentType: "Full-time",
          workerType: "Permanent",
          probationStatus: monthsAgo(0).getTime() - e.doj.getTime() > 180 * 24 * 3600 * 1000 ? "Confirmed" : "On Probation",
          probationEndDate: new Date(e.doj.getTime() + 90 * 24 * 3600 * 1000),
          noticePeriod: 60,
          employeeStatus: e.status,
          entityId: espl.id,
          branchId: e.branch === "BOM-HQ" ? bomHq.id : e.branch === "BLR-TECH" ? blrTech.id : delSales.id,
          departmentId: depts[e.dept].id,
          designationId: desigs[e.desig],
          gradeId: grades[e.grade],
          locationId: locs[e.loc],
          reportingManagerId: null, // set after creation below
          bankName: e.bank,
          accountNumber: e.account,
          ifscCode: e.ifsc,
          panNumber: e.pan,
          aadhaarNumber: "XXXX-XXXX-" + Math.floor(1000 + Math.random() * 9000),
          uanNumber: "101234567890",
          pfNumber: "BGBNG/" + e.code.replace("EMP-", "") + "/000",
          currentAddress: "Mumbai, Maharashtra",
          permanentAddress: "Mumbai, Maharashtra",
          ctc: e.ctc,
          basicSalary: e.basic,
          hra: e.hra,
        },
      })
      empByCode[e.code] = { id: rec.id, name: `${e.first} ${e.last}` }
    }
    // Wire up reporting managers
    for (const e of empSeeds) {
      if (e.mgrCode) {
        await db.employee.update({
          where: { id: empByCode[e.code].id },
          data: { reportingManagerId: empByCode[e.mgrCode].id },
        })
      }
    }
    counts.employees = empSeeds.length

    // ---------- LEAVE TYPES (5) ----------
    const ltDefs = [
      { code: "CL", name: "Casual Leave", color: "#10b981", isPaid: true, yearlyAccrual: 12, carryForward: true, carryForwardLimit: 6, halfDayAllowed: true, genderApplicability: "All" },
      { code: "SL", name: "Sick Leave", color: "#f59e0b", isPaid: true, yearlyAccrual: 7, carryForward: false, halfDayAllowed: false, attachmentRequired: false, genderApplicability: "All" },
      { code: "EL", name: "Earned Leave", color: "#06b6d4", isPaid: true, yearlyAccrual: 15, carryForward: true, carryForwardLimit: 30, encashment: true, genderApplicability: "All" },
      { code: "PL", name: "Privilege Leave", color: "#d946ef", isPaid: true, yearlyAccrual: 12, carryForward: false, halfDayAllowed: true, genderApplicability: "All" },
      { code: "CO", name: "Comp Off", color: "#f43f5e", isPaid: true, monthlyAccrual: 1, yearlyAccrual: 0, carryForward: false, genderApplicability: "All" },
    ]
    const leaveTypes: Record<string, string> = {}
    for (const t of ltDefs) {
      const rec = await db.leaveType.create({
        data: { tenantId, ...t, fullDayAllowed: true, hourlyAllowed: false, openingBalance: 0, negativeAllowed: false, reasonRequired: true, minDays: 1, backdatedAllowed: true, futureAllowed: true, status: "Active" },
      })
      leaveTypes[t.code] = rec.id
    }
    counts.leaveTypes = ltDefs.length

    // ---------- LEAVE POLICY + items ----------
    const stdPolicy = await db.leavePolicy.create({
      data: {
        tenantId, name: "Standard Policy", code: "STD-POLICY",
        description: "Standard leave policy applicable to all full-time employees.",
        effectiveDate: yearsAgo(1), status: "Active",
      },
    })
    for (const t of ltDefs) {
      await db.leavePolicyItem.create({
        data: {
          leavePolicyId: stdPolicy.id,
          leaveTypeId: leaveTypes[t.code],
          allocation: t.yearlyAccrual || 12,
        },
      })
    }
    counts.leavePolicies = 1

    // ---------- LEAVE APPLICATIONS (3: 1 approved, 1 pending, 1 rejected) ----------
    const today = new Date(); today.setHours(0, 0, 0, 0)
    // Approved leave covering today (so dashboard's onLeaveToday = 1)
    const emp5 = empByCode["EMP-0005"].id
    const emp3 = empByCode["EMP-0003"].id
    const emp7 = empByCode["EMP-0007"].id
    await db.leaveApplication.create({
      data: {
        tenantId, employeeId: emp5, leaveTypeId: leaveTypes["CL"],
        fromDate: daysAgo(1), toDate: daysFromNow(1), days: 3, halfDay: false,
        reason: "Family function out of town", status: "Approved",
        appliedAt: daysAgo(5), decisionAt: daysAgo(4),
        decisionBy: empByCode["EMP-0002"].id, decisionComment: "Approved. Enjoy!",
      },
    })
    await db.leaveApplication.create({
      data: {
        tenantId, employeeId: emp3, leaveTypeId: leaveTypes["SL"],
        fromDate: daysFromNow(2), toDate: daysFromNow(2), days: 1, halfDay: false,
        reason: "Medical appointment", status: "Pending",
        appliedAt: daysAgo(1),
      },
    })
    await db.leaveApplication.create({
      data: {
        tenantId, employeeId: emp7, leaveTypeId: leaveTypes["PL"],
        fromDate: daysAgo(10), toDate: daysAgo(8), days: 3, halfDay: false,
        reason: "Personal work", status: "Rejected",
        appliedAt: daysAgo(12), decisionAt: daysAgo(11),
        decisionBy: empByCode["EMP-0001"].id, decisionComment: "Critical project deadline. Please apply next month.",
      },
    })
    counts.leaveApplications = 3

    // ---------- SHIFTS (3) ----------
    const shiftGeneral = await db.shift.create({
      data: {
        tenantId, code: "GEN", name: "General Shift",
        startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00",
        workingHours: 8, graceMinutes: 15, halfDayHours: 4, fullDayHours: 8,
        isNightShift: false, isFlexible: false, autoPunchOut: false, overtimeEligible: true,
        color: "#10b981", status: "Active",
      },
    })
    const shiftEarly = await db.shift.create({
      data: {
        tenantId, code: "EARLY", name: "Early Shift",
        startTime: "06:00", endTime: "15:00", breakStart: "11:00", breakEnd: "12:00",
        workingHours: 8, graceMinutes: 10, halfDayHours: 4, fullDayHours: 8,
        isNightShift: false, isFlexible: false, autoPunchOut: false, overtimeEligible: true,
        color: "#06b6d4", status: "Active",
      },
    })
    const shiftNight = await db.shift.create({
      data: {
        tenantId, code: "NIGHT", name: "Night Shift",
        startTime: "22:00", endTime: "07:00", breakStart: "02:00", breakEnd: "03:00",
        workingHours: 8, graceMinutes: 15, halfDayHours: 4, fullDayHours: 8,
        isNightShift: true, isFlexible: false, autoPunchOut: false, overtimeEligible: true,
        color: "#d946ef", status: "Active",
      },
    })
    counts.shifts = 3

    // ---------- ROSTERS (2: 1 Published, 1 Draft) for current week ----------
    const mondayThisWeek = new Date(today)
    const dow = mondayThisWeek.getDay() // 0 Sun ... 6 Sat
    mondayThisWeek.setDate(mondayThisWeek.getDate() - ((dow + 6) % 7))
    const fridayThisWeek = new Date(mondayThisWeek); fridayThisWeek.setDate(mondayThisWeek.getDate() + 4)

    const rosterPub = await db.roster.create({
      data: {
        tenantId, name: "Engineering Weekly Roster", code: "ENG-ROSTER-W1",
        startDate: mondayThisWeek, endDate: fridayThisWeek, cycle: "Weekly",
        status: "Published", publishedAt: daysAgo(2),
      },
    })
    const rosterDraft = await db.roster.create({
      data: {
        tenantId, name: "Operations Draft Roster", code: "OPS-ROSTER-W1",
        startDate: mondayThisWeek, endDate: fridayThisWeek, cycle: "Weekly",
        status: "Draft",
      },
    })
    // Roster entries — 3 for published roster (EMP-1 General Mon-Wed)
    for (let i = 0; i < 3; i++) {
      const d = new Date(mondayThisWeek); d.setDate(d.getDate() + i)
      await db.rosterEntry.create({
        data: {
          rosterId: rosterPub.id, employeeId: empByCode["EMP-0001"].id, shiftId: shiftGeneral.id,
          date: d, isWeeklyOff: false, isHoliday: false,
        },
      })
    }
    // 2 entries for draft roster (EMP-8 Night Mon, EMP-12 General Tue)
    const dMon = new Date(mondayThisWeek)
    const dTue = new Date(mondayThisWeek); dTue.setDate(dTue.getDate() + 1)
    await db.rosterEntry.create({
      data: { rosterId: rosterDraft.id, employeeId: empByCode["EMP-0008"].id, shiftId: shiftNight.id, date: dMon, isWeeklyOff: false, isHoliday: false },
    })
    await db.rosterEntry.create({
      data: { rosterId: rosterDraft.id, employeeId: empByCode["EMP-0012"].id, shiftId: shiftEarly.id, date: dTue, isWeeklyOff: false, isHoliday: false },
    })
    counts.rosters = 2

    // ---------- HOLIDAYS (8 for current year) ----------
    const yr = new Date().getFullYear()
    const holDefs = [
      { name: "Republic Day", date: dateOnly(yr, 0, 26), type: "National", description: "National holiday" },
      { name: "Holi", date: dateOnly(yr, 2, 14), type: "Regional", description: "Festival of colors", state: "Maharashtra" },
      { name: "Good Friday", date: dateOnly(yr, 3, 18), type: "National", description: "Christian holiday" },
      { name: "Independence Day", date: dateOnly(yr, 7, 15), type: "National", description: "National holiday" },
      { name: "Ganesh Chaturthi", date: dateOnly(yr, 7, 27), type: "Regional", description: "Hindu festival", state: "Maharashtra" },
      { name: "Gandhi Jayanti", date: dateOnly(yr, 9, 2), type: "National", description: "Birth anniversary of Mahatma Gandhi" },
      { name: "Dussehra", date: dateOnly(yr, 9, 21), type: "Regional", description: "Hindu festival" },
      { name: "Diwali", date: dateOnly(yr, 10, 1), type: "Regional", description: "Festival of lights" },
    ]
    for (const h of holDefs) {
      await db.holiday.create({ data: { tenantId, ...h, country: "India" } })
    }
    counts.holidays = holDefs.length

    // ---------- ATTENDANCE (5 records for first employee, last 5 working days) ----------
    // Skip weekends: walk back from today, pick last 5 weekdays.
    const workingDays: Date[] = []
    const cursor = new Date(today)
    while (workingDays.length < 5) {
      const d = cursor.getDay()
      if (d !== 0 && d !== 6) workingDays.push(new Date(cursor))
      cursor.setDate(cursor.getDate() - 1)
    }
    const attStatuses = [
      { status: "Present", isLate: false, workHours: 8.5, source: "Web", remarks: "On time" },
      { status: "Late", isLate: true, workHours: 8.0, source: "Web", remarks: "Traffic delay" },
      { status: "WFH", isLate: false, workHours: 8.0, source: "Mobile", remarks: "Work from home" },
      { status: "Present", isLate: false, workHours: 9.0, source: "Web", remarks: "Stayed late" },
      { status: "Present", isLate: false, workHours: 8.0, source: "Web", remarks: "" },
    ]
    for (let i = 0; i < 5; i++) {
      const d = workingDays[i]
      const clockIn = new Date(d); clockIn.setHours(9, attStatuses[i].isLate ? 25 : 5, 0, 0)
      const clockOut = new Date(d); clockOut.setHours(18, 10, 0, 0)
      await db.attendance.create({
        data: {
          tenantId, employeeId: empByCode["EMP-0001"].id,
          date: d, clockIn, clockOut,
          status: attStatuses[i].status,
          workHours: attStatuses[i].workHours,
          overtimeHours: Math.max(0, attStatuses[i].workHours - 8),
          isLate: attStatuses[i].isLate,
          isEarlyGoing: false,
          remarks: attStatuses[i].remarks,
          source: attStatuses[i].source,
        },
      })
    }
    counts.attendance = 5

    // ---------- ASSET CATEGORIES (3) ----------
    const catLaptops = await db.assetCategory.create({ data: { tenantId, code: "LAPTOPS", name: "Laptops", icon: "Laptop", description: "Company-issued laptops" } })
    const catMobile = await db.assetCategory.create({ data: { tenantId, code: "MOBILE", name: "Mobile", icon: "Smartphone", description: "Mobile phones" } })
    const catAcc = await db.assetCategory.create({ data: { tenantId, code: "ACCESSORIES", name: "Accessories", icon: "Mouse", description: "Monitors, keyboards, mice, etc." } })
    counts.assetCategories = 3

    // ---------- ASSETS (6: 2 laptops assigned, 1 in stock, 1 mobile, 1 monitor, 1 keyboard) ----------
    const ast1 = await db.asset.create({
      data: { tenantId, assetCode: "AST-LP-001", name: "Dell Latitude 5430", categoryId: catLaptops.id, serialNumber: "DL5430-001", assetTag: "LP-001", purchaseDate: yearsAgo(1, 10), purchaseValue: 95000, condition: "Good", status: "Assigned", assignedToId: empByCode["EMP-0001"].id, assignedDate: yearsAgo(2), notes: "Primary work laptop" },
    })
    const ast2 = await db.asset.create({
      data: { tenantId, assetCode: "AST-LP-002", name: "HP EliteBook 840", categoryId: catLaptops.id, serialNumber: "HP840-002", assetTag: "LP-002", purchaseDate: yearsAgo(1, 6), purchaseValue: 102000, condition: "Good", status: "Assigned", assignedToId: empByCode["EMP-0002"].id, assignedDate: monthsAgo(22), notes: "Primary work laptop" },
    })
    const ast3 = await db.asset.create({
      data: { tenantId, assetCode: "AST-LP-003", name: "Lenovo ThinkPad T14", categoryId: catLaptops.id, serialNumber: "LNV-T14-003", assetTag: "LP-003", purchaseDate: monthsAgo(3), purchaseValue: 110000, condition: "Good", status: "In Stock", notes: "Spare laptop for new joiners" },
    })
    await db.asset.create({
      data: { tenantId, assetCode: "AST-MB-001", name: "iPhone 14", categoryId: catMobile.id, serialNumber: "IP14-001", assetTag: "MB-001", purchaseDate: monthsAgo(6), purchaseValue: 79000, condition: "Good", status: "In Stock", notes: "Sales team pool device" },
    })
    await db.asset.create({
      data: { tenantId, assetCode: "AST-ACC-001", name: "Dell 27\" Monitor", categoryId: catAcc.id, serialNumber: "DELL27-001", assetTag: "ACC-001", purchaseDate: monthsAgo(4), purchaseValue: 22000, condition: "Good", status: "In Stock", notes: "External monitor" },
    })
    await db.asset.create({
      data: { tenantId, assetCode: "AST-ACC-002", name: "Logitech Keyboard", categoryId: catAcc.id, serialNumber: "LOG-K380-002", assetTag: "ACC-002", purchaseDate: monthsAgo(2), purchaseValue: 3500, condition: "Good", status: "In Stock", notes: "Wireless keyboard" },
    })
    counts.assets = 6

    // Asset assignments (2 records for the 2 assigned laptops)
    await db.assetAssignment.create({ data: { assetId: ast1.id, employeeId: empByCode["EMP-0001"].id, assignedDate: yearsAgo(2), condition: "Good", acknowledged: true, notes: "Initial assignment" } })
    await db.assetAssignment.create({ data: { assetId: ast2.id, employeeId: empByCode["EMP-0002"].id, assignedDate: monthsAgo(22), condition: "Good", acknowledged: true, notes: "Initial assignment" } })

    // ---------- ASSET REQUESTS (2: 1 pending, 1 approved) ----------
    await db.assetRequest.create({
      data: { tenantId, employeeId: empByCode["EMP-0004"].id, categoryId: catLaptops.id, requestType: "New", reason: "Need a dedicated laptop for development work", status: "Pending", priority: "High" },
    })
    await db.assetRequest.create({
      data: { tenantId, employeeId: empByCode["EMP-0012"].id, categoryId: catAcc.id, requestType: "New", reason: "Need external monitor for coding", status: "Approved", priority: "Medium" },
    })
    counts.assetRequests = 2

    // ---------- ANNOUNCEMENTS (2) ----------
    await db.announcement.create({
      data: { tenantId, title: "Welcome to Nexus HR", body: "We're excited to roll out our new HRMS. Please complete your profile and explore the dashboard.", audience: "All", publishDate: daysAgo(7), priority: "Normal" },
    })
    await db.announcement.create({
      data: { tenantId, title: "Q3 Town Hall — Save the Date", body: "Our quarterly town hall is scheduled for next Friday at 4 PM IST. Please plan to attend.", audience: "All", publishDate: daysAgo(2), priority: "High" },
    })
    counts.announcements = 2

    // ---------- AUDIT LOGS (3) ----------
    await db.auditLog.create({ data: { tenantId, module: "employee", action: "Create", recordId: empByCode["EMP-0001"].id, userId: empByCode["EMP-0003"].id, userName: "Ananya Iyer", details: JSON.stringify({ code: "EMP-0001" }), ip: "10.0.0.12" } })
    await db.auditLog.create({ data: { tenantId, module: "leave", action: "Approve", recordId: empByCode["EMP-0005"].id, userId: empByCode["EMP-0002"].id, userName: "Vivaan Mehta", details: JSON.stringify({ days: 3 }), ip: "10.0.0.18" } })
    await db.auditLog.create({ data: { tenantId, module: "asset", action: "Create", recordId: ast1.id, userId: empByCode["EMP-0003"].id, userName: "Ananya Iyer", details: JSON.stringify({ assetCode: "AST-LP-001" }), ip: "10.0.0.12" } })
    counts.auditLogs = 3

    // ---------- FORM SCHEMAS (2) ----------
    // 1. Clone default employee form
    await db.formSchema.create({
      data: {
        tenantId, code: "employee-default", name: "Employee Form (Default Clone)",
        module: "employee", description: "Default employee form schema cloned from system defaults.",
        sections: JSON.stringify(defaultFormSchemas.employee.sections),
        status: "Published", version: 1,
      },
    })
    // 2. Custom "IT Asset Request" form
    const itAssetRequestSections = [
      {
        id: "sec-req-details",
        title: "Request Details",
        description: "Tell us what you need",
        fields: [
          { id: "f-asset-type", key: "assetType", label: "Asset Type", type: "select", width: "half", validation: { required: true }, options: [
            { label: "Laptop", value: "Laptop" }, { label: "Mobile", value: "Mobile" }, { label: "Monitor", value: "Monitor" }, { label: "Keyboard", value: "Keyboard" }, { label: "Other", value: "Other" },
          ] },
          { id: "f-req-type", key: "requestType", label: "Request Type", type: "select", width: "half", validation: { required: true }, options: [
            { label: "New", value: "New" }, { label: "Replacement", value: "Replacement" }, { label: "Repair", value: "Repair" },
          ] },
          { id: "f-priority", key: "priority", label: "Priority", type: "select", width: "half", options: [
            { label: "Low", value: "Low" }, { label: "Medium", value: "Medium" }, { label: "High", value: "High" }, { label: "Critical", value: "Critical" },
          ] },
          { id: "f-expected", key: "expectedDate", label: "Expected Date", type: "date", width: "half" },
          { id: "f-reason", key: "reason", label: "Reason / Justification", type: "textarea", width: "full", validation: { required: true, minLength: 10 } },
        ],
      },
      {
        id: "sec-asset-info",
        title: "Asset Specifications",
        description: "Preferred configuration",
        fields: [
          { id: "f-brand", key: "preferredBrand", label: "Preferred Brand", type: "text", width: "half", placeholder: "e.g. Dell, HP, Lenovo" },
          { id: "f-model", key: "preferredModel", label: "Preferred Model", type: "text", width: "half", placeholder: "e.g. Latitude 5430" },
          { id: "f-budget", key: "budget", label: "Indicative Budget", type: "currency", width: "half", unit: "₹" },
          { id: "f-config", key: "configuration", label: "Configuration Details", type: "textarea", width: "full", placeholder: "RAM, SSD, CPU, etc." },
        ],
      },
    ]
    await db.formSchema.create({
      data: {
        tenantId, code: "it-asset-request", name: "IT Asset Request",
        module: "custom", description: "Form for employees to request IT assets.",
        sections: JSON.stringify(itAssetRequestSections),
        status: "Published", version: 1,
      },
    })
    counts.formSchemas = 2

    // ---------- WORKFLOWS (2 with WorkflowSteps) ----------
    const wfLeave = await db.workflow.create({
      data: {
        tenantId, code: "leave-approval-2level", name: "Leave Approval 2-Level",
        module: "leave", event: "apply",
        description: "Two-level sequential approval: Reporting Manager → HR Manager.",
        approvalType: "Sequential", isActive: true,
      },
    })
    await db.workflowStep.create({ data: { workflowId: wfLeave.id, level: 1, approverType: "ReportingManager", name: "Reporting Manager Approval", slaHours: 24 } })
    await db.workflowStep.create({ data: { workflowId: wfLeave.id, level: 2, approverType: "HRManager", name: "HR Manager Approval", slaHours: 48 } })

    const wfAsset = await db.workflow.create({
      data: {
        tenantId, code: "asset-request-approval", name: "Asset Request Approval",
        module: "asset", event: "request",
        description: "Single-step Department Head approval for asset requests.",
        approvalType: "Sequential", isActive: true,
      },
    })
    await db.workflowStep.create({ data: { workflowId: wfAsset.id, level: 1, approverType: "DepartmentHead", name: "Department Head Approval", slaHours: 48 } })
    counts.workflows = 2

    return ok({ ok: true, counts })
  } catch (err: any) {
    console.error("[seed] error:", err)
    return bad("Seed failed: " + (err?.message || String(err)), 500)
  }
}
