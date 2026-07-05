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
function monthsFromNow(n: number): Date {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setMonth(d.getMonth() + n)
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
    // Phase 3 payroll (must precede salary structure / payroll run)
    await db.payslip.deleteMany()
    await db.payrollRun.deleteMany()
    await db.salaryAssignment.deleteMany()
    await db.salaryStructure.deleteMany()
    // Phase 2 employee sub-records (must precede employee.deleteMany — FK to Employee)
    await db.employeeRequest.deleteMany()
    await db.employeeLetter.deleteMany()
    await db.employeeHelpdeskTicket.deleteMany()
    await db.employeeExpense.deleteMany()
    await db.employeePerformanceReview.deleteMany()
    await db.employeePerformanceGoal.deleteMany()
    await db.employeeTraining.deleteMany()
    await db.employeeCertification.deleteMany()
    await db.employeeSkill.deleteMany()
    await db.employeeFormSubmission.deleteMany()
    await db.employeeCustomFieldValue.deleteMany()
    await db.employeeRoleMapping.deleteMany()
    await db.employeeLoginAccess.deleteMany()
    await db.employeeExit.deleteMany()
    await db.employeeProbation.deleteMany()
    await db.employeePromotionHistory.deleteMany()
    await db.employeeTransferHistory.deleteMany()
    await db.employeeStatusHistory.deleteMany()
    await db.employeeAuditLog.deleteMany()
    await db.employeeTimelineEvent.deleteMany()
    await db.employeeNote.deleteMany()
    await db.employeeCompensationHistory.deleteMany()
    await db.employeeDocument.deleteMany()
    await db.employeeStatutoryDetail.deleteMany()
    await db.employeeBankDetail.deleteMany()
    await db.employeeExperience.deleteMany()
    await db.employeeEducation.deleteMany()
    await db.employeeFamilyMember.deleteMany()

    // Phase 1 records
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
      mgrCode: string | null; ctc: number
      status: string; pan: string; bank: string; account: string; ifsc: string
      // new personal fields
      religion?: string; category?: string; marital?: string; blood?: string
      passport?: string; emergencyName?: string; emergencyRelation?: string; emergencyPhone?: string
      currentCity?: string; currentState?: string; currentPincode?: string
      permCity?: string; permState?: string; permPincode?: string
      workMode?: string; businessUnit?: string; costCenter?: string
      // exit-related (for "On Notice" employees)
      resignationDate?: Date; resignationReason?: string
    }
    const empSeeds: EmpSeed[] = [
      { code: "EMP-0001", first: "Aarav", last: "Sharma", gender: "Male", dob: dateOnly(1990, 4, 15), doj: yearsAgo(2, 15, 0), mobile: "+91-9876543210", personalEmail: "aarav.sharma@gmail.com", officialEmail: "aarav.sharma@acme.com", entity: "ESPL", branch: "BOM-HQ", dept: "DEPT-ENG", desig: "DES-SSWE", grade: "L5-SEN", loc: "LOC-MUM", mgrCode: null, ctc: 2200000, status: "Active", pan: "ABCPS1234A", bank: "HDFC Bank", account: "501000123456789", ifsc: "HDFC0001234",
        religion: "Hindu", category: "General", marital: "Married", blood: "B+", passport: "P1234567",
        emergencyName: "Priya Sharma", emergencyRelation: "Spouse", emergencyPhone: "+91-9876543299",
        currentCity: "Mumbai", currentState: "Maharashtra", currentPincode: "400069",
        permCity: "Pune", permState: "Maharashtra", permPincode: "411001",
        workMode: "Hybrid", businessUnit: "Engineering", costCenter: "CC-ENG-100",
      },
      { code: "EMP-0002", first: "Vivaan", last: "Mehta", gender: "Male", dob: dateOnly(1991, 7, 22), doj: monthsAgo(22), mobile: "+91-9876543211", personalEmail: "vivaan.mehta@gmail.com", officialEmail: "vivaan.mehta@acme.com", entity: "ESPL", branch: "BLR-TECH", dept: "DEPT-ENG", desig: "DES-SSWE", grade: "L5-SEN", loc: "LOC-BLR", mgrCode: "EMP-0001", ctc: 2000000, status: "Active", pan: "BCDPM2345B", bank: "ICICI Bank", account: "012301234567", ifsc: "ICIC0000123",
        religion: "Hindu", category: "OBC", marital: "Single", blood: "O+",
        emergencyName: "Rajesh Mehta", emergencyRelation: "Father", emergencyPhone: "+91-9876543298",
        currentCity: "Bangalore", currentState: "Karnataka", currentPincode: "560103",
        permCity: "Indore", permState: "Madhya Pradesh", permPincode: "452001",
        workMode: "Work from office", businessUnit: "Engineering", costCenter: "CC-ENG-101",
      },
      { code: "EMP-0003", first: "Ananya", last: "Iyer", gender: "Female", dob: dateOnly(1994, 2, 8), doj: monthsAgo(18), mobile: "+91-9876543212", personalEmail: "ananya.iyer@gmail.com", officialEmail: "ananya.iyer@acme.com", entity: "ESPL", branch: "BOM-HQ", dept: "DEPT-HR", desig: "DES-HR-EXEC", grade: "L4-MID", loc: "LOC-MUM", mgrCode: "EMP-0001", ctc: 700000, status: "Active", pan: "CDEPI3456C", bank: "SBI", account: "30123456789", ifsc: "SBIN0001234",
        religion: "Hindu", category: "General", marital: "Single", blood: "AB+",
        emergencyName: "Lakshmi Iyer", emergencyRelation: "Mother", emergencyPhone: "+91-9876543297",
        currentCity: "Mumbai", currentState: "Maharashtra", currentPincode: "400070",
        permCity: "Chennai", permState: "Tamil Nadu", permPincode: "600001",
        workMode: "Work from office", businessUnit: "People Ops", costCenter: "CC-HR-200",
      },
      { code: "EMP-0004", first: "Aditya", last: "Reddy", gender: "Male", dob: dateOnly(1996, 10, 12), doj: monthsAgo(14), mobile: "+91-9876543213", personalEmail: "aditya.reddy@gmail.com", officialEmail: "aditya.reddy@acme.com", entity: "ESPL", branch: "BLR-TECH", dept: "DEPT-ENG", desig: "DES-SWE", grade: "L4-MID", loc: "LOC-BLR", mgrCode: "EMP-0002", ctc: 1200000, status: "Active", pan: "DEFPR4567D", bank: "Axis Bank", account: "917020001234", ifsc: "UTIB0000123",
        religion: "Hindu", category: "OBC", marital: "Single", blood: "A+",
        emergencyName: "Suresh Reddy", emergencyRelation: "Father", emergencyPhone: "+91-9876543296",
        currentCity: "Bangalore", currentState: "Karnataka", currentPincode: "560102",
        workMode: "Work from home", businessUnit: "Engineering", costCenter: "CC-ENG-102",
      },
      { code: "EMP-0005", first: "Saanvi", last: "Nair", gender: "Female", dob: dateOnly(1997, 5, 30), doj: monthsAgo(11), mobile: "+91-9876543214", personalEmail: "saanvi.nair@gmail.com", officialEmail: "saanvi.nair@acme.com", entity: "ESPL", branch: "BLR-TECH", dept: "DEPT-ENG", desig: "DES-SWE", grade: "L4-MID", loc: "LOC-BLR", mgrCode: "EMP-0002", ctc: 1100000, status: "Active", pan: "EFGPN5678E", bank: "Kotak Mahindra", account: "12341234567", ifsc: "KKBK0001234",
        religion: "Hindu", category: "General", marital: "Single", blood: "B+",
        emergencyName: "Geeta Nair", emergencyRelation: "Mother", emergencyPhone: "+91-9876543295",
        currentCity: "Bangalore", currentState: "Karnataka", currentPincode: "560103",
        workMode: "Hybrid", businessUnit: "Engineering", costCenter: "CC-ENG-103",
      },
      { code: "EMP-0006", first: "Arjun", last: "Gupta", gender: "Male", dob: dateOnly(1989, 1, 18), doj: monthsAgo(17), mobile: "+91-9876543215", personalEmail: "arjun.gupta@gmail.com", officialEmail: "arjun.gupta@acme.com", entity: "ESPL", branch: "DEL-SALES", dept: "DEPT-SAL", desig: "DES-SALES-MGR", grade: "L6-LEAD", loc: "LOC-DEL", mgrCode: "EMP-0001", ctc: 1900000, status: "Active", pan: "FGHPG6789F", bank: "HDFC Bank", account: "501009876543", ifsc: "HDFC0001234",
        religion: "Hindu", category: "General", marital: "Married", blood: "O+",
        emergencyName: "Neha Gupta", emergencyRelation: "Spouse", emergencyPhone: "+91-9876543294",
        currentCity: "New Delhi", currentState: "Delhi", currentPincode: "110001",
        workMode: "Field work", businessUnit: "Revenue", costCenter: "CC-SAL-300",
      },
      { code: "EMP-0007", first: "Ishita", last: "Verma", gender: "Female", dob: dateOnly(1998, 9, 5), doj: monthsAgo(5), mobile: "+91-9876543216", personalEmail: "ishita.verma@gmail.com", officialEmail: "ishita.verma@acme.com", entity: "ESPL", branch: "BOM-HQ", dept: "DEPT-FIN", desig: "DES-FIN-ANL", grade: "L4-MID", loc: "LOC-MUM", mgrCode: "EMP-0001", ctc: 900000, status: "Active", pan: "GHIPV7890G", bank: "ICICI Bank", account: "012309876543", ifsc: "ICIC0000123",
        religion: "Hindu", category: "General", marital: "Single", blood: "A-",
        emergencyName: "Manish Verma", emergencyRelation: "Brother", emergencyPhone: "+91-9876543293",
        currentCity: "Mumbai", currentState: "Maharashtra", currentPincode: "400053",
        workMode: "Work from office", businessUnit: "Finance", costCenter: "CC-FIN-400",
      },
      { code: "EMP-0008", first: "Kabir", last: "Singh", gender: "Male", dob: dateOnly(1992, 11, 27), doj: monthsAgo(13), mobile: "+91-9876543217", personalEmail: "kabir.singh@gmail.com", officialEmail: "kabir.singh@acme.com", entity: "ESPL", branch: "BLR-TECH", dept: "DEPT-OPS", desig: "DES-DEVOPS", grade: "L5-SEN", loc: "LOC-BLR", mgrCode: "EMP-0001", ctc: 1700000, status: "On Notice", pan: "HIJPS8901H", bank: "Axis Bank", account: "917020009876", ifsc: "UTIB0000123",
        religion: "Sikh", category: "General", marital: "Married", blood: "B+",
        emergencyName: "Simran Kaur", emergencyRelation: "Spouse", emergencyPhone: "+91-9876543292",
        currentCity: "Bangalore", currentState: "Karnataka", currentPincode: "560037",
        workMode: "Work from office", businessUnit: "Operations", costCenter: "CC-OPS-500",
        resignationDate: daysAgo(15), resignationReason: "Better opportunity abroad",
      },
      { code: "EMP-0009", first: "Aanya", last: "Joshi", gender: "Female", dob: dateOnly(1995, 6, 14), doj: monthsAgo(3), mobile: "+91-9876543218", personalEmail: "aanya.joshi@gmail.com", officialEmail: "aanya.joshi@acme.com", entity: "ESPL", branch: "DEL-SALES", dept: "DEPT-MKT", desig: "DES-SALES-MGR", grade: "L6-LEAD", loc: "LOC-DEL", mgrCode: "EMP-0006", ctc: 1400000, status: "Active", pan: "IJKPJ9012I", bank: "SBI", account: "30129876543", ifsc: "SBIN0001234",
        religion: "Hindu", category: "General", marital: "Married", blood: "AB-",
        emergencyName: "Rohit Joshi", emergencyRelation: "Spouse", emergencyPhone: "+91-9876543291",
        currentCity: "New Delhi", currentState: "Delhi", currentPincode: "110017",
        workMode: "Hybrid", businessUnit: "Revenue", costCenter: "CC-MKT-301",
      },
      { code: "EMP-0010", first: "Reyansh", last: "Kumar", gender: "Male", dob: dateOnly(1993, 3, 19), doj: monthsAgo(2), mobile: "+91-9876543219", personalEmail: "reyansh.kumar@gmail.com", officialEmail: "reyansh.kumar@acme.com", entity: "ESPL", branch: "BOM-HQ", dept: "DEPT-SAL", desig: "DES-SALES-MGR", grade: "L6-LEAD", loc: "LOC-MUM", mgrCode: "EMP-0006", ctc: 1500000, status: "Active", pan: "JKLPK0123J", bank: "Kotak Mahindra", account: "12340987654", ifsc: "KKBK0001234",
        religion: "Hindu", category: "OBC", marital: "Married", blood: "O+",
        emergencyName: "Pooja Kumar", emergencyRelation: "Spouse", emergencyPhone: "+91-9876543290",
        currentCity: "Mumbai", currentState: "Maharashtra", currentPincode: "400076",
        workMode: "Hybrid", businessUnit: "Revenue", costCenter: "CC-SAL-302",
      },
      { code: "EMP-0011", first: "Myra", last: "Desai", gender: "Female", dob: dateOnly(2000, 8, 11), doj: daysAgo(15), mobile: "+91-9876543220", personalEmail: "myra.desai@gmail.com", officialEmail: "myra.desai@acme.com", entity: "ESPL", branch: "BOM-HQ", dept: "DEPT-HR", desig: "DES-HR-EXEC", grade: "L4-MID", loc: "LOC-MUM", mgrCode: "EMP-0003", ctc: 650000, status: "Active", pan: "KLMPL1234K", bank: "HDFC Bank", account: "501005678901", ifsc: "HDFC0001234",
        religion: "Hindu", category: "General", marital: "Single", blood: "A+",
        emergencyName: "Kiran Desai", emergencyRelation: "Father", emergencyPhone: "+91-9876543289",
        currentCity: "Mumbai", currentState: "Maharashtra", currentPincode: "400050",
        workMode: "Work from office", businessUnit: "People Ops", costCenter: "CC-HR-201",
      },
      { code: "EMP-0012", first: "Vihaan", last: "Rao", gender: "Male", dob: dateOnly(1999, 12, 3), doj: daysAgo(5), mobile: "+91-9876543221", personalEmail: "vihaan.rao@gmail.com", officialEmail: "vihaan.rao@acme.com", entity: "ESPL", branch: "BLR-TECH", dept: "DEPT-OPS", desig: "DES-SWE", grade: "L4-MID", loc: "LOC-BLR", mgrCode: "EMP-0008", ctc: 1000000, status: "Active", pan: "LMNPM2345L", bank: "ICICI Bank", account: "012356789012", ifsc: "ICIC0000123",
        religion: "Hindu", category: "General", marital: "Single", blood: "B+",
        emergencyName: "Latha Rao", emergencyRelation: "Mother", emergencyPhone: "+91-9876543288",
        currentCity: "Bangalore", currentState: "Karnataka", currentPincode: "560100",
        workMode: "Work from home", businessUnit: "Operations", costCenter: "CC-OPS-501",
      },
    ]

    const empByCode: Record<string, { id: string; name: string }> = {}
    for (const e of empSeeds) {
      // Compensation breakdown — consistent with standard Indian payroll
      // (all annual figures; basic = 50% of CTC, hra = 40% of basic)
      const ctc = e.ctc
      const basic = Math.round(ctc * 0.5)
      const hra = Math.round(basic * 0.4)
      const conveyanceAllowance = 19200
      const medicalAllowance = 15000
      const specialAllowance = Math.max(0, ctc - basic - hra - conveyanceAllowance - medicalAllowance)
      const pfEmployee = Math.round(basic * 0.12)
      const pfEmployer = Math.round(basic * 0.12)
      const esiAmount = ctc / 12 <= 21000 ? Math.round(ctc * 0.0053) : 0
      const professionalTax = 2400
      const tdsAmount = Math.round(ctc * 0.10)
      const grossSalary = basic + hra + specialAllowance + conveyanceAllowance + medicalAllowance
      const netSalary = grossSalary - pfEmployee - professionalTax - tdsAmount

      const rec = await db.employee.create({
        data: {
          tenantId,
          employeeCode: e.code,
          firstName: e.first,
          lastName: e.last,
          displayName: `${e.first} ${e.last}`,
          gender: e.gender,
          dateOfBirth: e.dob,
          maritalStatus: e.marital || "Single",
          bloodGroup: e.blood || "B+",
          nationality: "Indian",
          religion: e.religion,
          category: e.category,
          personalEmail: e.personalEmail,
          officialEmail: e.officialEmail,
          mobileNumber: e.mobile,
          // Identity documents
          passportNumber: e.passport,
          physicallyDisabled: false,
          // Employment
          dateOfJoining: e.doj,
          employmentType: "Full-time",
          workerType: "Permanent",
          jobType: "On-roll",
          probationStatus: monthsAgo(0).getTime() - e.doj.getTime() > 180 * 24 * 3600 * 1000 ? "Confirmed" : "On Probation",
          probationStartDate: new Date(e.doj.getTime()),
          probationEndDate: new Date(e.doj.getTime() + 90 * 24 * 3600 * 1000),
          confirmationDate: monthsAgo(0).getTime() - e.doj.getTime() > 180 * 24 * 3600 * 1000 ? new Date(e.doj.getTime() + 90 * 24 * 3600 * 1000) : null,
          noticePeriod: 60,
          noticePeriodStartDate: e.status === "On Notice" ? daysAgo(15) : null,
          lastWorkingDate: e.status === "On Notice" ? daysFromNow(45) : null,
          employeeStatus: e.status,
          workMode: e.workMode || "Work from office",
          businessUnit: e.businessUnit,
          costCenter: e.costCenter,
          // Organization
          entityId: espl.id,
          branchId: e.branch === "BOM-HQ" ? bomHq.id : e.branch === "BLR-TECH" ? blrTech.id : delSales.id,
          departmentId: depts[e.dept].id,
          designationId: desigs[e.desig],
          gradeId: grades[e.grade],
          locationId: locs[e.loc],
          reportingManagerId: null, // set after creation below
          functionalManagerId: null,
          hrManagerId: null,
          // Bank
          bankName: e.bank,
          accountHolderName: `${e.first} ${e.last}`,
          accountNumber: e.account,
          accountType: "Savings",
          ifscCode: e.ifsc,
          branchName: `${e.bank} Branch`,
          upiId: `${e.first.toLowerCase()}.${e.last.toLowerCase()}@okhdfcbank`,
          // Statutory
          panNumber: e.pan,
          aadhaarNumber: "XXXX-XXXX-" + Math.floor(1000 + Math.random() * 9000),
          uanNumber: "101234567890",
          pfNumber: "BGBNG/" + e.code.replace("EMP-", "") + "/000",
          ptLocation: e.currentCity || "Mumbai",
          pfApplicable: true,
          esiApplicable: esiAmount > 0,
          ptApplicable: true,
          lwfApplicability: "Applicable",
          gratuityApplicability: "Applicable",
          taxRegime: "New",
          tdsDeclarationStatus: "Submitted",
          // Current address
          currentAddress: `${e.currentCity || "Mumbai"}, ${e.currentState || "Maharashtra"}`,
          currentAddressLine2: null,
          currentCity: e.currentCity,
          currentState: e.currentState,
          currentCountry: "India",
          currentPincode: e.currentPincode,
          // Permanent address
          permanentAddress: `${e.permCity || e.currentCity || "Mumbai"}, ${e.permState || e.currentState || "Maharashtra"}`,
          permanentAddressLine2: null,
          permanentCity: e.permCity || e.currentCity,
          permanentState: e.permState || e.currentState,
          permanentCountry: "India",
          permanentPincode: e.permPincode || e.currentPincode,
          sameAsCurrent: (e.permCity || e.currentCity) === e.currentCity,
          // Emergency contact
          emergencyContactName: e.emergencyName,
          emergencyContactRelation: e.emergencyRelation,
          emergencyContactPhone: e.emergencyPhone,
          emergencyContactAltPhone: null,
          emergencyContactEmail: null,
          emergencyContactAddress: null,
          communicationPreference: "Email",
          // Compensation
          ctc,
          basicSalary: basic,
          hra,
          specialAllowance,
          conveyanceAllowance,
          medicalAllowance,
          bonusAmount: 0,
          pfEmployee,
          pfEmployer,
          esiAmount,
          professionalTax,
          tdsAmount,
          grossSalary,
          netSalary,
          // Exit
          resignationDate: e.resignationDate || null,
          resignationReason: e.resignationReason || null,
          exitStatus: e.status === "On Notice" ? "Resignation submitted" : "Not initiated",
        },
      })
      empByCode[e.code] = { id: rec.id, name: `${e.first} ${e.last}` }
    }
    // Wire up reporting managers, functional managers, hr manager
    for (const e of empSeeds) {
      const updates: Record<string, unknown> = {}
      if (e.mgrCode) updates.reportingManagerId = empByCode[e.mgrCode].id
      // functional manager = same as reporting manager for now
      if (e.mgrCode) updates.functionalManagerId = empByCode[e.mgrCode].id
      // hr manager = Ananya (EMP-0003) for everyone except herself (where it's Aarav)
      updates.hrManagerId = e.code === "EMP-0003" ? empByCode["EMP-0001"].id : empByCode["EMP-0003"].id
      if (Object.keys(updates).length) {
        await db.employee.update({
          where: { id: empByCode[e.code].id },
          data: updates,
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
        country: "India", leaveYearType: "CalendarYear", calendarStartMonth: 1,
        effectiveFrom: yearsAgo(1), isDefault: true, priority: 0, version: 1, status: "Active",
      },
    })
    for (const t of ltDefs) {
      await db.leavePolicyItem.create({
        data: {
          leavePolicyId: stdPolicy.id,
          leaveTypeId: leaveTypes[t.code],
          entitlementType: "Fixed",
          totalEntitlement: t.yearlyAccrual || 12,
          entitlementUnit: "Days",
          creditTiming: "YearStart",
          accrualFrequency: "Yearly",
          accrualAmount: t.yearlyAccrual || 12,
          accrualDate: 1,
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

    // ============================================================
    // PHASE 2 — EMPLOYEE PROFILE SUB-RECORDS (for first 3 employees)
    // ============================================================
    const detailEmpCodes = ["EMP-0001", "EMP-0002", "EMP-0003"]
    const detailEmpIds = detailEmpCodes.map((c) => empByCode[c].id)
    const subCounts: Record<string, number> = {}

    // Helper to count quickly
    const bump = (k: string) => { subCounts[k] = (subCounts[k] || 0) + 1 }

    for (let idx = 0; idx < detailEmpCodes.length; idx++) {
      const code = detailEmpCodes[idx]
      const empId = detailEmpIds[idx]
      const e = empSeeds.find((x) => x.code === code)!
      const ctc = e.ctc
      const basic = Math.round(ctc * 0.5)
      const hra = Math.round(basic * 0.4)
      const doj = e.doj

      // ---- Family members (2-3 each) ----
      if (code === "EMP-0001") {
        await db.employeeFamilyMember.create({ data: { tenantId, employeeId: empId, name: "Priya Sharma", relationship: "Spouse", gender: "Female", dateOfBirth: dateOnly(1992, 6, 20), mobileNumber: "+91-9876543299", occupation: "Doctor", isDependent: true, isNominee: true, nomineePercentage: 100, insuranceApplicable: true } })
        bump("family")
        await db.employeeFamilyMember.create({ data: { tenantId, employeeId: empId, name: "Ayaan Sharma", relationship: "Son", gender: "Male", dateOfBirth: dateOnly(2020, 3, 12), isDependent: true, isNominee: false, insuranceApplicable: true } })
        bump("family")
        await db.employeeFamilyMember.create({ data: { tenantId, employeeId: empId, name: "Ramesh Sharma", relationship: "Father", gender: "Male", dateOfBirth: dateOnly(1958, 8, 5), occupation: "Retired", isDependent: false, isNominee: false } })
        bump("family")
      } else if (code === "EMP-0002") {
        await db.employeeFamilyMember.create({ data: { tenantId, employeeId: empId, name: "Rajesh Mehta", relationship: "Father", gender: "Male", dateOfBirth: dateOnly(1960, 1, 18), occupation: "Business", isDependent: true, isNominee: true, nomineePercentage: 100, insuranceApplicable: true } })
        bump("family")
        await db.employeeFamilyMember.create({ data: { tenantId, employeeId: empId, name: "Sunita Mehta", relationship: "Mother", gender: "Female", dateOfBirth: dateOnly(1963, 5, 22), occupation: "Homemaker", isDependent: true, isNominee: false, insuranceApplicable: true } })
        bump("family")
      } else {
        await db.employeeFamilyMember.create({ data: { tenantId, employeeId: empId, name: "Lakshmi Iyer", relationship: "Mother", gender: "Female", dateOfBirth: dateOnly(1965, 11, 30), occupation: "Teacher", isDependent: true, isNominee: true, nomineePercentage: 100, insuranceApplicable: true } })
        bump("family")
        await db.employeeFamilyMember.create({ data: { tenantId, employeeId: empId, name: "Krishnan Iyer", relationship: "Father", gender: "Male", dateOfBirth: dateOnly(1962, 7, 14), occupation: "Retired Banker", isDependent: true, isNominee: false } })
        bump("family")
      }

      // ---- Education records (UG + PG) ----
      await db.employeeEducation.create({ data: { tenantId, employeeId: empId, qualification: "UG", degree: "B.E. Computer Science", specialization: "Computer Science", institute: "VJTI Mumbai", university: "Mumbai University", yearOfPassing: 2011, percentage: 78, cgpa: 8.2, educationType: "Full-time", isHighest: false, certificateUrl: null } })
      bump("education")
      await db.employeeEducation.create({ data: { tenantId, employeeId: empId, qualification: "PG", degree: "M.Tech Software Systems", specialization: "Software Systems", institute: "BITS Pilani", university: "BITS Pilani", yearOfPassing: 2013, percentage: 82, cgpa: 8.7, educationType: "Full-time", isHighest: true, certificateUrl: null } })
      bump("education")

      // ---- Experience records (1-2 each) ----
      await db.employeeExperience.create({
        data: {
          tenantId, employeeId: empId,
          companyName: "Infosys Limited", designation: "Software Engineer", department: "Engineering",
          startDate: yearsAgo(7, 5), endDate: yearsAgo(3, 5),
          totalYears: 4.0, reasonForLeaving: "Career growth", previousSalary: 800000,
          managerName: "Sridhar Rao", managerContact: "+91-9000011111",
          verificationStatus: "Verified",
        },
      })
      bump("experience")
      if (code !== "EMP-0003") {
        await db.employeeExperience.create({
          data: {
            tenantId, employeeId: empId,
            companyName: "TCS Digital", designation: "Senior Engineer", department: "Engineering",
            startDate: yearsAgo(3, 5), endDate: doj,
            totalYears: 1.5, reasonForLeaving: "Better opportunity", previousSalary: 1200000,
            managerName: "Anil Kumar", managerContact: "+91-9000022222",
            verificationStatus: "Verified",
          },
        })
        bump("experience")
      }

      // ---- Bank detail (active) ----
      await db.employeeBankDetail.create({
        data: {
          tenantId, employeeId: empId,
          bankName: e.bank, accountHolderName: `${e.first} ${e.last}`,
          accountNumber: e.account, ifscCode: e.ifsc,
          branchName: `${e.bank} Branch`, accountType: "Savings",
          upiId: `${e.first.toLowerCase()}.${e.last.toLowerCase()}@okhdfcbank`,
          isActive: true, verified: true, effectiveDate: doj,
        },
      })
      bump("bank")

      // ---- Statutory detail ----
      await db.employeeStatutoryDetail.create({
        data: {
          tenantId, employeeId: empId,
          panNumber: e.pan,
          aadhaarNumber: "XXXX-XXXX-1234",
          uanNumber: "101234567890",
          pfNumber: "BGBNG/" + code.replace("EMP-", "") + "/000",
          esiNumber: null,
          ptLocation: e.currentCity,
          lwfApplicability: "Applicable",
          gratuityApplicability: "Applicable",
          pfApplicable: true, esiApplicable: false, ptApplicable: true,
          taxRegime: "New",
          tdsDeclarationStatus: "Submitted",
          nomineeDetails: JSON.stringify({ name: e.emergencyName, relation: e.emergencyRelation, percent: 100 }),
          effectiveDate: doj,
        },
      })
      bump("statutory")

      // ---- Documents (3-5 each) ----
      await db.employeeDocument.create({ data: { tenantId, employeeId: empId, name: "Aadhaar Card", category: "Identity", documentType: "Aadhaar", fileUrl: "/docs/aadhaar.pdf", fileExt: "pdf", fileSize: 240000, status: "Approved", uploadedAt: doj, approvedAt: doj, approvedBy: "Ananya Iyer" } })
      bump("documents")
      await db.employeeDocument.create({ data: { tenantId, employeeId: empId, name: "PAN Card", category: "Identity", documentType: "PAN", fileUrl: "/docs/pan.pdf", fileExt: "pdf", fileSize: 180000, status: "Approved", uploadedAt: doj, approvedAt: doj, approvedBy: "Ananya Iyer" } })
      bump("documents")
      await db.employeeDocument.create({ data: { tenantId, employeeId: empId, name: "Profile Photo", category: "Identity", documentType: "Photo", fileUrl: "/docs/photo.jpg", fileExt: "jpg", fileSize: 95000, status: "Approved", uploadedAt: doj, approvedAt: doj, approvedBy: "Ananya Iyer" } })
      bump("documents")
      await db.employeeDocument.create({ data: { tenantId, employeeId: empId, name: "Resume", category: "Joining", documentType: "Resume", fileUrl: "/docs/resume.pdf", fileExt: "pdf", fileSize: 320000, status: "Uploaded", uploadedAt: doj } })
      bump("documents")
      await db.employeeDocument.create({ data: { tenantId, employeeId: empId, name: "Offer Letter", category: "Joining", documentType: "Offer letter", fileUrl: "/docs/offer.pdf", fileExt: "pdf", fileSize: 210000, status: "Approved", uploadedAt: doj, approvedAt: doj, approvedBy: "Ananya Iyer" } })
      bump("documents")
      // Expiring soon — passport expiring in 30 days
      if (e.passport) {
        await db.employeeDocument.create({ data: { tenantId, employeeId: empId, name: "Passport", category: "Identity", documentType: "Passport", fileUrl: "/docs/passport.pdf", fileExt: "pdf", fileSize: 410000, status: "Expiring soon", expiryDate: daysFromNow(30), uploadedAt: doj, remarks: "Expiring soon — renewal due" } })
        bump("documents")
      }

      // ---- Compensation history (joining + annual appraisal) ----
      await db.employeeCompensationHistory.create({
        data: {
          tenantId, employeeId: empId, effectiveDate: doj,
          oldCtc: null, newCtc: ctc,
          oldBasic: null, newBasic: basic,
          oldHra: null, newHra: hra,
          incrementPercent: null, revisionReason: "Joining",
          approvedBy: "Ananya Iyer", status: "Approved",
        },
      })
      bump("compensation")
      // Annual appraisal after 1 year (10% raise)
      const apprDate = new Date(doj); apprDate.setFullYear(apprDate.getFullYear() + 1)
      if (apprDate.getTime() < new Date().getTime()) {
        const newCtc = Math.round(ctc * 1.1)
        const newBasic = Math.round(newCtc * 0.5)
        const newHra = Math.round(newBasic * 0.4)
        await db.employeeCompensationHistory.create({
          data: {
            tenantId, employeeId: empId, effectiveDate: apprDate,
            oldCtc: ctc, newCtc,
            oldBasic: basic, newBasic,
            oldHra: hra, newHra,
            incrementPercent: 10, revisionReason: "Annual appraisal",
            approvedBy: "Ananya Iyer", status: "Approved",
          },
        })
        bump("compensation")
      }

      // ---- Notes (2-3 each, mix of categories) ----
      await db.employeeNote.create({ data: { tenantId, employeeId: empId, category: "General", body: "Onboarding completed. All joining documents verified.", isPrivate: false, visibleToManager: true, createdBy: "Ananya Iyer" } })
      bump("notes")
      await db.employeeNote.create({ data: { tenantId, employeeId: empId, category: "Performance", body: "Strong technical skills. Demonstrated leadership in Q2 project delivery.", isPrivate: false, visibleToManager: true, createdBy: "Aarav Sharma" } })
      bump("notes")
      if (code !== "EMP-0003") {
        await db.employeeNote.create({ data: { tenantId, employeeId: empId, category: "Manager feedback", body: "Consistently meets expectations. Ready for next-level responsibility.", isPrivate: true, visibleToManager: true, createdBy: "Vivaan Mehta" } })
        bump("notes")
      }

      // ---- Timeline events (5-8 each) ----
      const tl: Array<{ type: string; title: string; date: Date; desc?: string }> = [
        { type: "Created", title: "Employee record created", date: new Date(doj.getTime() - 7 * 24 * 3600 * 1000) },
        { type: "Joined", title: "Joined ACME Corporation", date: doj, desc: `Joined as ${e.desig}` },
        { type: "Document uploaded", title: "Onboarding documents uploaded", date: new Date(doj.getTime() + 1 * 24 * 3600 * 1000) },
        { type: "Profile updated", title: "Bank details verified", date: new Date(doj.getTime() + 3 * 24 * 3600 * 1000) },
        { type: "Salary revised", title: "Annual appraisal", date: apprDate.getTime() < new Date().getTime() ? apprDate : new Date(doj.getTime() + 30 * 24 * 3600 * 1000), desc: "10% increment" },
        { type: "Profile updated", title: "Probation confirmed", date: new Date(doj.getTime() + 90 * 24 * 3600 * 1000) },
        { type: "Profile updated", title: "Asset assigned", date: new Date(doj.getTime() + 2 * 24 * 3600 * 1000), desc: "Dell Latitude 5430" },
        { type: "Profile updated", title: "Profile photo updated", date: daysAgo(45) },
      ]
      for (const t of tl) {
        await db.employeeTimelineEvent.create({ data: { tenantId, employeeId: empId, eventType: t.type, title: t.title, description: t.desc || null, eventDate: t.date, actorName: "Ananya Iyer" } })
        bump("timeline")
      }

      // ---- Audit logs (3-5 each) ----
      const aud: Array<{ module: string; field: string; oldV: string; newV: string; date: Date; action: string }> = [
        { module: "Personal", field: "officialEmail", oldV: "", newV: e.officialEmail || "", date: new Date(doj.getTime() - 7 * 24 * 3600 * 1000), action: "Create" },
        { module: "Job", field: "departmentId", oldV: "", newV: depts[e.dept].id, date: doj, action: "Create" },
        { module: "Bank", field: "accountNumber", oldV: "", newV: e.account, date: new Date(doj.getTime() + 3 * 24 * 3600 * 1000), action: "Update" },
        { module: "Compensation", field: "ctc", oldV: String(ctc), newV: String(Math.round(ctc * 1.1)), date: apprDate.getTime() < new Date().getTime() ? apprDate : new Date(doj.getTime() + 30 * 24 * 3600 * 1000), action: "Update" },
        { module: "Personal", field: "currentAddress", oldV: "Mumbai, Maharashtra", newV: `${e.currentCity}, ${e.currentState}`, date: daysAgo(60), action: "Update" },
      ]
      for (const a of aud) {
        await db.employeeAuditLog.create({ data: { tenantId, employeeId: empId, module: a.module, field: a.field, oldValue: a.oldV, newValue: a.newV, action: a.action, changedBy: "Ananya Iyer", createdAt: a.date } })
        bump("audit")
      }

      // ---- Status history (1 each) ----
      await db.employeeStatusHistory.create({ data: { tenantId, employeeId: empId, oldStatus: null, newStatus: "Active", effectiveDate: doj, reason: "New hire onboarding", changedBy: "Ananya Iyer" } })
      bump("statusHistory")

      // ---- Transfer history (1 for EMP-0002) ----
      if (code === "EMP-0002") {
        await db.employeeTransferHistory.create({
          data: {
            tenantId, employeeId: empId,
            oldDepartment: "Sales", newDepartment: "Engineering",
            oldLocation: "Delhi Office", newLocation: "Bangalore Office",
            oldManager: "Arjun Gupta", newManager: "Aarav Sharma",
            oldEntity: "Example Services", newEntity: "Example Services",
            effectiveDate: new Date(doj.getTime() + 60 * 24 * 3600 * 1000),
            reason: "Internal transfer to engineering team",
            status: "Approved", approvedBy: "Ananya Iyer",
          },
        })
        bump("transfers")
      }

      // ---- Promotion history (1 for EMP-0001) ----
      if (code === "EMP-0001") {
        await db.employeePromotionHistory.create({
          data: {
            tenantId, employeeId: empId,
            oldDesignation: "Software Engineer", newDesignation: "Senior Software Engineer",
            oldGrade: "L4 — Mid", newGrade: "L5 — Senior",
            oldCtc: Math.round(ctc * 0.9), newCtc: ctc,
            effectiveDate: new Date(doj.getTime() + 365 * 24 * 3600 * 1000),
            reason: "Annual appraisal + promotion",
            status: "Approved", approvedBy: "Ananya Iyer",
          },
        })
        bump("promotions")
      }

      // ---- Probation record (1 for EMP-0011 if they're marked On Probation) ----
      // For first 3, mark EMP-0002 as On Probation at start (then confirmed)
      if (code === "EMP-0002") {
        await db.employeeProbation.create({
          data: {
            tenantId, employeeId: empId,
            startDate: doj,
            endDate: new Date(doj.getTime() + 90 * 24 * 3600 * 1000),
            reviewDueDate: new Date(doj.getTime() + 80 * 24 * 3600 * 1000),
            status: "Confirmed",
            managerFeedback: "Excellent problem-solving and team collaboration.",
            hrFeedback: "Met all KPIs. Confirmed on schedule.",
            confirmedDate: new Date(doj.getTime() + 90 * 24 * 3600 * 1000),
            confirmedBy: "Ananya Iyer",
          },
        })
        bump("probation")
      }

      // ---- Exit record for EMP-0008 (NOT in first 3, but seeded separately) ----
      // Done outside this loop below.

      // ---- Login access (1 each) ----
      await db.employeeLoginAccess.create({
        data: {
          tenantId, employeeId: empId,
          username: e.officialEmail?.split("@")[0] || e.first.toLowerCase(),
          email: e.officialEmail,
          status: "Active",
          role: code === "EMP-0003" ? "HR admin" : "Employee",
          twoFactorEnabled: false,
          forcePasswordChange: false,
          passwordResetAt: doj,
          lastLoginAt: daysAgo(1),
          lastLoginIp: "10.0.0." + (10 + idx),
          activeSessions: 1,
        },
      })
      bump("loginAccess")

      // ---- Role mappings (1-2 each) ----
      await db.employeeRoleMapping.create({
        data: {
          tenantId, employeeId: empId,
          role: code === "EMP-0003" ? "HR admin" : "Employee",
          scopeType: "Global",
          assignedBy: "Ananya Iyer",
          isActive: true,
        },
      })
      bump("roles")
      if (code === "EMP-0001") {
        await db.employeeRoleMapping.create({
          data: {
            tenantId, employeeId: empId,
            role: "Manager", scopeType: "Department", scopeRef: depts["DEPT-ENG"].id,
            assignedBy: "Ananya Iyer", isActive: true,
          },
        })
        bump("roles")
      }

      // ---- Custom field values (3-4 each) ----
      const cfv: Array<{ key: string; label: string; value: string; category: string }> = [
        { key: "tshirtSize", label: "T-Shirt Size", value: e.gender === "Male" ? "L" : "M", category: "Uniform" },
        { key: "foodPreference", label: "Food Preference", value: "Veg", category: "General" },
        { key: "transportRoute", label: "Transport Route", value: e.currentCity === "Mumbai" ? "Route 12 - Andheri" : e.currentCity === "Bangalore" ? "Route 5 - Bellandur" : "Route 2 - CP", category: "Accommodation" },
        { key: "uniformSize", label: "Uniform Size", value: e.gender === "Male" ? "40" : "36", category: "Uniform" },
      ]
      for (const c of cfv) {
        await db.employeeCustomFieldValue.create({
          data: { tenantId, employeeId: empId, fieldKey: c.key, fieldLabel: c.label, fieldType: "select", value: c.value, category: c.category, isMandatory: false, approvalRequired: false },
        })
        bump("customFields")
      }

      // ---- Form submissions (1-2 each) ----
      await db.employeeFormSubmission.create({
        data: {
          tenantId, employeeId: empId,
          formCode: "joining", formName: "Joining Form", version: 1,
          data: JSON.stringify({ personalEmail: e.personalEmail, mobile: e.mobile, emergencyName: e.emergencyName, emergencyPhone: e.emergencyPhone }),
          status: "Submitted", submittedAt: new Date(doj.getTime() + 1 * 24 * 3600 * 1000),
          approvedAt: new Date(doj.getTime() + 2 * 24 * 3600 * 1000), approvedBy: "Ananya Iyer",
        },
      })
      bump("forms")
      await db.employeeFormSubmission.create({
        data: {
          tenantId, employeeId: empId,
          formCode: "policy_declaration", formName: "Policy Declaration", version: 1,
          data: JSON.stringify({ acceptedCodeOfConduct: true, acceptedItPolicy: true, acceptedRemoteWorkPolicy: true }),
          status: "Approved", submittedAt: new Date(doj.getTime() + 3 * 24 * 3600 * 1000),
          approvedAt: new Date(doj.getTime() + 5 * 24 * 3600 * 1000), approvedBy: "Ananya Iyer",
        },
      })
      bump("forms")

      // ---- Skills (3-4 each) ----
      const skills: Array<{ name: string; cat: string; prof: string; yrs: number }> = [
        { name: "TypeScript", cat: "Technical", prof: "Expert", yrs: 5 },
        { name: "React", cat: "Technical", prof: "Advanced", yrs: 4 },
        { name: "Node.js", cat: "Technical", prof: "Advanced", yrs: 4 },
        { name: "Communication", cat: "Soft", prof: "Advanced", yrs: 6 },
      ]
      if (code === "EMP-0003") {
        skills.length = 0
        skills.push(
          { name: "Recruitment", cat: "Domain", prof: "Advanced", yrs: 4 },
          { name: "HR Compliance", cat: "Domain", prof: "Expert", yrs: 4 },
          { name: "Excel", cat: "Tool", prof: "Advanced", yrs: 6 },
          { name: "Onboarding", cat: "Domain", prof: "Expert", yrs: 4 },
        )
      }
      for (const s of skills) {
        await db.employeeSkill.create({
          data: {
            tenantId, employeeId: empId,
            name: s.name, category: s.cat, proficiency: s.prof,
            yearsOfExperience: s.yrs, verifiedByManager: true,
            lastUsedDate: daysAgo(7),
          },
        })
        bump("skills")
      }

      // ---- Certifications (1-2 each, one with expiry 60 days from now) ----
      await db.employeeCertification.create({
        data: {
          tenantId, employeeId: empId,
          name: "AWS Certified Developer - Associate",
          issuingAuthority: "Amazon Web Services",
          issueDate: yearsAgo(1, 10),
          expiryDate: daysFromNow(60),
          certificateId: "AWS-DEV-" + code.replace("EMP-", "0"),
          certificateUrl: "/docs/aws-cert.pdf",
        },
      })
      bump("certifications")
      if (code !== "EMP-0003") {
        await db.employeeCertification.create({
          data: {
            tenantId, employeeId: empId,
            name: "Scrum Master (PSM I)",
            issuingAuthority: "Scrum.org",
            issueDate: yearsAgo(2, 4),
            expiryDate: null,
            certificateId: "PSM-" + code.replace("EMP-", "0"),
            certificateUrl: "/docs/psm.pdf",
          },
        })
        bump("certifications")
      }

      // ---- Training (1-2 each: one Completed, one In Progress) ----
      await db.employeeTraining.create({
        data: {
          tenantId, employeeId: empId,
          courseName: "Information Security Awareness",
          trainingType: "Online",
          startDate: new Date(doj.getTime() + 5 * 24 * 3600 * 1000),
          endDate: new Date(doj.getTime() + 12 * 24 * 3600 * 1000),
          status: "Completed", score: 92,
          certificateUrl: "/docs/security-cert.pdf",
          trainerFeedback: "Good understanding of security best practices.",
        },
      })
      bump("training")
      await db.employeeTraining.create({
        data: {
          tenantId, employeeId: empId,
          courseName: "Leadership Excellence Program",
          trainingType: "Classroom",
          startDate: daysAgo(30),
          endDate: null,
          status: "In Progress",
        },
      })
      bump("training")

      // ---- Performance goals (1-2 each) ----
      await db.employeePerformanceGoal.create({
        data: {
          tenantId, employeeId: empId,
          title: "Deliver Q3 product roadmap",
          description: "Lead the engineering team to ship the new analytics module by end of Q3.",
          kra: "Engineering Delivery", kpi: "On-time delivery rate",
          targetValue: "100%", achievedValue: "80%", progress: 80, weightage: 40,
          cycle: "FY" + new Date().getFullYear() + "-H2",
          status: "Manager reviewed",
          startDate: monthsAgo(3), endDate: monthsFromNow(3),
        },
      })
      bump("goals")
      if (code !== "EMP-0003") {
        await db.employeePerformanceGoal.create({
          data: {
            tenantId, employeeId: empId,
            title: "Mentor 2 junior engineers",
            description: "Pair-program with new hires and conduct weekly 1:1s.",
            kra: "Team Development", kpi: "Mentee satisfaction score",
            targetValue: "4.5/5", achievedValue: "4.2/5", progress: 75, weightage: 20,
            cycle: "FY" + new Date().getFullYear() + "-H2",
            status: "Submitted",
            startDate: monthsAgo(3), endDate: monthsFromNow(3),
          },
        })
        bump("goals")
      }

      // ---- Performance review (1 each) ----
      await db.employeePerformanceReview.create({
        data: {
          tenantId, employeeId: empId,
          cycle: "FY" + (new Date().getFullYear() - 1),
          type: "Final",
          reviewerName: "Aarav Sharma",
          rating: 4.2,
          comments: "Strong performer. Delivered key projects on time. Ready for next-level responsibility.",
          promotionRecommended: code === "EMP-0001",
          incrementRecommended: 12,
          status: "Finalized",
          reviewDate: monthsAgo(2),
          finalizedAt: monthsAgo(1),
        },
      })
      bump("reviews")

      // ---- Expenses (1-2 each) ----
      await db.employeeExpense.create({
        data: {
          tenantId, employeeId: empId,
          category: "Travel", amount: 12500, currency: "INR",
          expenseDate: daysAgo(20),
          description: "Client visit travel — Bangalore to Mumbai",
          billUrl: "/bills/travel-1.pdf", project: "Phoenix", client: "Acme Corp",
          status: "Paid", paymentStatus: "Paid",
          approvedBy: "Aarav Sharma", approvedAt: daysAgo(18), paidAt: daysAgo(10),
        },
      })
      bump("expenses")
      await db.employeeExpense.create({
        data: {
          tenantId, employeeId: empId,
          category: "Food", amount: 850, currency: "INR",
          expenseDate: daysAgo(5),
          description: "Team lunch with client",
          billUrl: "/bills/food-1.pdf",
          status: "Submitted",
        },
      })
      bump("expenses")

      // ---- Helpdesk tickets (1-2 each) ----
      await db.employeeHelpdeskTicket.create({
        data: {
          tenantId, employeeId: empId,
          ticketCode: `TKT-${String((idx * 2) + 1).padStart(4, "0")}`,
          subject: "Laptop running slow",
          category: "IT", priority: "Medium",
          status: "Resolved",
          description: "My laptop is taking a long time to boot and applications are sluggish.",
          assignedTo: "IT Helpdesk",
          slaHours: 24, slaStatus: "Within SLA",
          resolution: "Replaced HDD with SSD. Performance restored.",
          resolvedAt: daysAgo(10),
          feedback: "Quick resolution, thanks!", rating: 5,
        },
      })
      bump("tickets")
      await db.employeeHelpdeskTicket.create({
        data: {
          tenantId, employeeId: empId,
          ticketCode: `TKT-${String((idx * 2) + 2).padStart(4, "0")}`,
          subject: "Salary slip not generated",
          category: "Payroll", priority: "High",
          status: "Open",
          description: "Last month's salary slip is not showing in the portal.",
          assignedTo: "Payroll Team",
          slaHours: 48, slaStatus: "Within SLA",
        },
      })
      bump("tickets")

      // ---- Letters (1-2 each) ----
      await db.employeeLetter.create({
        data: {
          tenantId, employeeId: empId,
          letterType: "Appointment",
          letterCode: `LTR-${String((idx * 2) + 1).padStart(4, "0")}`,
          issuedDate: doj,
          subject: "Letter of Appointment",
          body: `Dear ${e.first}, we are pleased to confirm your appointment as ${e.desig} at ACME Corporation.`,
          status: "Issued",
          issuedBy: "Ananya Iyer",
          version: 1,
        },
      })
      bump("letters")
      if (monthsAgo(0).getTime() - doj.getTime() > 90 * 24 * 3600 * 1000) {
        await db.employeeLetter.create({
          data: {
            tenantId, employeeId: empId,
            letterType: "Confirmation",
            letterCode: `LTR-${String((idx * 2) + 2).padStart(4, "0")}`,
            issuedDate: new Date(doj.getTime() + 95 * 24 * 3600 * 1000),
            subject: "Letter of Confirmation",
            body: `Dear ${e.first}, we are pleased to confirm your successful completion of probation.`,
            status: "Issued",
            issuedBy: "Ananya Iyer",
            version: 1,
          },
        })
        bump("letters")
      }

      // ---- Requests (1-2 each) ----
      await db.employeeRequest.create({
        data: {
          tenantId, employeeId: empId,
          requestType: "WFH",
          title: "Work from home — 2 days",
          description: "Requesting WFH for next Monday and Tuesday due to personal reasons.",
          payload: JSON.stringify({ dates: [daysFromNow(3), daysFromNow(4)] }),
          status: "Approved",
          pendingWith: "Aarav Sharma",
          submittedAt: daysAgo(7),
          decidedAt: daysAgo(5),
          decidedBy: "Aarav Sharma",
          remarks: "Approved. Please be available on Slack.",
        },
      })
      bump("requests")
      await db.employeeRequest.create({
        data: {
          tenantId, employeeId: empId,
          requestType: "Document update",
          title: "Update personal email",
          description: "I would like to update my personal email address.",
          payload: JSON.stringify({ field: "personalEmail", oldValue: e.personalEmail, newValue: e.first.toLowerCase() + ".new@gmail.com" }),
          status: "Pending",
          pendingWith: "Ananya Iyer",
          submittedAt: daysAgo(2),
        },
      })
      bump("requests")
    } // end of per-employee sub-record loop

    // ---- Exit record for EMP-0008 (Kabir Singh, On Notice) ----
    {
      const empId = empByCode["EMP-0008"].id
      await db.employeeExit.create({
        data: {
          tenantId, employeeId: empId,
          resignationDate: daysAgo(15),
          lastWorkingDate: daysFromNow(45),
          reason: "Better opportunity abroad",
          status: "Manager approved",
          noticePeriodDays: 60,
          noticeRecoveryDays: 0,
          clearanceHR: false, clearanceIT: false, clearanceAdmin: false,
          clearanceFinance: false, clearanceManager: true, clearancePayroll: false,
          approvedBy: "Aarav Sharma",
          approvedAt: daysAgo(7),
        },
      })
      subCounts.exits = 1
      // Status history for EMP-0008
      await db.employeeStatusHistory.create({
        data: {
          tenantId, employeeId: empId, oldStatus: "Active", newStatus: "On Notice",
          effectiveDate: daysAgo(15), reason: "Resignation submitted",
          changedBy: "Ananya Iyer",
        },
      })
      subCounts.statusHistory = (subCounts.statusHistory || 0) + 1
      // Timeline event
      await db.employeeTimelineEvent.create({
        data: {
          tenantId, employeeId: empId, eventType: "Resignation submitted",
          title: "Resignation submitted",
          description: "Better opportunity abroad",
          eventDate: daysAgo(15), actorName: "Kabir Singh",
        },
      })
      subCounts.timeline = (subCounts.timeline || 0) + 1
    }

    // Add subCounts to counts
    for (const [k, v] of Object.entries(subCounts)) {
      counts[`emp_${k}`] = v
    }

    // ============================================================
    // PHASE 3 — PAYROLL SEED DATA
    // ============================================================
    // Create salary structures
    const stdStructure = await db.salaryStructure.create({
      data: {
        tenantId,
        code: "SS-STD", name: "Standard Salary Structure",
        description: "Standard CTC structure with 50% basic, 20% HRA, PF, and standard deductions",
        basicPercent: 50, hraPercent: 20, specialAllowancePercent: 20,
        conveyanceAllowance: 1600, medicalAllowance: 1250, bonusAmount: 0,
        pfEmployerPercent: 12, esiEmployerPercent: 3.25,
        pfEmployeePercent: 12, esiEmployeePercent: 0.75,
        professionalTax: 200, tdsPercent: 5, status: "Active",
      },
    })
    counts.salaryStructures = 1

    const execStructure = await db.salaryStructure.create({
      data: {
        tenantId,
        code: "SS-EXEC", name: "Executive Salary Structure",
        description: "Higher CTC structure for senior employees with lower PF (restrict to 15k basic)",
        basicPercent: 40, hraPercent: 25, specialAllowancePercent: 30,
        conveyanceAllowance: 1600, medicalAllowance: 1250, bonusAmount: 50000,
        pfEmployerPercent: 12, esiEmployerPercent: 0,
        pfEmployeePercent: 12, esiEmployeePercent: 0,
        professionalTax: 200, tdsPercent: 15, status: "Active",
      },
    })
    counts.salaryStructures = 2

    // Helper to compute salary (mirror of API)
    const computeSalary = (ctc: number, s: any) => {
      const basic = Math.round((ctc * s.basicPercent) / 100 / 12)
      const hra = Math.round((ctc * s.hraPercent) / 100 / 12)
      const conveyance = s.conveyanceAllowance
      const medical = s.medicalAllowance
      const bonus = s.bonusAmount || 0
      const grossMonthly = basic + hra + conveyance + medical + bonus
      const pfEmployer = Math.round((basic * s.pfEmployerPercent) / 100)
      const esiEmployer = s.esiEmployerPercent > 0 && ctc <= 210000 ? Math.round((grossMonthly * s.esiEmployerPercent) / 100) : 0
      const specialAnnual = Math.max(0, ctc - (basic + hra + conveyance + medical + bonus) * 12 - pfEmployer * 12 - esiEmployer * 12)
      const specialAllowance = Math.round(specialAnnual / 12)
      const pfEmployee = Math.round((basic * s.pfEmployeePercent) / 100)
      const esiEmployee = s.esiEmployeePercent > 0 && ctc <= 210000 ? Math.round((grossMonthly * s.esiEmployeePercent) / 100) : 0
      const professionalTax = s.professionalTax
      const tdsAmount = Math.round((ctc * s.tdsPercent) / 100 / 12)
      const grossSalary = basic + hra + specialAllowance + conveyance + medical + bonus
      const totalDeductions = pfEmployee + esiEmployee + professionalTax + tdsAmount
      const netSalary = grossSalary - totalDeductions
      const totalEmployerContribution = pfEmployer + esiEmployer
      return { basic, hra, specialAllowance, conveyanceAllowance: conveyance, medicalAllowance: medical, bonusAmount: bonus, pfEmployee, pfEmployer, esiEmployee, esiEmployer, professionalTax, tdsAmount, grossSalary, netSalary, totalEmployerContribution }
    }

    // Assign salary to first 8 active employees (mix of structures)
    const activeEmps = Object.values(empByCode).filter((e: any) => e.employeeStatus === "Active").slice(0, 8)
    let assignmentCount = 0
    for (let i = 0; i < activeEmps.length; i++) {
      const emp = activeEmps[i] as any
      const isExec = i < 2 // first 2 are executives
      const structure = isExec ? execStructure : stdStructure
      const ctc = isExec ? 2400000 + i * 100000 : 800000 + i * 120000
      const comp = computeSalary(ctc, structure)
      const effectiveDate = emp.dateOfJoining || daysAgo(180)
      await db.salaryAssignment.create({
        data: {
          tenantId, employeeId: emp.id, salaryStructureId: structure.id, ctc,
          ...comp, effectiveDate, isActive: true,
        },
      })
      assignmentCount++
      // Update employee compensation fields
      await db.employee.update({
        where: { id: emp.id },
        data: {
          ctc, basicSalary: comp.basic, hra: comp.hra,
          specialAllowance: comp.specialAllowance, conveyanceAllowance: comp.conveyanceAllowance,
          medicalAllowance: comp.medicalAllowance, bonusAmount: comp.bonusAmount,
          pfEmployee: comp.pfEmployee, pfEmployer: comp.pfEmployer,
          esiAmount: comp.esiEmployee + comp.esiEmployer,
          professionalTax: comp.professionalTax, tdsAmount: comp.tdsAmount,
          grossSalary: comp.grossSalary, netSalary: comp.netSalary,
        },
      })
    }
    counts.salaryAssignments = assignmentCount

    // Create a completed payroll run for previous month
    const prevMonth = new Date()
    prevMonth.setMonth(prevMonth.getMonth() - 1)
    const prevYear = prevMonth.getFullYear()
    const prevMonthNum = prevMonth.getMonth() + 1
    const prevPeriod = `${prevYear}-${String(prevMonthNum).padStart(2, "0")}`
    const prevPeriodStart = new Date(prevYear, prevMonthNum - 1, 1, 12, 0, 0, 0)
    const prevPeriodEnd = new Date(prevYear, prevMonthNum, 0, 12, 0, 0, 0)
    const prevPayDate = new Date(prevYear, prevMonthNum, 5, 12, 0, 0, 0)

    const payrollRun = await db.payrollRun.create({
      data: {
        tenantId,
        code: `PR-${prevPeriod}`,
        name: `${prevMonth.toLocaleDateString("en-IN", { month: "long" })} ${prevYear} Payroll`,
        payPeriod: prevPeriod,
        payPeriodStart: prevPeriodStart,
        payPeriodEnd: prevPeriodEnd,
        payDate: prevPayDate,
        status: "Paid",
        processedAt: daysAgo(20),
        approvedAt: daysAgo(18),
        approvedBy: "HR Admin",
        paidAt: daysAgo(15),
      },
    })

    // Generate payslips for this run
    const assignments = await db.salaryAssignment.findMany({
      where: { tenantId, isActive: true },
      include: { employee: true },
    })
    let totalGross = 0, totalNet = 0, totalDeductions = 0, totalEmployer = 0, payslipCount = 0
    for (const a of assignments) {
      if (a.employee.employeeStatus !== "Active") continue
      const lopDays = 0
      const workingDays = 30
      const daysPaid = workingDays - lopDays
      const lopFactor = daysPaid / workingDays
      const basic = Math.round(a.basic * lopFactor)
      const hra = Math.round(a.hra * lopFactor)
      const specialAllowance = Math.round(a.specialAllowance * lopFactor)
      const conveyanceAllowance = a.conveyanceAllowance
      const medicalAllowance = a.medicalAllowance
      const bonusAmount = a.bonusAmount
      const grossEarnings = basic + hra + specialAllowance + conveyanceAllowance + medicalAllowance + bonusAmount
      const pfEmployee = Math.round(a.pfEmployee * lopFactor)
      const esiEmployee = Math.round(a.esiEmployee * lopFactor)
      const professionalTax = a.professionalTax
      const tdsAmount = Math.round(a.tdsAmount * lopFactor)
      const totalDed = pfEmployee + esiEmployee + professionalTax + tdsAmount
      const netSalary = grossEarnings - totalDed
      const pfEmployer = Math.round(a.pfEmployer * lopFactor)
      const esiEmployer = Math.round(a.esiEmployer * lopFactor)
      const totalEmployerContribution = pfEmployer + esiEmployer

      await db.payslip.create({
        data: {
          tenantId, employeeId: a.employeeId, payrollRunId: payrollRun.id,
          payPeriod: prevPeriod, payPeriodStart: prevPeriodStart, payPeriodEnd: prevPeriodEnd, payDate: prevPayDate,
          basic, hra, specialAllowance, conveyanceAllowance, medicalAllowance, bonusAmount, grossEarnings,
          pfEmployee, esiEmployee, professionalTax, tdsAmount, totalDeductions: totalDed,
          netSalary, pfEmployer, esiEmployer, totalEmployerContribution, ctc: a.ctc,
          workingDays, daysPaid, lopDays,
          status: "Paid", generatedAt: daysAgo(20), paidAt: daysAgo(15),
        },
      })
      totalGross += grossEarnings
      totalNet += netSalary
      totalDeductions += totalDed
      totalEmployer += totalEmployerContribution
      payslipCount++
    }

    await db.payrollRun.update({
      where: { id: payrollRun.id },
      data: {
        totalGross, totalNet, totalDeductions, totalEmployerContribution: totalEmployer,
        employeeCount: payslipCount,
      },
    })
    counts.payrollRuns = 1
    counts.payslips = payslipCount

    return ok({ ok: true, counts })
  } catch (err: any) {
    console.error("[seed] error:", err)
    return bad("Seed failed: " + (err?.message || String(err)), 500)
  }
}
