"use client"

// ============================================================================
//  Offboarding — seed data (in-memory)
// ----------------------------------------------------------------------------
//  Single source of truth for all offboarding section components.
//  This mimics what the Prisma database would return, so sections can be
//  built against realistic data without a schema migration.
// ============================================================================

import {
  ExitCase, ExitWorkflow, DEFAULT_EXIT_STAGES, ClearanceTask, AssetRecoveryItem,
  ITAccessItem, FnFRecord, FnFEntry, ExitDocumentTemplate, ExitEmailTemplate,
  ExitChecklist, ExitInterviewForm, AlumniRecord, ResignationRequest,
  OffboardingLog, OffboardingSettings, EntityConfiguration, WorkflowStep,
} from "./shared"

const now = new Date()
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString()
const daysAhead = (n: number) => new Date(now.getTime() + n * 86400000).toISOString()
const dateStr = (n: number) => daysAgo(n).slice(0, 10)

// ---------- Workflows ----------
export const EXIT_WORKFLOWS: ExitWorkflow[] = [
  {
    id: "wf-1",
    name: "Standard Exit Workflow",
    code: "STD_EXIT",
    description: "Default exit workflow for full-time employees — covers resignation, notice, clearance, asset recovery, IT revocation, FnF, and letters.",
    version: 2,
    status: "Published",
    scopeType: "Tenant Default",
    kanbanBoardId: "board-1",
    kanbanBoardName: "Default Exit Kanban",
    clearanceChecklistId: "cl-1",
    emailGroupId: "eg-1",
    fnfRuleId: "fnf-1",
    isDefault: true,
    priority: 1,
    stages: DEFAULT_EXIT_STAGES,
    steps: [
      { id: "ws1", title: "Basic Details", description: "Workflow name, code, scope, version", icon: "FileText", status: "complete" },
      { id: "ws2", title: "Applicability", description: "Tenant / Entity / Dept / Employee type", icon: "Filter", status: "complete" },
      { id: "ws3", title: "Kanban Board", description: "Default Exit Kanban with 14 stages", icon: "KanbanSquare", status: "complete" },
      { id: "ws4", title: "Exit Request Rules", description: "Allow resignation, withdrawal, LWD change", icon: "FileEdit", status: "complete" },
      { id: "ws5", title: "Clearance & Checklists", description: "9 departments, mandatory + blocking tasks", icon: "ClipboardCheck", status: "complete" },
      { id: "ws6", title: "Asset Recovery Rules", description: "Auto-fetch assets, damage recovery", icon: "Package", status: "complete" },
      { id: "ws7", title: "IT Revocation Rules", description: "Revoke on LWD EOD, data backup", icon: "Lock", status: "complete" },
      { id: "ws8", title: "Exit Interview Rules", description: "HR exit interview, mandatory", icon: "MessageSquare", status: "complete" },
      { id: "ws9", title: "FnF Rules", description: "Auto-fetch payroll, leave, loans", icon: "Wallet", status: "complete" },
      { id: "ws10", title: "Document / Letter Rules", description: "Relieving + Experience + No Dues", icon: "FileText", status: "complete" },
      { id: "ws11", title: "Approval Rules", description: "Manager + HR + FnF approval", icon: "ShieldCheck", status: "complete" },
      { id: "ws12", title: "Email Rules", description: "24 event-based email templates", icon: "Mail", status: "complete" },
      { id: "ws13", title: "Employee Status / Alumni", description: "Mark exited, create alumni profile", icon: "Users", status: "complete" },
      { id: "ws14", title: "Review & Publish", description: "Final review and publish", icon: "CheckCircle2", status: "complete" },
    ],
    createdAt: daysAgo(120),
    updatedAt: daysAgo(15),
  },
  {
    id: "wf-2",
    name: "India Full-Time Exit Workflow",
    code: "INDIA_FT_EXIT",
    description: "India-specific exit workflow with FnF, gratuity, notice period recovery, and statutory deductions.",
    version: 1,
    status: "Published",
    scopeType: "Entity",
    entity: "ACME India Pvt Ltd",
    kanbanBoardId: "board-2",
    kanbanBoardName: "India Exit Kanban",
    clearanceChecklistId: "cl-2",
    emailGroupId: "eg-2",
    fnfRuleId: "fnf-2",
    isDefault: false,
    priority: 2,
    stages: DEFAULT_EXIT_STAGES,
    steps: [
      { id: "ws1", title: "Basic Details", description: "India FT exit workflow", icon: "FileText", status: "complete" },
      { id: "ws2", title: "Applicability", description: "ACME India, Full-Time", icon: "Filter", status: "complete" },
      { id: "ws3", title: "Kanban Board", description: "India Exit Kanban", icon: "KanbanSquare", status: "complete" },
      { id: "ws4", title: "Exit Request Rules", description: "60-day notice, allow withdrawal before approval", icon: "FileEdit", status: "complete" },
      { id: "ws5", title: "Clearance & Checklists", description: "HR + IT + Admin + Finance + Payroll", icon: "ClipboardCheck", status: "complete" },
      { id: "ws6", title: "Asset Recovery Rules", description: "Laptop, ID card, access card", icon: "Package", status: "complete" },
      { id: "ws7", title: "IT Revocation Rules", description: "Revoke on LWD EOD", icon: "Lock", status: "complete" },
      { id: "ws8", title: "Exit Interview Rules", description: "Mandatory HR exit interview", icon: "MessageSquare", status: "complete" },
      { id: "ws9", title: "FnF Rules", description: "Gratuity, PF, leave encashment", icon: "Wallet", status: "complete" },
      { id: "ws10", title: "Document / Letter Rules", description: "Relieving + Experience + FnF letter", icon: "FileText", status: "complete" },
      { id: "ws11", title: "Approval Rules", description: "Manager + HR + FnF approval", icon: "ShieldCheck", status: "complete" },
      { id: "ws12", title: "Email Rules", description: "India exit email group", icon: "Mail", status: "complete" },
      { id: "ws13", title: "Employee Status / Alumni", description: "Alumni profile, eligible for rehire", icon: "Users", status: "complete" },
      { id: "ws14", title: "Review & Publish", description: "Published v1", icon: "CheckCircle2", status: "complete" },
    ],
    createdAt: daysAgo(90),
    updatedAt: daysAgo(10),
  },
  {
    id: "wf-3",
    name: "UAE Exit Workflow",
    code: "UAE_EXIT",
    description: "UAE-specific exit workflow with visa cancellation, passport clearance, and end-of-service gratuity.",
    version: 1,
    status: "Published",
    scopeType: "Entity",
    entity: "ACME UAE FZ-LLC",
    kanbanBoardId: "board-3",
    kanbanBoardName: "UAE Exit Kanban",
    clearanceChecklistId: "cl-3",
    emailGroupId: "eg-3",
    fnfRuleId: "fnf-3",
    isDefault: false,
    priority: 3,
    stages: DEFAULT_EXIT_STAGES,
    steps: [
      { id: "ws1", title: "Basic Details", description: "UAE exit workflow", icon: "FileText", status: "complete" },
      { id: "ws2", title: "Applicability", description: "ACME UAE", icon: "Filter", status: "complete" },
      { id: "ws3", title: "Kanban Board", description: "UAE Exit Kanban", icon: "KanbanSquare", status: "complete" },
      { id: "ws4", title: "Exit Request Rules", description: "30-day notice", icon: "FileEdit", status: "complete" },
      { id: "ws5", title: "Clearance & Checklists", description: "Passport, visa, admin, payroll", icon: "ClipboardCheck", status: "complete" },
      { id: "ws6", title: "Asset Recovery Rules", description: "Laptop, SIM, accommodation", icon: "Package", status: "complete" },
      { id: "ws7", title: "IT Revocation Rules", description: "Revoke immediately for high-risk", icon: "Lock", status: "complete" },
      { id: "ws8", title: "Exit Interview Rules", description: "Optional", icon: "MessageSquare", status: "complete" },
      { id: "ws9", title: "FnF Rules", description: "EOS gratuity, leave encashment", icon: "Wallet", status: "complete" },
      { id: "ws10", title: "Document / Letter Rules", description: "Service letter, contract closure", icon: "FileText", status: "complete" },
      { id: "ws11", title: "Approval Rules", description: "HR + FnF approval", icon: "ShieldCheck", status: "complete" },
      { id: "ws12", title: "Email Rules", description: "UAE exit emails", icon: "Mail", status: "complete" },
      { id: "ws13", title: "Employee Status / Alumni", description: "Alumni, visa cancelled", icon: "Users", status: "complete" },
      { id: "ws14", title: "Review & Publish", description: "Published v1", icon: "CheckCircle2", status: "complete" },
    ],
    createdAt: daysAgo(60),
    updatedAt: daysAgo(7),
  },
  {
    id: "wf-4",
    name: "Termination Exit Workflow",
    code: "TERM_EXIT",
    description: "Involuntary termination workflow with immediate IT revocation, security clearance, and legal hold.",
    version: 1,
    status: "Draft",
    scopeType: "Exit Type",
    exitType: "Involuntary Termination",
    kanbanBoardId: "board-1",
    kanbanBoardName: "Default Exit Kanban",
    clearanceChecklistId: "cl-4",
    emailGroupId: "eg-1",
    fnfRuleId: "fnf-1",
    isDefault: false,
    priority: 5,
    stages: DEFAULT_EXIT_STAGES,
    steps: [
      { id: "ws1", title: "Basic Details", description: "Termination workflow", icon: "FileText", status: "complete" },
      { id: "ws2", title: "Applicability", description: "Exit Type: Involuntary Termination", icon: "Filter", status: "complete" },
      { id: "ws3", title: "Kanban Board", description: "Default Exit Kanban", icon: "KanbanSquare", status: "complete" },
      { id: "ws4", title: "Exit Request Rules", description: "HR initiated, no notice period", icon: "FileEdit", status: "complete" },
      { id: "ws5", title: "Clearance & Checklists", description: "Security + Legal + IT clearance", icon: "ClipboardCheck", status: "complete" },
      { id: "ws6", title: "Asset Recovery Rules", description: "Immediate asset recovery", icon: "Package", status: "complete" },
      { id: "ws7", title: "IT Revocation Rules", description: "Revoke immediately", icon: "Lock", status: "complete" },
      { id: "ws8", title: "Exit Interview Rules", description: "Not applicable", icon: "MessageSquare", status: "complete" },
      { id: "ws9", title: "FnF Rules", description: "FnF with notice recovery", icon: "Wallet", status: "complete" },
      { id: "ws10", title: "Document / Letter Rules", description: "Termination letter", icon: "FileText", status: "complete" },
      { id: "ws11", title: "Approval Rules", description: "Legal + HR head approval", icon: "ShieldCheck", status: "complete" },
      { id: "ws12", title: "Email Rules", description: "Termination notification", icon: "Mail", status: "incomplete" },
      { id: "ws13", title: "Employee Status / Alumni", description: "No-rehire, blacklist", icon: "Users", status: "incomplete" },
      { id: "ws14", title: "Review & Publish", description: "Draft — pending review", icon: "CheckCircle2", status: "incomplete" },
    ],
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
  },
]

// ---------- Exit Cases ----------
export const EXIT_CASES: ExitCase[] = [
  {
    id: "ec-1", exitCaseId: "EXIT-2025-001", employeeCode: "EMP-1042", employeeName: "Rahul Sharma", avatarColor: "#10b981",
    entity: "ACME India Pvt Ltd", branch: "Bangalore HQ", location: "Bangalore", department: "Engineering", designation: "Senior Software Engineer",
    grade: "L4", employmentType: "Full-time", reportingManager: "Priya Patel", hrOwner: "Anita Desai",
    exitType: "Voluntary Resignation", exitCategory: "Voluntary", exitReason: "Better Opportunity",
    resignationDate: dateStr(25), noticeStartDate: dateStr(24), requestedLwd: dateStr(-35), approvedLwd: dateStr(-35),
    workflowId: "wf-2", workflowName: "India Full-Time Exit Workflow", currentStageId: "s6",
    clearanceStatus: "In Progress", assetStatus: "Pending", itAccessStatus: "Pending", fnfStatus: "Not Started",
    letterStatus: "Not Started", exitStatus: "Active", riskFlag: "low", legalHold: false, regrettable: true,
    eligibleRehire: true, confidential: false, noticeShortfallDays: 0, enteredStageAt: daysAgo(3), createdAt: daysAgo(25), updatedAt: daysAgo(1),
  },
  {
    id: "ec-2", exitCaseId: "EXIT-2025-002", employeeCode: "EMP-1087", employeeName: "Sneha Reddy", avatarColor: "#0ea5e9",
    entity: "ACME India Pvt Ltd", branch: "Hyderabad", location: "Hyderabad", department: "Product", designation: "Product Manager",
    grade: "L5", employmentType: "Full-time", reportingManager: "Vikram Singh", hrOwner: "Anita Desai",
    exitType: "Voluntary Resignation", exitCategory: "Voluntary", exitReason: "Career Growth",
    resignationDate: dateStr(15), noticeStartDate: dateStr(14), requestedLwd: dateStr(-45), approvedLwd: dateStr(-45),
    workflowId: "wf-2", workflowName: "India Full-Time Exit Workflow", currentStageId: "s4",
    clearanceStatus: "Not Started", assetStatus: "Not Started", itAccessStatus: "Not Started", fnfStatus: "Not Started",
    letterStatus: "Not Started", exitStatus: "Active", riskFlag: "medium", legalHold: false, regrettable: true,
    eligibleRehire: true, confidential: false, noticeShortfallDays: 15, enteredStageAt: daysAgo(1), createdAt: daysAgo(15), updatedAt: daysAgo(1),
  },
  {
    id: "ec-3", exitCaseId: "EXIT-2025-003", employeeCode: "EMP-1120", employeeName: "Arjun Mehta", avatarColor: "#8b5cf6",
    entity: "ACME UAE FZ-LLC", branch: "Dubai", location: "Dubai", department: "Sales", designation: "Sales Director",
    grade: "L6", employmentType: "Full-time", reportingManager: "Mohammed Al Farsi", hrOwner: "Fatima Hassan",
    exitType: "End of Contract", exitCategory: "Contract End", exitReason: "End of Contract Term",
    resignationDate: dateStr(10), noticeStartDate: dateStr(9), requestedLwd: dateStr(-20), approvedLwd: dateStr(-20),
    workflowId: "wf-3", workflowName: "UAE Exit Workflow", currentStageId: "s5",
    clearanceStatus: "Not Started", assetStatus: "Not Started", itAccessStatus: "Not Started", fnfStatus: "Not Started",
    letterStatus: "Not Started", exitStatus: "Active", riskFlag: "low", legalHold: false, regrettable: false,
    eligibleRehire: true, confidential: false, noticeShortfallDays: 0, enteredStageAt: daysAgo(5), createdAt: daysAgo(10), updatedAt: daysAgo(2),
  },
  {
    id: "ec-4", exitCaseId: "EXIT-2025-004", employeeCode: "EMP-0987", employeeName: "Kavya Nair", avatarColor: "#f59e0b",
    entity: "ACME India Pvt Ltd", branch: "Bangalore HQ", location: "Bangalore", department: "Finance", designation: "Finance Analyst",
    grade: "L3", employmentType: "Full-time", reportingManager: "Rajesh Kumar", hrOwner: "Anita Desai",
    exitType: "Voluntary Resignation", exitCategory: "Voluntary", exitReason: "Compensation",
    resignationDate: dateStr(45), noticeStartDate: dateStr(44), requestedLwd: dateStr(-15), approvedLwd: dateStr(-15),
    actualLwd: dateStr(-15),
    workflowId: "wf-2", workflowName: "India Full-Time Exit Workflow", currentStageId: "s10",
    clearanceStatus: "Completed", assetStatus: "Completed", itAccessStatus: "Revoked", fnfStatus: "Approved",
    letterStatus: "Generated", exitStatus: "Active", riskFlag: "low", legalHold: false, regrettable: false,
    eligibleRehire: true, confidential: false, noticeShortfallDays: 0, enteredStageAt: daysAgo(2), createdAt: daysAgo(45), updatedAt: daysAgo(1),
  },
  {
    id: "ec-5", exitCaseId: "EXIT-2025-005", employeeCode: "EMP-1156", employeeName: "Vikram Rao", avatarColor: "#ec4899",
    entity: "ACME India Pvt Ltd", branch: "Mumbai", location: "Mumbai", department: "Engineering", designation: "Tech Lead",
    grade: "L5", employmentType: "Full-time", reportingManager: "Priya Patel", hrOwner: "Anita Desai",
    exitType: "Involuntary Termination", exitCategory: "Involuntary", exitReason: "Performance",
    resignationDate: dateStr(5), noticeStartDate: dateStr(5), requestedLwd: dateStr(0), approvedLwd: dateStr(0),
    actualLwd: dateStr(0),
    workflowId: "wf-4", workflowName: "Termination Exit Workflow", currentStageId: "s11",
    clearanceStatus: "Completed", assetStatus: "Completed", itAccessStatus: "Revoked", fnfStatus: "Paid",
    letterStatus: "Issued", exitStatus: "Exited", riskFlag: "high", legalHold: true, regrettable: false,
    eligibleRehire: false, confidential: true, noticeShortfallDays: 60, enteredStageAt: daysAgo(1), createdAt: daysAgo(5), updatedAt: daysAgo(1),
  },
  {
    id: "ec-6", exitCaseId: "EXIT-2025-006", employeeCode: "EMP-1078", employeeName: "Deepak Verma", avatarColor: "#14b8a6",
    entity: "ACME India Pvt Ltd", branch: "Bangalore HQ", location: "Bangalore", department: "Engineering", designation: "Software Engineer",
    grade: "L2", employmentType: "Full-time", reportingManager: "Arjun Mehta", hrOwner: "Anita Desai",
    exitType: "Voluntary Resignation", exitCategory: "Voluntary", exitReason: "Higher Studies",
    resignationDate: dateStr(60), noticeStartDate: dateStr(59), requestedLwd: dateStr(0), approvedLwd: dateStr(0),
    actualLwd: dateStr(0),
    workflowId: "wf-2", workflowName: "India Full-Time Exit Workflow", currentStageId: "s12",
    clearanceStatus: "Completed", assetStatus: "Completed", itAccessStatus: "Revoked", fnfStatus: "Closed",
    letterStatus: "Issued", exitStatus: "Exited", riskFlag: "low", legalHold: false, regrettable: false,
    eligibleRehire: true, confidential: false, noticeShortfallDays: 0, enteredStageAt: daysAgo(3), createdAt: daysAgo(60), updatedAt: daysAgo(3),
  },
  {
    id: "ec-7", exitCaseId: "EXIT-2025-007", employeeCode: "EMP-1190", employeeName: "Pooja Iyer", avatarColor: "#f97316",
    entity: "ACME India Pvt Ltd", branch: "Pune", location: "Pune", department: "HR", designation: "HR Executive",
    grade: "L2", employmentType: "Full-time", reportingManager: "Anita Desai", hrOwner: "Anita Desai",
    exitType: "Voluntary Resignation", exitCategory: "Voluntary", exitReason: "Work Life Balance",
    resignationDate: dateStr(8), noticeStartDate: dateStr(7), requestedLwd: dateStr(-52), approvedLwd: dateStr(-52),
    workflowId: "wf-2", workflowName: "India Full-Time Exit Workflow", currentStageId: "s3",
    clearanceStatus: "Not Started", assetStatus: "Not Started", itAccessStatus: "Not Started", fnfStatus: "Not Started",
    letterStatus: "Not Started", exitStatus: "Active", riskFlag: "low", legalHold: false, regrettable: true,
    eligibleRehire: true, confidential: false, noticeShortfallDays: 0, enteredStageAt: daysAgo(2), createdAt: daysAgo(8), updatedAt: daysAgo(2),
  },
  {
    id: "ec-8", exitCaseId: "EXIT-2025-008", employeeCode: "EMP-1102", employeeName: "Rohan Gupta", avatarColor: "#84cc16",
    entity: "ACME India Pvt Ltd", branch: "Bangalore HQ", location: "Bangalore", department: "Engineering", designation: "QA Engineer",
    grade: "L3", employmentType: "Contract", reportingManager: "Priya Patel", hrOwner: "Anita Desai",
    exitType: "Absconding", exitCategory: "Absconding", exitReason: "Absconding",
    resignationDate: dateStr(20), noticeStartDate: dateStr(20), requestedLwd: dateStr(0), approvedLwd: dateStr(0),
    workflowId: "wf-1", workflowName: "Standard Exit Workflow", currentStageId: "s13",
    clearanceStatus: "Overdue", assetStatus: "Pending", itAccessStatus: "Pending", fnfStatus: "On Hold",
    letterStatus: "Not Started", exitStatus: "On Hold", riskFlag: "high", legalHold: true, regrettable: false,
    eligibleRehire: false, confidential: true, noticeShortfallDays: 60, enteredStageAt: daysAgo(10), createdAt: daysAgo(20), updatedAt: daysAgo(5),
  },
]

// ---------- Resignation Requests ----------
export const RESIGNATION_REQUESTS: ResignationRequest[] = [
  {
    id: "rr-1", requestId: "RES-2025-009", employeeCode: "EMP-1201", employeeName: "Aditya Joshi", avatarColor: "#0ea5e9",
    department: "Engineering", designation: "Senior Software Engineer", reportingManager: "Priya Patel",
    resignationDate: dateStr(2), requestedLwd: dateStr(-58), exitReason: "Better Opportunity",
    detailedReason: "Received an offer with better compensation and growth opportunities at a competitor.",
    status: "Pending Manager Approval", managerDecision: "Pending",
    noticeShortfallDays: 0, regrettable: true, createdAt: daysAgo(2), updatedAt: daysAgo(1),
  },
  {
    id: "rr-2", requestId: "RES-2025-010", employeeCode: "EMP-1198", employeeName: "Meera Krishnan", avatarColor: "#8b5cf6",
    department: "Design", designation: "UX Designer", reportingManager: "Sneha Reddy",
    resignationDate: dateStr(4), requestedLwd: dateStr(-25), exitReason: "Career Growth",
    detailedReason: "Looking for a role with more strategic design leadership.",
    status: "Pending HR Approval", managerDecision: "Approved", managerRecommendedLwd: dateStr(-25),
    managerRemarks: "Recommended approval. Meera has been a strong contributor. Suggest 30-day notice.",
    hrDecision: "Pending", noticeShortfallDays: 30, regrettable: true, createdAt: daysAgo(4), updatedAt: daysAgo(1),
  },
  {
    id: "rr-3", requestId: "RES-2025-008", employeeCode: "EMP-1185", employeeName: "Karthik Subramaniam", avatarColor: "#f59e0b",
    department: "Engineering", designation: "DevOps Engineer", reportingManager: "Priya Patel",
    resignationDate: dateStr(7), requestedLwd: dateStr(-53), exitReason: "Compensation",
    detailedReason: "Current compensation below market rate for my skills and experience.",
    status: "Approved", managerDecision: "Approved", managerRecommendedLwd: dateStr(-53),
    managerRemarks: "Tried retention but couldn't match the offer. Approved for exit.",
    hrDecision: "Approved", hrFinalLwd: dateStr(-53), hrRemarks: "Approved. Exit case EXIT-2025-006 initiated.",
    noticeShortfallDays: 0, regrettable: false, createdAt: daysAgo(7), updatedAt: daysAgo(3),
  },
  {
    id: "rr-4", requestId: "RES-2025-007", employeeCode: "EMP-1179", employeeName: "Ananya Bose", avatarColor: "#ec4899",
    department: "Marketing", designation: "Marketing Manager", reportingManager: "Vikram Singh",
    resignationDate: dateStr(12), requestedLwd: dateStr(-48), exitReason: "Relocation",
    detailedReason: "Relocating to another city due to family commitments.",
    status: "Withdrawn", managerDecision: "Approved", managerRecommendedLwd: dateStr(-48),
    managerRemarks: "Approved. Understandable reason.",
    hrDecision: "Approved", hrFinalLwd: dateStr(-48),
    noticeShortfallDays: 0, regrettable: true, createdAt: daysAgo(12), updatedAt: daysAgo(5),
  },
  {
    id: "rr-5", requestId: "RES-2025-011", employeeCode: "EMP-1210", employeeName: "Sanjay Pillai", avatarColor: "#14b8a6",
    department: "Sales", designation: "Sales Executive", reportingManager: "Arjun Mehta",
    resignationDate: dateStr(1), requestedLwd: dateStr(-59), exitReason: "Better Opportunity",
    detailedReason: "Better package and role at another company.",
    status: "Submitted", managerDecision: "Pending",
    noticeShortfallDays: 0, regrettable: false, createdAt: daysAgo(1), updatedAt: daysAgo(1),
  },
  {
    id: "rr-6", requestId: "RES-2025-006", employeeCode: "EMP-1167", employeeName: "Divya Menon", avatarColor: "#f97316",
    department: "Engineering", designation: "Software Engineer", reportingManager: "Priya Patel",
    resignationDate: dateStr(18), requestedLwd: dateStr(-42), exitReason: "Work Culture",
    detailedReason: "Concerns about team dynamics and work culture.",
    status: "Rejected", managerDecision: "Rejected", managerRemarks: "Performance concerns. Recommend exit but with full notice period.",
    hrDecision: "Rejected", hrRemarks: "Rejected withdrawal request. Exit will proceed.",
    noticeShortfallDays: 0, regrettable: false, createdAt: daysAgo(18), updatedAt: daysAgo(10),
  },
]

// ---------- Clearance Tasks ----------
export const CLEARANCE_TASKS: ClearanceTask[] = [
  // ec-1 Rahul Sharma — clearance in progress
  { id: "ct-1", exitCaseId: "ec-1", taskName: "Manager Clearance — Handover Complete", taskCode: "MGR_CLR_01", department: "Reporting Manager", ownerType: "Manager", owner: "Priya Patel", dueDate: dateStr(-33), slaDays: 3, mandatory: true, blocking: true, requiresComment: true, requiresAttachment: true, requiresApproval: true, financialImpact: false, waiverAllowed: false, stageMapping: "Clearance In Progress", status: "Completed", comment: "Handover document signed and uploaded.", completedAt: daysAgo(2), completedBy: "Priya Patel" },
  { id: "ct-2", exitCaseId: "ec-1", taskName: "HR Clearance — Exit Interview", taskCode: "HR_CLR_01", department: "HR", ownerType: "HR", owner: "Anita Desai", dueDate: dateStr(-32), slaDays: 5, mandatory: true, blocking: true, requiresComment: true, requiresAttachment: false, requiresApproval: true, financialImpact: false, waiverAllowed: false, stageMapping: "Clearance In Progress", status: "Completed", comment: "Exit interview completed. Employee cited better opportunity.", completedAt: daysAgo(1), completedBy: "Anita Desai" },
  { id: "ct-3", exitCaseId: "ec-1", taskName: "IT Clearance — Laptop & Access", taskCode: "IT_CLR_01", department: "IT", ownerType: "IT Admin", owner: "IT Team", dueDate: dateStr(-31), slaDays: 2, mandatory: true, blocking: true, requiresComment: true, requiresAttachment: true, requiresApproval: true, financialImpact: false, waiverAllowed: false, stageMapping: "Clearance In Progress", status: "In Progress", comment: "Laptop pending return. Access scheduled for LWD." },
  { id: "ct-4", exitCaseId: "ec-1", taskName: "Admin Clearance — ID & Access Card", taskCode: "ADM_CLR_01", department: "Admin / Facilities", ownerType: "Admin", owner: "Admin Team", dueDate: dateStr(-30), slaDays: 1, mandatory: true, blocking: true, requiresComment: false, requiresAttachment: true, requiresApproval: false, financialImpact: false, waiverAllowed: false, stageMapping: "Clearance In Progress", status: "Pending" },
  { id: "ct-5", exitCaseId: "ec-1", taskName: "Finance Clearance — Outstanding Dues", taskCode: "FIN_CLR_01", department: "Finance", ownerType: "Finance", owner: "Rajesh Kumar", dueDate: dateStr(-29), slaDays: 3, mandatory: true, blocking: true, requiresComment: true, requiresAttachment: false, requiresApproval: true, financialImpact: true, recoveryAmount: 0, waiverAllowed: true, stageMapping: "Clearance In Progress", status: "Pending" },
  { id: "ct-6", exitCaseId: "ec-1", taskName: "Payroll Clearance — Salary Hold", taskCode: "PAY_CLR_01", department: "Payroll", ownerType: "Payroll", owner: "Payroll Team", dueDate: dateStr(-28), slaDays: 2, mandatory: true, blocking: true, requiresComment: true, requiresAttachment: false, requiresApproval: true, financialImpact: true, recoveryAmount: 0, waiverAllowed: false, stageMapping: "Clearance In Progress", status: "Pending" },
  { id: "ct-7", exitCaseId: "ec-1", taskName: "Knowledge Transfer — Project Docs", taskCode: "KT_CLR_01", department: "Project Manager", ownerType: "Manager", owner: "Priya Patel", dueDate: dateStr(-32), slaDays: 5, mandatory: true, blocking: false, requiresComment: true, requiresAttachment: true, requiresApproval: false, financialImpact: false, waiverAllowed: true, stageMapping: "Clearance In Progress", status: "Submitted", comment: "KT docs submitted for review." },
  // ec-4 Kavya — completed clearance
  { id: "ct-8", exitCaseId: "ec-4", taskName: "Manager Clearance", taskCode: "MGR_CLR_02", department: "Reporting Manager", ownerType: "Manager", owner: "Rajesh Kumar", dueDate: dateStr(-18), slaDays: 3, mandatory: true, blocking: true, requiresComment: true, requiresAttachment: true, requiresApproval: true, financialImpact: false, waiverAllowed: false, stageMapping: "Clearance In Progress", status: "Completed", comment: "All handover complete.", completedAt: daysAgo(18), completedBy: "Rajesh Kumar" },
  { id: "ct-9", exitCaseId: "ec-4", taskName: "HR Clearance", taskCode: "HR_CLR_02", department: "HR", ownerType: "HR", owner: "Anita Desai", dueDate: dateStr(-17), slaDays: 5, mandatory: true, blocking: true, requiresComment: true, requiresAttachment: false, requiresApproval: true, financialImpact: false, waiverAllowed: false, stageMapping: "Clearance In Progress", status: "Completed", comment: "Exit interview done.", completedAt: daysAgo(17), completedBy: "Anita Desai" },
  { id: "ct-10", exitCaseId: "ec-4", taskName: "IT Clearance", taskCode: "IT_CLR_02", department: "IT", ownerType: "IT Admin", owner: "IT Team", dueDate: dateStr(-16), slaDays: 2, mandatory: true, blocking: true, requiresComment: true, requiresAttachment: true, requiresApproval: true, financialImpact: false, waiverAllowed: false, stageMapping: "Clearance In Progress", status: "Completed", comment: "Laptop returned, access revoked.", completedAt: daysAgo(16), completedBy: "IT Team" },
  { id: "ct-11", exitCaseId: "ec-4", taskName: "Finance Clearance", taskCode: "FIN_CLR_02", department: "Finance", ownerType: "Finance", owner: "Rajesh Kumar", dueDate: dateStr(-15), slaDays: 3, mandatory: true, blocking: true, requiresComment: true, requiresAttachment: false, requiresApproval: true, financialImpact: true, recoveryAmount: 0, waiverAllowed: true, stageMapping: "Clearance In Progress", status: "Completed", comment: "No outstanding dues.", completedAt: daysAgo(15), completedBy: "Rajesh Kumar" },
  // ec-8 Rohan — overdue
  { id: "ct-12", exitCaseId: "ec-8", taskName: "Manager Clearance", taskCode: "MGR_CLR_03", department: "Reporting Manager", ownerType: "Manager", owner: "Priya Patel", dueDate: dateStr(-10), slaDays: 3, mandatory: true, blocking: true, requiresComment: true, requiresAttachment: true, requiresApproval: true, financialImpact: false, waiverAllowed: false, stageMapping: "Clearance In Progress", status: "Overdue", comment: "Employee absconded. No handover." },
  { id: "ct-13", exitCaseId: "ec-8", taskName: "IT Clearance", taskCode: "IT_CLR_03", department: "IT", ownerType: "IT Admin", owner: "IT Team", dueDate: dateStr(-8), slaDays: 2, mandatory: true, blocking: true, requiresComment: true, requiresAttachment: true, requiresApproval: true, financialImpact: true, recoveryAmount: 85000, waiverAllowed: false, stageMapping: "Clearance In Progress", status: "Overdue", comment: "Laptop not returned. Recovery amount raised." },
]

// ---------- Asset Recovery ----------
export const ASSET_RECOVERY: AssetRecoveryItem[] = [
  { id: "ar-1", exitCaseId: "ec-1", assetCode: "AST-LT-0234", assetType: "Laptop", serialNumber: "MBP14-2023-0234", assignedDate: dateStr(400), expectedReturnDate: dateStr(-35), returnStatus: "Pending", damage: false, lost: false, pushToFnf: false },
  { id: "ar-2", exitCaseId: "ec-1", assetCode: "AST-ID-1042", assetType: "ID Card", assignedDate: dateStr(400), expectedReturnDate: dateStr(-35), returnStatus: "Pending", damage: false, lost: false, pushToFnf: false },
  { id: "ar-3", exitCaseId: "ec-1", assetCode: "AST-AC-1042", assetType: "Access Card", assignedDate: dateStr(400), expectedReturnDate: dateStr(-35), returnStatus: "Pending", damage: false, lost: false, pushToFnf: false },
  { id: "ar-4", exitCaseId: "ec-1", assetCode: "AST-PH-1042", assetType: "Mobile", serialNumber: "IPH14-0234", assignedDate: dateStr(300), expectedReturnDate: dateStr(-35), returnStatus: "Pending", damage: false, lost: false, pushToFnf: false },
  // ec-4 Kavya — returned
  { id: "ar-5", exitCaseId: "ec-4", assetCode: "AST-LT-0187", assetType: "Laptop", serialNumber: "MBP14-2022-0187", assignedDate: dateStr(600), expectedReturnDate: dateStr(-15), actualReturnDate: dateStr(-16), returnStatus: "Returned", conditionAtReturn: "Good", damage: false, lost: false, pushToFnf: false },
  { id: "ar-6", exitCaseId: "ec-4", assetCode: "AST-ID-0987", assetType: "ID Card", assignedDate: dateStr(600), expectedReturnDate: dateStr(-15), actualReturnDate: dateStr(-16), returnStatus: "Returned", damage: false, lost: false, pushToFnf: false },
  // ec-5 Vikram — terminated, returned
  { id: "ar-7", exitCaseId: "ec-5", assetCode: "AST-LT-0312", assetType: "Laptop", serialNumber: "MBP16-2023-0312", assignedDate: dateStr(200), expectedReturnDate: dateStr(0), actualReturnDate: dateStr(0), returnStatus: "Returned", conditionAtReturn: "Good", damage: false, lost: false, pushToFnf: false },
  { id: "ar-8", exitCaseId: "ec-5", assetCode: "AST-PH-1156", assetType: "Mobile", serialNumber: "IPH13-0312", assignedDate: dateStr(200), expectedReturnDate: dateStr(0), actualReturnDate: dateStr(0), returnStatus: "Returned", conditionAtReturn: "Damaged", damage: true, lost: false, damageAmount: 5000, recoveryAmount: 5000, pushToFnf: true },
  // ec-8 Rohan — absconded, lost
  { id: "ar-9", exitCaseId: "ec-8", assetCode: "AST-LT-0456", assetType: "Laptop", serialNumber: "MBP14-2023-0456", assignedDate: dateStr(180), expectedReturnDate: dateStr(-10), returnStatus: "Lost", damage: false, lost: true, recoveryAmount: 120000, pushToFnf: true },
  { id: "ar-10", exitCaseId: "ec-8", assetCode: "AST-ID-1102", assetType: "ID Card", assignedDate: dateStr(180), expectedReturnDate: dateStr(-10), returnStatus: "Lost", damage: false, lost: true, recoveryAmount: 200, pushToFnf: true },
]

// ---------- IT Access ----------
export const IT_ACCESS: ITAccessItem[] = [
  { id: "ia-1", exitCaseId: "ec-1", systemName: "HRMS Login", accessType: "Web App", ownerTeam: "IT", revokeTiming: "On LWD End of Day", dataBackupRequired: false, dataTransferRequired: false, licenseDeactivationRequired: false, revocationStatus: "Scheduled", remarks: "Scheduled for LWD EOD" },
  { id: "ia-2", exitCaseId: "ec-1", systemName: "Official Email", accessType: "Google Workspace", ownerTeam: "IT", revokeTiming: "On LWD End of Day", dataBackupRequired: true, dataTransferRequired: true, newOwner: "Priya Patel", licenseDeactivationRequired: true, revocationStatus: "Pending", remarks: "Data backup in progress" },
  { id: "ia-3", exitCaseId: "ec-1", systemName: "SSO / Azure AD", accessType: "Identity", ownerTeam: "IT", revokeTiming: "On LWD End of Day", dataBackupRequired: false, dataTransferRequired: false, licenseDeactivationRequired: true, revocationStatus: "Pending" },
  { id: "ia-4", exitCaseId: "ec-1", systemName: "VPN", accessType: "Network", ownerTeam: "IT", revokeTiming: "On LWD End of Day", dataBackupRequired: false, dataTransferRequired: false, licenseDeactivationRequired: false, revocationStatus: "Pending" },
  { id: "ia-5", exitCaseId: "ec-1", systemName: "GitHub", accessType: "Code Repository", ownerTeam: "IT", revokeTiming: "On LWD End of Day", dataBackupRequired: true, dataTransferRequired: true, newOwner: "Priya Patel", licenseDeactivationRequired: true, revocationStatus: "Pending" },
  { id: "ia-6", exitCaseId: "ec-1", systemName: "Slack", accessType: "Communication", ownerTeam: "IT", revokeTiming: "On LWD End of Day", dataBackupRequired: false, dataTransferRequired: false, licenseDeactivationRequired: true, revocationStatus: "Pending" },
  { id: "ia-7", exitCaseId: "ec-1", systemName: "Jira", accessType: "Project Management", ownerTeam: "IT", revokeTiming: "On LWD End of Day", dataBackupRequired: false, dataTransferRequired: true, newOwner: "Priya Patel", licenseDeactivationRequired: true, revocationStatus: "Pending" },
  // ec-5 Vikram — terminated, revoked immediately
  { id: "ia-8", exitCaseId: "ec-5", systemName: "HRMS Login", accessType: "Web App", ownerTeam: "IT", revokeTiming: "Immediately", revokeDate: dateStr(0), dataBackupRequired: false, dataTransferRequired: false, licenseDeactivationRequired: false, revocationStatus: "Revoked", verificationStatus: "Verified", remarks: "Revoked immediately on termination" },
  { id: "ia-9", exitCaseId: "ec-5", systemName: "Official Email", accessType: "Google Workspace", ownerTeam: "IT", revokeTiming: "Immediately", revokeDate: dateStr(0), dataBackupRequired: true, dataTransferRequired: true, newOwner: "Priya Patel", licenseDeactivationRequired: true, revocationStatus: "Revoked", verificationStatus: "Verified" },
  { id: "ia-10", exitCaseId: "ec-5", systemName: "GitHub", accessType: "Code Repository", ownerTeam: "IT", revokeTiming: "Immediately", revokeDate: dateStr(0), dataBackupRequired: true, dataTransferRequired: true, newOwner: "Priya Patel", licenseDeactivationRequired: true, revocationStatus: "Revoked", verificationStatus: "Verified" },
  { id: "ia-11", exitCaseId: "ec-5", systemName: "VPN", accessType: "Network", ownerTeam: "IT", revokeTiming: "Immediately", revokeDate: dateStr(0), dataBackupRequired: false, dataTransferRequired: false, licenseDeactivationRequired: false, revocationStatus: "Revoked", verificationStatus: "Verified" },
]

// ---------- FnF ----------
const fnfEntries = (exitCaseId: string): FnFEntry[] => [
  { id: `${exitCaseId}-e1`, exitCaseId, type: "earning", category: "Salary till LWD", description: "Salary for days worked till last working day", amount: 65000, source: "auto", status: "confirmed" },
  { id: `${exitCaseId}-e2`, exitCaseId, type: "earning", category: "Leave Encashment", description: "Encashment of 18 unused earned leaves", amount: 42000, source: "auto", status: "confirmed" },
  { id: `${exitCaseId}-e3`, exitCaseId, type: "earning", category: "Gratuity", description: "Gratuity as per Payment of Gratuity Act", amount: 85000, source: "auto", status: "confirmed" },
  { id: `${exitCaseId}-e4`, exitCaseId, type: "earning", category: "Bonus", description: "Performance bonus Q3", amount: 15000, source: "manual", status: "confirmed" },
  { id: `${exitCaseId}-e5`, exitCaseId, type: "earning", category: "Reimbursement Payable", description: "Pending expense reimbursements", amount: 8500, source: "auto", status: "confirmed" },
  { id: `${exitCaseId}-d1`, exitCaseId, type: "deduction", category: "Notice Recovery", description: "Notice period shortfall recovery", amount: 0, source: "auto", status: "confirmed" },
  { id: `${exitCaseId}-d2`, exitCaseId, type: "deduction", category: "Tax / TDS", description: "TDS deduction on FnF", amount: 28000, source: "auto", status: "confirmed" },
  { id: `${exitCaseId}-d3`, exitCaseId, type: "deduction", category: "PF / ESI / Statutory", description: "Provident fund deduction", amount: 7800, source: "auto", status: "confirmed" },
  { id: `${exitCaseId}-d4`, exitCaseId, type: "deduction", category: "Loan Recovery", description: "Salary advance recovery", amount: 10000, source: "auto", status: "confirmed" },
]

const sumEarnings = (entries: FnFEntry[]) => entries.filter(e => e.type === "earning").reduce((s, e) => s + e.amount, 0)
const sumDeductions = (entries: FnFEntry[]) => entries.filter(e => e.type === "deduction").reduce((s, e) => s + e.amount, 0)

export const FNF_RECORDS: FnFRecord[] = [
  { exitCaseId: "ec-4", status: "Approved", entries: fnfEntries("ec-4"), totalEarnings: 0, totalDeductions: 0, netPayable: 0, calculatedAt: daysAgo(3), approvedBy: "Rajesh Kumar", approvedAt: daysAgo(2) },
  { exitCaseId: "ec-5", status: "Paid", entries: [...fnfEntries("ec-5"), { id: "ec-5-d5", exitCaseId: "ec-5", type: "deduction", category: "Asset Damage Recovery", description: "Mobile phone damage", amount: 5000, source: "auto", status: "confirmed" }, { id: "ec-5-d6", exitCaseId: "ec-5", type: "deduction", category: "Notice Recovery", description: "Notice period not served (60 days)", amount: 130000, source: "manual", status: "confirmed" }], totalEarnings: 0, totalDeductions: 0, netPayable: 0, calculatedAt: daysAgo(3), approvedBy: "Anita Desai", approvedAt: daysAgo(2), paidAt: daysAgo(1) },
  { exitCaseId: "ec-6", status: "Closed", entries: fnfEntries("ec-6"), totalEarnings: 0, totalDeductions: 0, netPayable: 0, calculatedAt: daysAgo(5), approvedBy: "Anita Desai", approvedAt: daysAgo(4), paidAt: daysAgo(3) },
  { exitCaseId: "ec-8", status: "On Hold", entries: [...fnfEntries("ec-8"), { id: "ec-8-d5", exitCaseId: "ec-8", type: "deduction", category: "Asset Damage Recovery", description: "Laptop not returned (lost)", amount: 120000, source: "auto", status: "confirmed" }, { id: "ec-8-d6", exitCaseId: "ec-8", type: "deduction", category: "Notice Recovery", description: "Notice period not served", amount: 130000, source: "manual", status: "draft" }], totalEarnings: 0, totalDeductions: 0, netPayable: 0, calculatedAt: daysAgo(8) },
]

// Compute totals
FNF_RECORDS.forEach(r => {
  r.totalEarnings = sumEarnings(r.entries)
  r.totalDeductions = sumDeductions(r.entries)
  r.netPayable = r.totalEarnings - r.totalDeductions
})

// ---------- Document Templates ----------
export const EXIT_DOCUMENT_TEMPLATES: ExitDocumentTemplate[] = [
  {
    id: "dt-1", name: "Standard Relieving Letter", code: "RELIEVE_STD", documentType: "Relieving Letter",
    scopeType: "Tenant Default", language: "English", version: 2, status: "Published", isDefault: true,
    headerHtml: "<div style='text-align:center; padding:16px;'><img src='{{CompanyLogo}}' alt='logo' height='40' /></div>",
    bodyHtml: "<p style='text-align:right;'>Date: {{LetterDate}}</p><h2 style='text-align:center;'>Relieving Letter</h2><p>Dear {{EmployeeName}},</p><p>This is to formally confirm that you have been relieved from your duties as <strong>{{Designation}}</strong> in the <strong>{{Department}}</strong> department at <strong>{{CompanyName}}</strong>, with effect from <strong>{{LastWorkingDay}}</strong>.</p><p>We thank you for your contributions during your tenure from {{DateOfJoining}} to {{LastWorkingDay}} and wish you success in your future endeavors.</p><p>Yours sincerely,<br/><strong>{{AuthorizedSignatory}}</strong><br/>{{CompanyName}}</p>",
    footerHtml: "<p style='color:#888; font-size:11px; margin-top:24px; border-top:1px solid #eee; padding-top:8px;'>This is a system-generated document. {{CompanyName}} · {{EntityName}}</p>",
    createdAt: daysAgo(90), updatedAt: daysAgo(10),
  },
  {
    id: "dt-2", name: "Standard Experience Letter", code: "EXP_STD", documentType: "Experience Letter",
    scopeType: "Tenant Default", language: "English", version: 1, status: "Published", isDefault: true,
    headerHtml: "<div style='text-align:center; padding:16px;'><img src='{{CompanyLogo}}' alt='logo' height='40' /></div>",
    bodyHtml: "<p style='text-align:right;'>Date: {{LetterDate}}</p><h2 style='text-align:center;'>Certificate of Experience</h2><p>To Whom It May Concern,</p><p>This is to certify that <strong>{{EmployeeName}}</strong> (Employee Code: {{EmployeeCode}}) was employed with <strong>{{CompanyName}}</strong> from <strong>{{DateOfJoining}}</strong> to <strong>{{LastWorkingDay}}</strong>, holding the position of <strong>{{Designation}}</strong> in the <strong>{{Department}}</strong> department.</p><p>During the employment, we found {{EmployeeName}} to be diligent and professional. We wish {{EmployeeName}} all the best in future pursuits.</p><p>For {{CompanyName}},<br/><strong>{{AuthorizedSignatory}}</strong></p>",
    footerHtml: "<p style='color:#888; font-size:11px; margin-top:24px; border-top:1px solid #eee; padding-top:8px;'>{{CompanyName}} · {{EntityName}}</p>",
    createdAt: daysAgo(85), updatedAt: daysAgo(12),
  },
  {
    id: "dt-3", name: "Resignation Acceptance Letter", code: "RESIG_ACCEPT", documentType: "Resignation Acceptance Letter",
    scopeType: "Tenant Default", language: "English", version: 1, status: "Published", isDefault: false,
    bodyHtml: "<p>Dear {{EmployeeName}},</p><p>We acknowledge receipt of your resignation dated {{ResignationDate}}. Your resignation has been accepted and your last working day will be <strong>{{LastWorkingDay}}</strong>.</p><p>Please complete the clearance process as per company policy.</p><p>Regards,<br/>{{HRName}}<br/>{{CompanyName}}</p>",
    createdAt: daysAgo(70), updatedAt: daysAgo(15),
  },
  {
    id: "dt-4", name: "No Dues Certificate", code: "NDC_STD", documentType: "No Dues Certificate",
    scopeType: "Tenant Default", language: "English", version: 1, status: "Published", isDefault: true,
    bodyHtml: "<h2 style='text-align:center;'>No Dues Certificate</h2><p>This is to certify that <strong>{{EmployeeName}}</strong> ({{EmployeeCode}}) has cleared all dues payable to <strong>{{CompanyName}}</strong> as on {{LetterDate}}.</p><p>No dues are outstanding from the employee's side as of the last working day {{LastWorkingDay}}.</p><p>For {{CompanyName}},<br/><strong>{{AuthorizedSignatory}}</strong></p>",
    createdAt: daysAgo(60), updatedAt: daysAgo(8),
  },
  {
    id: "dt-5", name: "FnF Settlement Letter", code: "FNF_LETTER", documentType: "FnF Settlement Letter",
    scopeType: "Tenant Default", language: "English", version: 1, status: "Published", isDefault: true,
    bodyHtml: "<p>Dear {{EmployeeName}},</p><p>Your Full & Final settlement has been processed. The details are as follows:</p><p><strong>Net Payable:</strong> {{FnFAmount}}</p><p><strong>Recovery Amount:</strong> {{RecoveryAmount}}</p><p>The settlement amount will be credited to your registered bank account within 7 working days.</p><p>Regards,<br/>{{HRName}}<br/>{{CompanyName}}</p>",
    createdAt: daysAgo(55), updatedAt: daysAgo(6),
  },
  {
    id: "dt-6", name: "India Relieving Letter", code: "RELIEVE_INDIA", documentType: "Relieving Letter",
    scopeType: "Entity", entity: "ACME India Pvt Ltd", language: "English", version: 1, status: "Published", isDefault: false,
    bodyHtml: "<p>Dear {{EmployeeName}},</p><p>This is to formally confirm that you have been relieved from your duties as {{Designation}} at {{CompanyName}} ({{EntityName}}), effective {{LastWorkingDay}}.</p><p>For {{CompanyName}},<br/>{{AuthorizedSignatory}}</p>",
    createdAt: daysAgo(40), updatedAt: daysAgo(5),
  },
  {
    id: "dt-7", name: "Termination Letter", code: "TERM_LETTER", documentType: "Termination Letter",
    scopeType: "Tenant Default", language: "English", version: 1, status: "Draft", isDefault: false,
    bodyHtml: "<p>Dear {{EmployeeName}},</p><p>This letter is to inform you that your employment with {{CompanyName}} is being terminated effective {{LastWorkingDay}} due to {{ExitReason}}.</p><p>Please return all company property and complete the clearance process.</p><p>Regards,<br/>{{HRName}}</p>",
    createdAt: daysAgo(20), updatedAt: daysAgo(3),
  },
]

// ---------- Email Templates ----------
export const EXIT_EMAIL_TEMPLATES: ExitEmailTemplate[] = [
  {
    id: "et-1", name: "Resignation Submitted Notification", code: "EMAIL_RESIG_SUB", eventType: "Resignation Submitted",
    scopeType: "Tenant Default", language: "English", isDefault: true, status: "Active", version: 1,
    subject: "Resignation Submitted — {{EmployeeName}}",
    headerHtml: "<div style='padding:12px; background:#f0fdf4; border-radius:8px;'>Resignation Notification</div>",
    bodyHtml: "<p>Dear {{ManagerName}},</p><p>This is to inform you that <strong>{{EmployeeName}}</strong> ({{EmployeeCode}}) has submitted their resignation.</p><p><strong>Requested Last Working Day:</strong> {{LastWorkingDay}}</p><p><strong>Reason:</strong> {{ExitReason}}</p><p>Please review and recommend a final LWD.</p><p>Regards,<br/>{{HRName}}</p>",
    footerHtml: "<p style='color:#888; font-size:11px;'>{{CompanyName}} HRMS · Do not reply</p>",
    recipients: ["Reporting Manager"], cc: ["HR Owner"], createdAt: daysAgo(80), updatedAt: daysAgo(10),
  },
  {
    id: "et-2", name: "Manager Approval Pending", code: "EMAIL_MGR_PEND", eventType: "Manager Approval Pending",
    scopeType: "Tenant Default", language: "English", isDefault: true, status: "Active", version: 1,
    subject: "Action Required: Resignation Approval — {{EmployeeName}}",
    bodyHtml: "<p>Dear {{ManagerName}},</p><p>The resignation of <strong>{{EmployeeName}}</strong> is pending your approval.</p><p>Please review and approve/reject at: {{ApprovalLink}}</p>",
    footerHtml: "<p style='color:#888; font-size:11px;'>{{CompanyName}} HRMS</p>",
    recipients: ["Reporting Manager"], cc: ["HR Owner"], createdAt: daysAgo(78), updatedAt: daysAgo(8),
  },
  {
    id: "et-3", name: "Resignation Approved", code: "EMAIL_RESIG_APPR", eventType: "Resignation Approved",
    scopeType: "Tenant Default", language: "English", isDefault: true, status: "Active", version: 1,
    subject: "Resignation Approved — Last Working Day: {{LastWorkingDay}}",
    bodyHtml: "<p>Dear {{EmployeeName}},</p><p>Your resignation has been approved. Your last working day is <strong>{{LastWorkingDay}}</strong>.</p><p>Please complete the clearance process before your exit.</p><p>Regards,<br/>{{HRName}}</p>",
    footerHtml: "<p style='color:#888; font-size:11px;'>{{CompanyName}}</p>",
    recipients: ["Employee"], cc: ["Reporting Manager", "HR Owner"], createdAt: daysAgo(75), updatedAt: daysAgo(7),
  },
  {
    id: "et-4", name: "Clearance Task Assigned", code: "EMAIL_CLR_TASK", eventType: "Clearance Task Assigned",
    scopeType: "Tenant Default", language: "English", isDefault: true, status: "Active", version: 1,
    subject: "Clearance Task Assigned: {{TaskName}} — {{EmployeeName}}",
    bodyHtml: "<p>A clearance task has been assigned to you for the exit of <strong>{{EmployeeName}}</strong>.</p><p><strong>Task:</strong> {{TaskName}}<br/><strong>Due Date:</strong> {{DueDate}}</p><p>Please complete the task at: {{PortalLink}}</p>",
    footerHtml: "<p style='color:#888; font-size:11px;'>{{CompanyName}} HRMS</p>",
    recipients: ["Specific Role"], cc: ["HR Owner"], createdAt: daysAgo(70), updatedAt: daysAgo(6),
  },
  {
    id: "et-5", name: "Asset Return Pending", code: "EMAIL_ASSET_PEND", eventType: "Asset Return Pending",
    scopeType: "Tenant Default", language: "English", isDefault: true, status: "Active", version: 1,
    subject: "Reminder: Asset Return Pending — {{EmployeeName}}",
    bodyHtml: "<p>Dear {{EmployeeName}},</p><p>The following assets are pending return: {{PendingTasks}}</p><p>Please return them before {{LastWorkingDay}}.</p>",
    footerHtml: "<p style='color:#888; font-size:11px;'>{{CompanyName}}</p>",
    recipients: ["Employee"], cc: ["HR Owner", "Asset Owner"], createdAt: daysAgo(65), updatedAt: daysAgo(5),
  },
  {
    id: "et-6", name: "Exit Interview Request", code: "EMAIL_EXIT_INT", eventType: "Exit Interview Request",
    scopeType: "Tenant Default", language: "English", isDefault: true, status: "Active", version: 1,
    subject: "Exit Interview Request — {{EmployeeName}}",
    bodyHtml: "<p>Dear {{EmployeeName}},</p><p>We'd like to invite you to complete an exit interview. Your feedback helps us improve.</p><p>Please complete the form at: {{PortalLink}}</p>",
    footerHtml: "<p style='color:#888; font-size:11px;'>{{CompanyName}}</p>",
    recipients: ["Employee"], cc: ["HR Owner"], createdAt: daysAgo(60), updatedAt: daysAgo(4),
  },
  {
    id: "et-7", name: "FnF Calculated", code: "EMAIL_FNF_CALC", eventType: "FnF Calculated",
    scopeType: "Tenant Default", language: "English", isDefault: true, status: "Active", version: 1,
    subject: "FnF Settlement Calculated — {{EmployeeName}}",
    bodyHtml: "<p>Dear {{EmployeeName}},</p><p>Your Full & Final settlement has been calculated. Status: {{FnFStatus}}</p><p>Please review the details in your portal.</p>",
    footerHtml: "<p style='color:#888; font-size:11px;'>{{CompanyName}}</p>",
    recipients: ["Employee"], cc: ["HR Owner", "Payroll Admin"], createdAt: daysAgo(55), updatedAt: daysAgo(3),
  },
  {
    id: "et-8", name: "Relieving Letter Generated", code: "EMAIL_RELIEVE_GEN", eventType: "Relieving Letter Generated",
    scopeType: "Tenant Default", language: "English", isDefault: true, status: "Active", version: 1,
    subject: "Relieving Letter Generated — {{EmployeeName}}",
    bodyHtml: "<p>Dear {{EmployeeName}},</p><p>Your relieving letter has been generated. Please download it from: {{RelievingLetterLink}}</p>",
    footerHtml: "<p style='color:#888; font-size:11px;'>{{CompanyName}}</p>",
    recipients: ["Employee"], cc: ["HR Owner"], createdAt: daysAgo(50), updatedAt: daysAgo(2),
  },
]

// ---------- Checklists ----------
export const EXIT_CHECKLISTS: ExitChecklist[] = [
  {
    id: "cl-1", name: "Standard Employee Exit Checklist", code: "EXIT_CHK_STD", category: "Employee Exit Checklist",
    scopeType: "Tenant Default", status: "Active", isDefault: true, version: 2,
    tasks: [
      { id: "ct-1", name: "Submit resignation letter", code: "TASK_RESIG", description: "Formal resignation letter submission", ownerType: "Employee", dueDateRule: "On Exit Initiation", priority: "High", mandatory: true, blocking: true, requiresAttachment: true, requiresComment: false, requiresApproval: false, financialImpact: false, recoveryAllowed: false, stageMapping: "Resignation Submitted" },
      { id: "ct-2", name: "Complete knowledge transfer", code: "TASK_KT", description: "Document and transfer project knowledge", ownerType: "Employee", dueDateRule: "Before LWD - 7 Days", priority: "High", mandatory: true, blocking: true, requiresAttachment: true, requiresComment: true, requiresApproval: true, financialImpact: false, recoveryAllowed: false, stageMapping: "Notice Period" },
      { id: "ct-3", name: "Return company assets", code: "TASK_ASSET", description: "Return laptop, ID card, access card", ownerType: "Employee", dueDateRule: "On LWD", priority: "Critical", mandatory: true, blocking: true, requiresAttachment: true, requiresComment: false, requiresApproval: true, financialImpact: true, recoveryAllowed: true, stageMapping: "Asset Recovery" },
      { id: "ct-4", name: "Complete exit interview", code: "TASK_INTERVIEW", description: "Fill exit interview form", ownerType: "Employee", dueDateRule: "Before LWD - 3 Days", priority: "Medium", mandatory: true, blocking: false, requiresAttachment: false, requiresComment: true, requiresApproval: false, financialImpact: false, recoveryAllowed: false, stageMapping: "Exit Letters" },
      { id: "ct-5", name: "Submit handover document", code: "TASK_HANDOVER", description: "Signed handover document", ownerType: "Employee", dueDateRule: "On LWD", priority: "High", mandatory: true, blocking: true, requiresAttachment: true, requiresComment: false, requiresApproval: true, financialImpact: false, recoveryAllowed: false, stageMapping: "Clearance In Progress" },
    ],
    createdAt: daysAgo(100), updatedAt: daysAgo(10),
  },
  {
    id: "cl-2", name: "Manager Clearance Checklist", code: "MGR_CLR_CHK", category: "Manager Clearance Checklist",
    scopeType: "Tenant Default", status: "Active", isDefault: true, version: 1,
    tasks: [
      { id: "ct-6", name: "Review resignation", code: "TASK_MGR_REV", description: "Review and approve/reject resignation", ownerType: "Manager", dueDateRule: "On Resignation Approval", priority: "High", mandatory: true, blocking: true, requiresAttachment: false, requiresComment: true, requiresApproval: true, financialImpact: false, recoveryAllowed: false, stageMapping: "Manager Review" },
      { id: "ct-7", name: "Recommend LWD", code: "TASK_MGR_LWD", description: "Recommend final last working day", ownerType: "Manager", dueDateRule: "On Resignation Approval", priority: "High", mandatory: true, blocking: true, requiresAttachment: false, requiresComment: true, requiresApproval: false, financialImpact: false, recoveryAllowed: false, stageMapping: "Manager Review" },
      { id: "ct-8", name: "Approve KT completion", code: "TASK_MGR_KT", description: "Verify and approve knowledge transfer", ownerType: "Manager", dueDateRule: "Before LWD - 3 Days", priority: "High", mandatory: true, blocking: true, requiresAttachment: true, requiresComment: true, requiresApproval: true, financialImpact: false, recoveryAllowed: false, stageMapping: "Clearance In Progress" },
    ],
    createdAt: daysAgo(90), updatedAt: daysAgo(8),
  },
  {
    id: "cl-3", name: "IT Clearance Checklist", code: "IT_CLR_CHK", category: "IT Checklist",
    scopeType: "Tenant Default", status: "Active", isDefault: true, version: 1,
    tasks: [
      { id: "ct-9", name: "Revoke email access", code: "TASK_IT_EMAIL", description: "Disable email and backup data", ownerType: "IT Admin", dueDateRule: "On LWD", priority: "Critical", mandatory: true, blocking: true, requiresAttachment: false, requiresComment: true, requiresApproval: false, financialImpact: false, recoveryAllowed: false, stageMapping: "IT Access Revocation" },
      { id: "ct-10", name: "Revoke SSO/VPN", code: "TASK_IT_SSO", description: "Revoke SSO and VPN access", ownerType: "IT Admin", dueDateRule: "On LWD", priority: "Critical", mandatory: true, blocking: true, requiresAttachment: false, requiresComment: true, requiresApproval: false, financialImpact: false, recoveryAllowed: false, stageMapping: "IT Access Revocation" },
      { id: "ct-11", name: "Revoke code repository access", code: "TASK_IT_GIT", description: "Remove GitHub/GitLab access", ownerType: "IT Admin", dueDateRule: "On LWD", priority: "High", mandatory: true, blocking: false, requiresAttachment: false, requiresComment: true, requiresApproval: false, financialImpact: false, recoveryAllowed: false, stageMapping: "IT Access Revocation" },
      { id: "ct-12", name: "Data backup and transfer", code: "TASK_IT_BACKUP", description: "Backup and transfer employee data", ownerType: "IT Admin", dueDateRule: "Before LWD - 1 Days", priority: "High", mandatory: true, blocking: true, requiresAttachment: true, requiresComment: true, requiresApproval: true, financialImpact: false, recoveryAllowed: false, stageMapping: "IT Access Revocation" },
    ],
    createdAt: daysAgo(85), updatedAt: daysAgo(7),
  },
  {
    id: "cl-4", name: "HR Clearance Checklist", code: "HR_CLR_CHK", category: "HR Checklist",
    scopeType: "Tenant Default", status: "Active", isDefault: true, version: 1,
    tasks: [
      { id: "ct-13", name: "Conduct exit interview", code: "TASK_HR_INTERVIEW", description: "Conduct and document exit interview", ownerType: "HR", dueDateRule: "Before LWD - 3 Days", priority: "High", mandatory: true, blocking: true, requiresAttachment: false, requiresComment: true, requiresApproval: false, financialImpact: false, recoveryAllowed: false, stageMapping: "Clearance In Progress" },
      { id: "ct-14", name: "Verify FnF inputs", code: "TASK_HR_FNF", description: "Verify FnF calculation inputs", ownerType: "HR", dueDateRule: "On LWD", priority: "High", mandatory: true, blocking: true, requiresAttachment: false, requiresComment: true, requiresApproval: true, financialImpact: true, recoveryAllowed: false, stageMapping: "FnF Settlement" },
      { id: "ct-15", name: "Generate relieving letter", code: "TASK_HR_RELIEVE", description: "Generate and issue relieving letter", ownerType: "HR", dueDateRule: "On LWD", priority: "High", mandatory: true, blocking: true, requiresAttachment: true, requiresComment: false, requiresApproval: true, financialImpact: false, recoveryAllowed: false, stageMapping: "Exit Letters" },
    ],
    createdAt: daysAgo(80), updatedAt: daysAgo(6),
  },
  {
    id: "cl-5", name: "Finance Clearance Checklist", code: "FIN_CLR_CHK", category: "Finance Checklist",
    scopeType: "Tenant Default", status: "Active", isDefault: false, version: 1,
    tasks: [
      { id: "ct-16", name: "Clear outstanding dues", code: "TASK_FIN_DUES", description: "Verify and clear outstanding financial dues", ownerType: "Finance", dueDateRule: "On LWD", priority: "High", mandatory: true, blocking: true, requiresAttachment: false, requiresComment: true, requiresApproval: true, financialImpact: true, recoveryAllowed: true, stageMapping: "Clearance In Progress" },
      { id: "ct-17", name: "Process FnF payment", code: "TASK_FIN_PAY", description: "Process FnF settlement payment", ownerType: "Finance", dueDateRule: "After LWD + 7 Days", priority: "Critical", mandatory: true, blocking: true, requiresAttachment: true, requiresComment: true, requiresApproval: true, financialImpact: true, recoveryAllowed: false, stageMapping: "FnF Settlement" },
    ],
    createdAt: daysAgo(70), updatedAt: daysAgo(5),
  },
]

// ---------- Exit Interview Forms ----------
export const EXIT_INTERVIEW_FORMS: ExitInterviewForm[] = [
  {
    id: "ei-1", name: "Standard HR Exit Interview", code: "HR_EXIT_INT", category: "HR Exit Interview",
    scopeType: "Tenant Default", status: "Active", isDefault: true, version: 2,
    anonymousAllowed: false, mandatory: true, visibleToManager: false, visibleToHR: true, requiresHRReview: true,
    questions: [
      { id: "q1", question: "What is your primary reason for leaving?", type: "select", options: ["Better Opportunity", "Career Growth", "Compensation", "Work Life Balance", "Relocation", "Health Reasons", "Family Reasons", "Higher Studies", "Management Issues", "Work Culture", "Other"], required: true },
      { id: "q2", question: "What is your secondary reason for leaving?", type: "select", options: ["Better Opportunity", "Career Growth", "Compensation", "Work Life Balance", "Relocation", "Health Reasons", "Family Reasons", "Higher Studies", "Management Issues", "Work Culture", "Other"], required: false },
      { id: "q3", question: "New Company (optional)", type: "text", required: false },
      { id: "q4", question: "New Role (optional)", type: "text", required: false },
      { id: "q5", question: "How would you rate your compensation satisfaction?", type: "rating", required: true },
      { id: "q6", question: "How would you rate your relationship with your manager?", type: "rating", required: true },
      { id: "q7", question: "How would you rate the work culture?", type: "rating", required: true },
      { id: "q8", question: "How would you rate your career growth opportunities?", type: "rating", required: true },
      { id: "q9", question: "How would you rate your workload?", type: "rating", required: true },
      { id: "q10", question: "Would you rejoin the company in the future?", type: "radio", options: ["Yes", "No", "Maybe"], required: true },
      { id: "q11", question: "Would you recommend this company to others?", type: "radio", options: ["Yes", "No", "Maybe"], required: true },
      { id: "q12", question: "Suggestions for improvement", type: "textarea", required: false },
      { id: "q13", question: "Final remarks", type: "textarea", required: false },
    ],
    createdAt: daysAgo(90), updatedAt: daysAgo(10),
  },
  {
    id: "ei-2", name: "Anonymous Exit Survey", code: "ANON_EXIT", category: "Anonymous Exit Survey",
    scopeType: "Tenant Default", status: "Active", isDefault: false, version: 1,
    anonymousAllowed: true, mandatory: false, visibleToManager: false, visibleToHR: true, requiresHRReview: false,
    questions: [
      { id: "q1", question: "Overall experience rating", type: "rating", required: true },
      { id: "q2", question: "Primary reason for leaving", type: "textarea", required: true },
      { id: "q3", question: "What did you like most about working here?", type: "textarea", required: false },
      { id: "q4", question: "What did you like least?", type: "textarea", required: false },
      { id: "q5", question: "Any suggestions for improvement?", type: "textarea", required: false },
    ],
    createdAt: daysAgo(60), updatedAt: daysAgo(5),
  },
  {
    id: "ei-3", name: "Manager Exit Discussion", code: "MGR_EXIT", category: "Manager Exit Discussion",
    scopeType: "Tenant Default", status: "Active", isDefault: false, version: 1,
    anonymousAllowed: false, mandatory: false, visibleToManager: true, visibleToHR: true, requiresHRReview: true,
    questions: [
      { id: "q1", question: "Manager's assessment of the exit reason", type: "textarea", required: true },
      { id: "q2", question: "Was retention attempted?", type: "radio", options: ["Yes", "No"], required: true },
      { id: "q3", question: "Retention discussion summary", type: "textarea", required: false },
      { id: "q4", question: "Is this a regrettable attrition?", type: "radio", options: ["Yes", "No"], required: true },
      { id: "q5", question: "Eligible for rehire?", type: "radio", options: ["Yes", "No", "Maybe"], required: true },
    ],
    createdAt: daysAgo(50), updatedAt: daysAgo(4),
  },
]

// ---------- Alumni ----------
export const ALUMNI: AlumniRecord[] = [
  {
    id: "al-1", employeeCode: "EMP-0987", employeeName: "Kavya Nair", avatarColor: "#f59e0b",
    entity: "ACME India Pvt Ltd", department: "Finance", designation: "Finance Analyst",
    dateOfJoining: dateStr(600), lastWorkingDay: dateStr(-15), exitType: "Voluntary Resignation",
    exitReason: "Compensation", email: "kavya.nair@example.com", phone: "+91-9876543210",
    linkedin: "linkedin.com/in/kavyanair", eligibleRehire: true, alumniSince: dateStr(-15), status: "Alumni",
  },
  {
    id: "al-2", employeeCode: "EMP-1078", employeeName: "Deepak Verma", avatarColor: "#14b8a6",
    entity: "ACME India Pvt Ltd", department: "Engineering", designation: "Software Engineer",
    dateOfJoining: dateStr(500), lastWorkingDay: dateStr(0), exitType: "Voluntary Resignation",
    exitReason: "Higher Studies", email: "deepak.verma@example.com", phone: "+91-9876543211",
    linkedin: "linkedin.com/in/deepakverma", eligibleRehire: true, alumniSince: dateStr(0), status: "Alumni",
  },
  {
    id: "al-3", employeeCode: "EMP-1156", employeeName: "Vikram Rao", avatarColor: "#ec4899",
    entity: "ACME India Pvt Ltd", department: "Engineering", designation: "Tech Lead",
    dateOfJoining: dateStr(200), lastWorkingDay: dateStr(0), exitType: "Involuntary Termination",
    exitReason: "Performance", email: "vikram.rao@example.com", phone: "+91-9876543212",
    eligibleRehire: false, alumniSince: dateStr(0), status: "No-Rehire",
  },
  {
    id: "al-4", employeeCode: "EMP-0901", employeeName: "Aisha Khan", avatarColor: "#8b5cf6",
    entity: "ACME UAE FZ-LLC", department: "Marketing", designation: "Marketing Manager",
    dateOfJoining: dateStr(800), lastWorkingDay: dateStr(-90), exitType: "End of Contract",
    exitReason: "End of Contract Term", email: "aisha.khan@example.com", phone: "+971-501234567",
    linkedin: "linkedin.com/in/aishakhan", eligibleRehire: true, alumniSince: dateStr(-90), status: "Alumni",
  },
  {
    id: "al-5", employeeCode: "EMP-0945", employeeName: "Raj Malhotra", avatarColor: "#f97316",
    entity: "ACME India Pvt Ltd", department: "Sales", designation: "Sales Manager",
    dateOfJoining: dateStr(900), lastWorkingDay: dateStr(-120), exitType: "Retirement",
    exitReason: "Retirement Age", email: "raj.malhotra@example.com", phone: "+91-9876543213",
    eligibleRehire: false, alumniSince: dateStr(-120), status: "Alumni",
  },
]

// ---------- Logs ----------
export const OFFBOARDING_LOGS: OffboardingLog[] = [
  { id: "log-1", timestamp: daysAgo(0), exitCaseId: "EXIT-2025-001", employeeName: "Rahul Sharma", employeeCode: "EMP-1042", entity: "ACME India Pvt Ltd", logType: "Stage Movement", actionType: "Stage Changed", oldValue: "Notice Period", newValue: "Clearance In Progress", performedBy: "Anita Desai", role: "HR Admin", ipAddress: "192.168.1.100", status: "Success", remarks: "Moved to clearance stage" },
  { id: "log-2", timestamp: daysAgo(0), exitCaseId: "EXIT-2025-001", employeeName: "Rahul Sharma", employeeCode: "EMP-1042", entity: "ACME India Pvt Ltd", logType: "Clearance Logs", actionType: "Task Completed", oldValue: "In Progress", newValue: "Completed", performedBy: "Priya Patel", role: "Manager", ipAddress: "192.168.1.101", status: "Success", remarks: "Manager clearance completed" },
  { id: "log-3", timestamp: daysAgo(1), exitCaseId: "EXIT-2025-005", employeeName: "Vikram Rao", employeeCode: "EMP-1156", entity: "ACME India Pvt Ltd", logType: "Employee Status Logs", actionType: "Employee Marked Exited", oldValue: "Active", newValue: "Exited", performedBy: "Anita Desai", role: "HR Admin", ipAddress: "192.168.1.100", status: "Success", remarks: "Employee marked as exited" },
  { id: "log-4", timestamp: daysAgo(1), exitCaseId: "EXIT-2025-005", employeeName: "Vikram Rao", employeeCode: "EMP-1156", entity: "ACME India Pvt Ltd", logType: "FnF Logs", actionType: "FnF Paid", oldValue: "Approved", newValue: "Paid", performedBy: "Rajesh Kumar", role: "Finance Admin", ipAddress: "192.168.1.102", status: "Success", remarks: "FnF payment processed" },
  { id: "log-5", timestamp: daysAgo(2), exitCaseId: "EXIT-2025-004", employeeName: "Kavya Nair", employeeCode: "EMP-0987", entity: "ACME India Pvt Ltd", logType: "Document / Letter Logs", actionType: "Relieving Letter Generated", oldValue: "Not Started", newValue: "Generated", performedBy: "Anita Desai", role: "HR Admin", ipAddress: "192.168.1.100", status: "Success", remarks: "Relieving letter generated" },
  { id: "log-6", timestamp: daysAgo(2), exitCaseId: "EXIT-2025-004", employeeName: "Kavya Nair", employeeCode: "EMP-0987", entity: "ACME India Pvt Ltd", logType: "FnF Logs", actionType: "FnF Approved", oldValue: "Under Review", newValue: "Approved", performedBy: "Rajesh Kumar", role: "Finance Admin", ipAddress: "192.168.1.102", status: "Success", remarks: "FnF approved by finance" },
  { id: "log-7", timestamp: daysAgo(3), exitCaseId: "EXIT-2025-001", employeeName: "Rahul Sharma", employeeCode: "EMP-1042", entity: "ACME India Pvt Ltd", logType: "Clearance Logs", actionType: "Task Completed", oldValue: "Pending", newValue: "Completed", performedBy: "Priya Patel", role: "Manager", ipAddress: "192.168.1.101", status: "Success", remarks: "Manager clearance — handover complete" },
  { id: "log-8", timestamp: daysAgo(5), exitCaseId: "EXIT-2025-008", employeeName: "Rohan Gupta", employeeCode: "EMP-1102", entity: "ACME India Pvt Ltd", logType: "Stage Movement Logs", actionType: "Stage Changed", oldValue: "Clearance In Progress", newValue: "On Hold", performedBy: "Anita Desai", role: "HR Admin", ipAddress: "192.168.1.100", status: "Warning", remarks: "Employee absconded — exit put on hold" },
  { id: "log-9", timestamp: daysAgo(5), exitCaseId: "EXIT-2025-008", employeeName: "Rohan Gupta", employeeCode: "EMP-1102", entity: "ACME India Pvt Ltd", logType: "Asset Recovery Logs", actionType: "Asset Marked Lost", oldValue: "Pending", newValue: "Lost", performedBy: "Anita Desai", role: "HR Admin", ipAddress: "192.168.1.100", status: "Error", remarks: "Laptop not returned — marked as lost, recovery raised" },
  { id: "log-10", timestamp: daysAgo(8), exitCaseId: "EXIT-2025-006", employeeName: "Deepak Verma", employeeCode: "EMP-1078", entity: "ACME India Pvt Ltd", logType: "Employee Status Logs", actionType: "Alumni Profile Created", oldValue: "—", newValue: "Alumni", performedBy: "System", role: "System", status: "Success", remarks: "Alumni profile auto-created" },
  { id: "log-11", timestamp: daysAgo(10), exitCaseId: "EXIT-2025-006", employeeName: "Deepak Verma", employeeCode: "EMP-1078", entity: "ACME India Pvt Ltd", logType: "Email Logs", actionType: "Relieving Letter Email Sent", oldValue: "—", newValue: "Sent", performedBy: "System", role: "System", status: "Success", remarks: "Relieving letter email sent to employee" },
  { id: "log-12", timestamp: daysAgo(12), exitCaseId: "EXIT-2025-003", employeeName: "Arjun Mehta", employeeCode: "EMP-1120", entity: "ACME UAE FZ-LLC", logType: "Stage Movement Logs", actionType: "Stage Changed", oldValue: "HR Review", newValue: "Notice Period", performedBy: "Fatima Hassan", role: "HR Admin", ipAddress: "192.168.2.100", status: "Success", remarks: "Moved to notice period" },
  { id: "log-13", timestamp: daysAgo(15), exitCaseId: "EXIT-2025-002", employeeName: "Sneha Reddy", employeeCode: "EMP-1087", entity: "ACME India Pvt Ltd", logType: "Resignation Logs", actionType: "Manager Approved", oldValue: "Pending Manager Approval", newValue: "Pending HR Approval", performedBy: "Vikram Singh", role: "Manager", ipAddress: "192.168.1.103", status: "Success", remarks: "Manager approved resignation" },
  { id: "log-14", timestamp: daysAgo(20), exitCaseId: "EXIT-2025-001", employeeName: "Rahul Sharma", employeeCode: "EMP-1042", entity: "ACME India Pvt Ltd", logType: "Exit Case Logs", actionType: "Exit Case Created", oldValue: "—", newValue: "Active", performedBy: "Anita Desai", role: "HR Admin", ipAddress: "192.168.1.100", status: "Success", remarks: "Exit case initiated" },
  { id: "log-15", timestamp: daysAgo(25), exitCaseId: "EXIT-2025-001", employeeName: "Rahul Sharma", employeeCode: "EMP-1042", entity: "ACME India Pvt Ltd", logType: "Resignation Logs", actionType: "Resignation Submitted", oldValue: "—", newValue: "Submitted", performedBy: "Rahul Sharma", role: "Employee", ipAddress: "192.168.1.105", status: "Success", remarks: "Employee submitted resignation via portal" },
]

// ---------- Settings ----------
export const OFFBOARDING_SETTINGS: OffboardingSettings = {
  general: {
    enableModule: true, allowEmployeeResignation: true, allowManagerInitiatedExit: true,
    allowHrInitiatedExit: true, allowBulkExitInitiation: true, allowResignationWithdrawal: true,
    allowExitCancellation: true, allowRehire: true,
    defaultExitWorkflow: "Standard Exit Workflow", defaultKanbanBoard: "Default Exit Kanban", defaultHrOwner: "Anita Desai",
  },
  employeeExit: {
    exitIdAutoGenerate: true, exitIdPrefix: "EXIT", exitIdFormat: "EXIT-{YYYY}-{####}",
    duplicateCheck: true, allowBackdated: false, allowFutureDated: true, allowLwdChange: true,
    allowExitHold: true, allowExitReopen: true,
  },
  clearance: {
    enableClearance: true, allowEntityWise: true, allowDeptWise: true, allowMandatoryTask: true,
    allowBlockingTask: true, allowTaskWaiver: true, allowRecoveryAmount: true,
    requireBeforeFnf: true, requireBeforeExitClosure: true,
  },
  fnf: {
    enableFnf: true, allowEntityWise: true, allowPayrollGroupWise: true,
    autoFetchPayroll: true, autoFetchLeaveEncashment: true, autoFetchAssetRecovery: true,
    autoFetchLoanRecovery: true, allowManualEarnings: true, allowManualDeductions: true,
    fnfApprovalRequired: true, fnfPaymentTracking: true,
  },
  email: {
    enableNotifications: true, enableEntityWise: true, enableWorkflowWise: true, enableStageWise: true,
    enableReminders: true, enableEscalations: true, enableEmailLogs: true, enableRetry: true,
    defaultFromEmail: "hr@acmecorp.com", defaultReplyTo: "hr-support@acmecorp.com",
  },
  audit: {
    enableAuditLog: true, trackExitDetails: true, trackWorkflowChanges: true, trackStageMovement: true,
    trackClearance: true, trackAssetRecovery: true, trackItRevocation: true, trackFnf: true,
    trackLetterGeneration: true, trackEmployeeStatus: true, softDeleteOnly: true, rbac: true,
  },
}

// ---------- Entity Configurations ----------
export const ENTITY_CONFIGURATIONS: EntityConfiguration[] = [
  {
    id: "ec-1", entity: "ACME India Pvt Ltd", useTenantDefault: false,
    defaultExitWorkflow: "India Full-Time Exit Workflow", defaultKanbanBoard: "India Exit Kanban",
    defaultClearanceChecklist: "India Clearance Checklist", defaultFnfRule: "India FnF Rule",
    defaultEmailGroup: "India Exit Emails", defaultExitInterviewForm: "India Exit Interview Form",
    defaultLetterGroup: "India Exit Letters", defaultHrOwner: "Anita Desai",
    defaultNoticePolicy: "India 60-Day Notice Policy", status: "Active",
  },
  {
    id: "ec-2", entity: "ACME UAE FZ-LLC", useTenantDefault: false,
    defaultExitWorkflow: "UAE Exit Workflow", defaultKanbanBoard: "UAE Exit Kanban",
    defaultClearanceChecklist: "UAE Clearance Checklist", defaultFnfRule: "UAE FnF Rule",
    defaultEmailGroup: "UAE Exit Emails", defaultExitInterviewForm: "Standard HR Exit Interview",
    defaultLetterGroup: "UAE Exit Letters", defaultHrOwner: "Fatima Hassan",
    defaultNoticePolicy: "UAE 30-Day Notice Policy", status: "Active",
  },
  {
    id: "ec-3", entity: "ACME US Inc", useTenantDefault: true, status: "Active",
  },
  {
    id: "ec-4", entity: "ACME UK Ltd", useTenantDefault: true, status: "Active",
  },
]

// ---------- Kanban Boards ----------
export const KANBAN_BOARDS = [
  { id: "board-1", name: "Default Exit Kanban", code: "EXIT_KANBAN_DEF", scopeType: "Tenant Default", workflow: "Standard Exit Workflow", stagesCount: 14, isDefault: true, status: "Active", version: 2, createdBy: "System", updatedAt: daysAgo(15) },
  { id: "board-2", name: "India Exit Kanban", code: "EXIT_KANBAN_INDIA", scopeType: "Entity", entity: "ACME India Pvt Ltd", workflow: "India Full-Time Exit Workflow", stagesCount: 14, isDefault: false, status: "Active", version: 1, createdBy: "Anita Desai", updatedAt: daysAgo(10) },
  { id: "board-3", name: "UAE Exit Kanban", code: "EXIT_KANBAN_UAE", scopeType: "Entity", entity: "ACME UAE FZ-LLC", workflow: "UAE Exit Workflow", stagesCount: 12, isDefault: false, status: "Active", version: 1, createdBy: "Fatima Hassan", updatedAt: daysAgo(7) },
  { id: "board-4", name: "Termination Exit Kanban", code: "EXIT_KANBAN_TERM", scopeType: "Exit Type", exitType: "Involuntary Termination", workflow: "Termination Exit Workflow", stagesCount: 10, isDefault: false, status: "Draft", version: 1, createdBy: "Anita Desai", updatedAt: daysAgo(2) },
]

// ---------- Dashboard stats helper ----------
export function getDashboardStats() {
  const activeCases = EXIT_CASES.filter(c => c.exitStatus === "Active").length
  const exitedCases = EXIT_CASES.filter(c => c.exitStatus === "Exited").length
  const onHoldCases = EXIT_CASES.filter(c => c.exitStatus === "On Hold").length
  const pendingResignations = RESIGNATION_REQUESTS.filter(r => r.status === "Pending Manager Approval" || r.status === "Pending HR Approval").length
  const pendingManagerApproval = RESIGNATION_REQUESTS.filter(r => r.status === "Pending Manager Approval").length
  const pendingHrApproval = RESIGNATION_REQUESTS.filter(r => r.status === "Pending HR Approval").length
  const clearancePending = EXIT_CASES.filter(c => c.clearanceStatus === "Pending" || c.clearanceStatus === "In Progress").length
  const clearanceOverdue = EXIT_CASES.filter(c => c.clearanceStatus === "Overdue").length
  const assetPending = EXIT_CASES.filter(c => c.assetStatus === "Pending" || c.assetStatus === "Partial").length
  const itPending = EXIT_CASES.filter(c => c.itAccessStatus === "Pending" || c.itAccessStatus === "Scheduled").length
  const fnfPending = EXIT_CASES.filter(c => c.fnfStatus === "Not Started" || c.fnfStatus === "Draft" || c.fnfStatus === "Inputs Pending" || c.fnfStatus === "Calculated" || c.fnfStatus === "Under Review").length
  const letterPending = EXIT_CASES.filter(c => c.letterStatus === "Not Started" || c.letterStatus === "Pending").length
  const lwdToday = EXIT_CASES.filter(c => c.approvedLwd === new Date().toISOString().slice(0, 10)).length
  const noticePeriod = EXIT_CASES.filter(c => c.currentStageId === "s5").length
  const exitedThisMonth = EXIT_CASES.filter(c => c.exitStatus === "Exited" && c.actualLwd && new Date(c.actualLwd).getMonth() === now.getMonth()).length
  const withdrawn = EXIT_CASES.filter(c => c.exitStatus === "Withdrawn").length
  const terminated = EXIT_CASES.filter(c => c.exitType === "Involuntary Termination").length
  const exitInterviewPending = EXIT_CASES.filter(c => c.currentStageId === "s6" || c.currentStageId === "s9").length
  const highRisk = EXIT_CASES.filter(c => c.riskFlag === "high").length

  return {
    activeCases, exitedCases, onHoldCases, pendingResignations, pendingManagerApproval,
    pendingHrApproval, clearancePending, clearanceOverdue, assetPending, itPending,
    fnfPending, letterPending, lwdToday, noticePeriod, exitedThisMonth, withdrawn,
    terminated, exitInterviewPending, highRisk,
    totalCases: EXIT_CASES.length,
    workflowsCount: EXIT_WORKFLOWS.length,
    documentsCount: EXIT_DOCUMENT_TEMPLATES.length,
    emailsCount: EXIT_EMAIL_TEMPLATES.length,
    checklistsCount: EXIT_CHECKLISTS.length,
    alumniCount: ALUMNI.length,
  }
}
