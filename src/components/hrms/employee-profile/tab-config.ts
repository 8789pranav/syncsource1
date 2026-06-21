// ============================================================
// Employee Profile — Tab configuration & role-based visibility
// ------------------------------------------------------------
// Single source of truth for the 32 employee-profile tabs.
// Each tab has: id, label, icon (lucide name), short description,
// and the list of "section cards" the tab will surface (used by
// the stub placeholders, and as a guide for the real implementers
// 8-c-1 / 8-c-2 / 8-c-3 who will overwrite select stubs).
// ============================================================

import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard, User, Briefcase, MapPin, Users, GraduationCap, Building2,
  Landmark, ScrollText, FileText, Clock, CalendarDays, Wallet, TrendingUp,
  Target, Award, BookOpen, Laptop, Receipt, LifeBuoy, Inbox, Mail, GitBranch,
  ShieldCheck, StickyNote, ClipboardCheck, ArrowLeftRight, LogOut, KeyRound,
  Shield, SlidersHorizontal, ClipboardList, Lock,
} from "lucide-react"

export type EmployeeRole =
  | "Super Admin"
  | "Organization Admin"
  | "HR Admin"
  | "Payroll Admin"
  | "Finance Admin"
  | "Department Head"
  | "Reporting Manager"
  | "Employee"
  | "Recruiter"
  | "IT Admin"
  | "Auditor"

export interface TabSection {
  title: string
  icon: LucideIcon
  hint: string
}

export interface ProfileTab {
  id: string
  label: string
  icon: LucideIcon
  description: string
  sections: TabSection[]
}

// ----------------------------------------------------------------
// The 32 tabs in the EXACT order required by the Phase 2 spec.
// ----------------------------------------------------------------
export const PROFILE_TABS: ProfileTab[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    description:
      "A quick, glanceable snapshot of the employee — key identity, current job, today's attendance, leave balance, payroll summary, document status and pending tasks all in one view.",
    sections: [
      { title: "Employee Summary", icon: User, hint: "Name, code, photo, status, contact quick row." },
      { title: "Job Summary", icon: Briefcase, hint: "Designation, department, entity, grade, manager." },
      { title: "Attendance Today", icon: Clock, hint: "Today's clock-in/out, work hours, late status." },
      { title: "Leave Balance", icon: CalendarDays, hint: "Opening, accrued, used & closing balance per type." },
      { title: "Payroll Summary", icon: Wallet, hint: "Current month gross, deductions, net pay." },
      { title: "Documents Status", icon: FileText, hint: "Submitted / pending mandatory documents." },
      { title: "Pending Tasks", icon: Inbox, hint: "Approvals, requests & forms awaiting action." },
      { title: "Recent Activity", icon: GitBranch, hint: "Latest profile, leave & payroll events." },
      { title: "Profile Completion", icon: Target, hint: "Completeness % across all profile sections." },
      { title: "Upcoming Events", icon: CalendarDays, hint: "Birthdays, anniversaries, holidays." },
      { title: "Manager Details", icon: Users, hint: "Reporting, functional & HR manager cards." },
      { title: "Emergency Contact", icon: LifeBuoy, hint: "Primary emergency contact snapshot." },
    ],
  },
  {
    id: "personal",
    label: "Personal Information",
    icon: User,
    description:
      "Personal & demographic details — identity fields, personal contact, gender, date of birth, marital status, blood group, nationality, photo and personal identifiers (passport, driving licence, voter ID).",
    sections: [
      { title: "Identity Details", icon: User, hint: "First / middle / last name, display name, gender." },
      { title: "Demographics", icon: Users, hint: "DOB, marital status, blood group, nationality, religion, category." },
      { title: "Personal Contact", icon: Mail, hint: "Personal email, mobile, alternate number." },
      { title: "Photo & Display", icon: LayoutDashboard, hint: "Profile photo, display name, communication preference." },
      { title: "Personal Identifiers", icon: ScrollText, hint: "Passport, driving licence, voter ID numbers." },
      { title: "Disability & Accessibility", icon: LifeBuoy, hint: "Physically disabled flag, disability details." },
    ],
  },
  {
    id: "job",
    label: "Job Details",
    icon: Briefcase,
    description:
      "Current employment terms and organizational placement — employment type, worker type, entity/branch/department/designation/grade, managers, work mode, business unit, cost center, probation & confirmation.",
    sections: [
      { title: "Employment Type", icon: Briefcase, hint: "Full-time/Part-time/Contract, worker type, on/off-roll." },
      { title: "Organizational Placement", icon: Building2, hint: "Entity, branch, department, designation, grade, location." },
      { title: "Probation & Confirmation", icon: ClipboardCheck, hint: "Status, start/end dates, confirmation date." },
      { title: "Notice Period", icon: Clock, hint: "Notice days, start date, last working date." },
      { title: "Reporting Structure", icon: Users, hint: "Reporting, functional and HR managers." },
      { title: "Work Configuration", icon: LayoutDashboard, hint: "Work mode, business unit, cost center." },
      { title: "Policy Assignments", icon: ScrollText, hint: "Leave / attendance / payroll / shift policies." },
    ],
  },
  {
    id: "contact",
    label: "Contact & Address",
    icon: MapPin,
    description:
      "Address book and emergency contacts — current & permanent addresses, official and personal contact channels, emergency contact(s), and communication preferences.",
    sections: [
      { title: "Current Address", icon: MapPin, hint: "Street, line 2, city, state, country, pincode, landmark." },
      { title: "Permanent Address", icon: MapPin, hint: "Same-as-current toggle, full permanent address." },
      { title: "Official Contact", icon: Mail, hint: "Official email, mobile, alternate number." },
      { title: "Personal Contact", icon: Mail, hint: "Personal email and personal mobile." },
      { title: "Emergency Contacts", icon: LifeBuoy, hint: "Name, relation, phone, alt phone, email, address." },
      { title: "Communication Preferences", icon: SlidersHorizontal, hint: "Email / SMS / WhatsApp opt-ins." },
    ],
  },
  {
    id: "family",
    label: "Family Details",
    icon: Users,
    description:
      "Family members, dependents and nominees — relationships, dates of birth, occupations, dependency status, and nominee allocation across PF/gratuity/insurance.",
    sections: [
      { title: "Family Members", icon: Users, hint: "Name, relation, DOB, occupation, contact." },
      { title: "Dependents", icon: User, hint: "Dependent flag, age, dependency type." },
      { title: "Nominees", icon: ShieldCheck, hint: "PF, gratuity, insurance nominee allocation %." },
      { title: "Spouse & Children", icon: Users, hint: "Marital partner & child records." },
    ],
  },
  {
    id: "education",
    label: "Education",
    icon: GraduationCap,
    description:
      "Academic qualifications and certifications — schooling, graduation, post-graduation, additional certifications, specializations and languages known.",
    sections: [
      { title: "Education Records", icon: GraduationCap, hint: "Institution, degree, specialisation, year, % / CGPA." },
      { title: "Certifications", icon: Award, hint: "Course, issuer, year, validity." },
      { title: "Specializations", icon: Target, hint: "Domain / skill specialisations." },
      { title: "Languages Known", icon: BookOpen, hint: "Language, read / write / speak proficiency." },
    ],
  },
  {
    id: "experience",
    label: "Experience",
    icon: Building2,
    description:
      "Previous employments and total experience — employer, designation, duration, reason for leaving, drawn salary, and gap analysis between roles.",
    sections: [
      { title: "Previous Employment", icon: Building2, hint: "Employer, designation, from-to, last drawn." },
      { title: "Total Experience", icon: Clock, hint: "Relevant & total years of experience." },
      { title: "Gap Analysis", icon: TrendingUp, hint: "Employment gaps and reasons." },
      { title: "Reporting History", icon: Users, hint: "Past managers at previous employers." },
    ],
  },
  {
    id: "bank",
    label: "Bank Details",
    icon: Landmark,
    description:
      "Bank account(s) used for payroll disbursement — primary account, holder details, IFSC, branch, account type, UPI ID, and historical bank account changes.",
    sections: [
      { title: "Primary Account", icon: Landmark, hint: "Bank, account no, IFSC, branch, type." },
      { title: "Account Holder", icon: User, hint: "Holder name, communication address proof." },
      { title: "UPI Details", icon: Wallet, hint: "UPI ID for reimbursements." },
      { title: "Bank History", icon: GitBranch, hint: "Past account changes with effective dates." },
      { title: "Bank Proof Documents", icon: FileText, hint: "Cancelled cheque / passbook upload." },
    ],
  },
  {
    id: "statutory",
    label: "Statutory Details",
    icon: ScrollText,
    description:
      "Statutory compliance information — PAN, Aadhaar, UAN, PF, ESI, Professional Tax, LWF, gratuity applicability, tax regime and TDS declaration status.",
    sections: [
      { title: "PAN", icon: ScrollText, hint: "PAN number, name on card, status." },
      { title: "Aadhaar", icon: ShieldCheck, hint: "Aadhaar number (masked), verified status." },
      { title: "UAN / PF", icon: Landmark, hint: "UAN, PF number, PF applicability." },
      { title: "ESI", icon: LifeBuoy, hint: "ESI number, dispensary, ESI applicability." },
      { title: "Professional Tax", icon: Receipt, hint: "PT location, applicability." },
      { title: "LWF & Gratuity", icon: ScrollText, hint: "LWF applicability, gratuity eligibility." },
      { title: "Tax Regime & TDS", icon: Wallet, hint: "Old / New regime, TDS declaration status." },
    ],
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    description:
      "Document vault for the employee — KYC, employment, education, payroll, statutory, exit, and company-issued letters with version history and expiry reminders.",
    sections: [
      { title: "KYC Documents", icon: ScrollText, hint: "PAN, Aadhaar, passport, DL, voter ID uploads." },
      { title: "Employment Documents", icon: Briefcase, hint: "Offer, appointment, increment, relieving letters." },
      { title: "Education Certificates", icon: GraduationCap, hint: "Degree, mark sheets, course certificates." },
      { title: "Payroll Documents", icon: Wallet, hint: "Payslips, Form 16, bank proof." },
      { title: "Company Letters", icon: Mail, hint: "Confirmation, promotion, transfer, warning letters." },
      { title: "Document Categories", icon: FileText, hint: "Personal / Employment / Statutory / Legal." },
    ],
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: Clock,
    description:
      "Daily attendance records, regularization, summary and trends — today's punch, monthly calendar, late/early marks, regularizations, overtime and attendance %.",
    sections: [
      { title: "Attendance Summary", icon: LayoutDashboard, hint: "Present, absent, late, WFH counts this month." },
      { title: "Today's Attendance", icon: Clock, hint: "Today's clock-in, clock-out, work hours, status." },
      { title: "Monthly Calendar", icon: CalendarDays, hint: "Color-coded daily attendance calendar." },
      { title: "Regularization Requests", icon: Inbox, hint: "Pending / approved regularizations." },
      { title: "Attendance Trends", icon: TrendingUp, hint: "7-day / 30-day present-vs-absent trend." },
      { title: "Overtime", icon: Clock, hint: "Approved OT hours for the period." },
    ],
  },
  {
    id: "leave",
    label: "Leave",
    icon: CalendarDays,
    description:
      "Leave entitlement, applications, balances and comp-off — opening, accrued, used, closing balance per leave type, application history, and leave calendar.",
    sections: [
      { title: "Leave Balance Summary", icon: CalendarDays, hint: "Per-type opening, accrued, used, closing." },
      { title: "Leave Applications", icon: Inbox, hint: "Recent applications with status." },
      { title: "Leave Policy", icon: ScrollText, hint: "Assigned leave policy & entitlement rules." },
      { title: "Comp-Off Balance", icon: Award, hint: "Earned comp-off leaves & expiry." },
      { title: "Leave Calendar", icon: CalendarDays, hint: "Approved / pending leaves overlaid on calendar." },
      { title: "Leave Trends", icon: TrendingUp, hint: "Leave usage over last 6 months." },
    ],
  },
  {
    id: "payroll",
    label: "Payroll",
    icon: Wallet,
    description:
      "Salary structure, monthly payslips, payroll inputs and deductions — current CTC breakdown, monthly net/gross, deductions (PF/ESI/PT/TDS), bank file status.",
    sections: [
      { title: "Salary Structure", icon: Wallet, hint: "Earnings & deductions component break-up." },
      { title: "Monthly Payslips", icon: FileText, hint: "Year-wise payslip downloads." },
      { title: "Payroll Inputs", icon: Inbox, hint: "Variable pay, reimbursement, one-time inputs." },
      { title: "Deductions", icon: Receipt, hint: "PF, ESI, PT, TDS, loan recovery summary." },
      { title: "Net Pay", icon: TrendingUp, hint: "Monthly net pay trend for the FY." },
      { title: "Bank File Status", icon: Landmark, hint: "Bank credit confirmation & bank file run." },
    ],
  },
  {
    id: "compensation",
    label: "Compensation History",
    icon: TrendingUp,
    description:
      "Salary revision history across the employee's tenure — current CTC, past revisions, component breakdown, promotion-linked revisions, annual increments and effective dates.",
    sections: [
      { title: "Current CTC", icon: Wallet, hint: "Annual CTC, gross, net, effective date." },
      { title: "Revision History", icon: GitBranch, hint: "All salary revisions with effective dates." },
      { title: "Component Breakdown", icon: Receipt, hint: "Basic, HRA, allowances, deductions per revision." },
      { title: "Promotion-linked Revisions", icon: TrendingUp, hint: "Revisions tied to promotions." },
      { title: "Annual Increments", icon: CalendarDays, hint: "Yearly increment cycle & %." },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    icon: Target,
    description:
      "Goals, KRAs/KPIs, appraisal cycles, ratings, 360-degree feedback and performance improvement plans (PIP) — full performance management lifecycle.",
    sections: [
      { title: "Current Goals", icon: Target, hint: "Active KPIs/KRAs with target vs actual." },
      { title: "Appraisal Cycles", icon: CalendarDays, hint: "Annual / half-yearly / quarterly cycles." },
      { title: "Performance Ratings", icon: Award, hint: "Final rating per cycle with normalization." },
      { title: "360 Feedback", icon: Users, hint: "Peer, manager, HR, client feedback." },
      { title: "PIP", icon: TrendingUp, hint: "Active PIP goals, review dates, decision." },
      { title: "Continuous Feedback", icon: Mail, hint: "On-the-fly feedback shared & received." },
    ],
  },
  {
    id: "skills",
    label: "Skills & Certifications",
    icon: Award,
    description:
      "Skill matrix, certifications and proficiency — employee skill mapping with rating, manager validation, skill gap analysis and recommended trainings.",
    sections: [
      { title: "Skill Matrix", icon: Award, hint: "Skill, rating, last assessed, manager validated." },
      { title: "Certifications", icon: ShieldCheck, hint: "Held certifications with validity & issuer." },
      { title: "Skill Gap Analysis", icon: Target, hint: "Required vs held skills per role." },
      { title: "Training Recommendations", icon: BookOpen, hint: "Suggested trainings based on gaps." },
      { title: "Manager Validation", icon: ClipboardCheck, hint: "Pending validations from manager." },
    ],
  },
  {
    id: "training",
    label: "Training",
    icon: BookOpen,
    description:
      "Learning & development records — assigned and completed trainings, course progress, training calendar, nominations, attendance and feedback.",
    sections: [
      { title: "Assigned Trainings", icon: BookOpen, hint: "Active course assignments & due dates." },
      { title: "Completed Trainings", icon: Award, hint: "Completed courses with score & cert." },
      { title: "Training Calendar", icon: CalendarDays, hint: "Upcoming sessions employee is nominated for." },
      { title: "Course Progress", icon: TrendingUp, hint: "% completion per active course." },
      { title: "Nominations", icon: Inbox, hint: "Pending nominations awaiting approval." },
      { title: "Feedback", icon: Mail, hint: "Post-training feedback submitted." },
    ],
  },
  {
    id: "assets",
    label: "Assets",
    icon: Laptop,
    description:
      "Company-issued assets — currently assigned assets, assignment history, asset requests, returns, and software licenses tied to the employee.",
    sections: [
      { title: "Current Assets", icon: Laptop, hint: "Assigned assets with code, serial, condition." },
      { title: "Asset History", icon: GitBranch, hint: "Past assignments with issue/return dates." },
      { title: "Asset Requests", icon: Inbox, hint: "Pending / approved / rejected requests." },
      { title: "Asset Returns", icon: LogOut, hint: "Scheduled returns during exit." },
      { title: "Software Licenses", icon: KeyRound, hint: "Software license seats assigned." },
    ],
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: Receipt,
    description:
      "Expense claims and reimbursements — pending/approved/rejected claims, line items, advances, settlements, and category-wise reports.",
    sections: [
      { title: "Pending Claims", icon: Inbox, hint: "Submitted claims awaiting approval." },
      { title: "Approved Claims", icon: Award, hint: "Approved claims awaiting payment." },
      { title: "Rejected Claims", icon: LogOut, hint: "Rejected claims with reason." },
      { title: "Advances", icon: Wallet, hint: "Travel / salary / project advances & balance." },
      { title: "Settlements", icon: Receipt, hint: "Settled claims & recovery." },
      { title: "Reports", icon: TrendingUp, hint: "Category-wise & monthly expense reports." },
    ],
  },
  {
    id: "helpdesk",
    label: "Helpdesk",
    icon: LifeBuoy,
    description:
      "Support tickets raised by or for the employee — open/closed tickets by category, SLA compliance, escalations and resolution feedback.",
    sections: [
      { title: "Open Tickets", icon: LifeBuoy, hint: "Tickets in Open / Assigned / In-progress." },
      { title: "Closed Tickets", icon: ShieldCheck, hint: "Resolved / closed tickets archive." },
      { title: "Ticket Categories", icon: SlidersHorizontal, hint: "HR / IT / Finance / Payroll / Admin / POSH." },
      { title: "SLA Compliance", icon: Clock, hint: "TAT adherence per ticket." },
      { title: "Escalations", icon: TrendingUp, hint: "Escalated tickets & reasons." },
    ],
  },
  {
    id: "requests",
    label: "Requests",
    icon: Inbox,
    description:
      "Profile update requests and self-service requests raised by the employee — pending/approved/rejected requests, field-level changes, and workflow status.",
    sections: [
      { title: "Pending Requests", icon: Inbox, hint: "Awaiting reviewer action." },
      { title: "Approved Requests", icon: Award, hint: "Approved & applied changes." },
      { title: "Rejected Requests", icon: LogOut, hint: "Rejected with reviewer comment." },
      { title: "Field Changes", icon: SlidersHorizontal, hint: "Old vs new value diff per request." },
      { title: "Workflow Status", icon: GitBranch, hint: "Current step & approver." },
    ],
  },
  {
    id: "letters",
    label: "Letters",
    icon: Mail,
    description:
      "Letters generated and issued to the employee — offer, appointment, confirmation, increment, promotion, transfer, warning, experience, relieving letters with digital signatures.",
    sections: [
      { title: "Issued Letters", icon: Mail, hint: "Letters issued to employee with PDF." },
      { title: "Letter Templates", icon: FileText, hint: "Available templates for this employee." },
      { title: "Pending Letters", icon: Inbox, hint: "Letters queued for issuance / approval." },
      { title: "Signatures", icon: ShieldCheck, hint: "Digital signatures applied." },
      { title: "Letter History", icon: GitBranch, hint: "Audit trail of generated letters." },
    ],
  },
  {
    id: "timeline",
    label: "Timeline",
    icon: GitBranch,
    description:
      "Lifecycle events and activity feed — joining, promotions, transfers, manager changes, salary revisions, probation, confirmation, document uploads, leave approvals, regularization, resignation and exit.",
    sections: [
      { title: "Lifecycle Events", icon: GitBranch, hint: "Major career milestones chronologically." },
      { title: "Career Milestones", icon: TrendingUp, hint: "Promotions, transfers, role changes." },
      { title: "Document Activity", icon: FileText, hint: "Uploads and document status changes." },
      { title: "Status Changes", icon: ShieldCheck, hint: "Employment status transitions." },
      { title: "Activity Feed", icon: Inbox, hint: "All timestamped activity entries." },
    ],
  },
  {
    id: "audit",
    label: "Audit History",
    icon: ShieldCheck,
    description:
      "Audit log of all changes to the employee record — recent changes, field-level audit, user activity, login audit and sensitive actions (salary change, status change, document download).",
    sections: [
      { title: "Recent Changes", icon: GitBranch, hint: "Latest field-level changes with user & timestamp." },
      { title: "Field-level Audit", icon: SlidersHorizontal, hint: "Old vs new for each modified field." },
      { title: "User Activity", icon: Users, hint: "Actions performed by users on this record." },
      { title: "Login Audit", icon: KeyRound, hint: "Employee login history & sessions." },
      { title: "Sensitive Actions", icon: Shield, hint: "Salary change, status change, document download." },
    ],
  },
  {
    id: "notes",
    label: "Notes",
    icon: StickyNote,
    description:
      "HR and manager notes against the employee — pinned notes, private notes, general notes and a chronological note history with author and timestamps.",
    sections: [
      { title: "HR Notes", icon: StickyNote, hint: "Notes added by HR team, visibility HR-only." },
      { title: "Manager Notes", icon: Users, hint: "Notes added by reporting manager." },
      { title: "Pinned Notes", icon: ShieldCheck, hint: "Important notes pinned to top." },
      { title: "Private Notes", icon: Lock, hint: "Private notes visible only to author." },
      { title: "Note History", icon: GitBranch, hint: "Full chronological note feed." },
    ],
  },
  {
    id: "probation",
    label: "Probation",
    icon: ClipboardCheck,
    description:
      "Probation tracking — probation period, start/end dates, confirmation status, probation reviews, extensions, and the probation appraisal.",
    sections: [
      { title: "Probation Period", icon: Clock, hint: "Start, end, duration in days." },
      { title: "Confirmation Status", icon: ShieldCheck, hint: "Confirmed / On Probation / Extended / Not Confirmed." },
      { title: "Probation Reviews", icon: ClipboardCheck, hint: "Scheduled review dates & outcomes." },
      { title: "Extension History", icon: GitBranch, hint: "Probation extensions with reason." },
      { title: "Probation Appraisal", icon: Target, hint: "Appraisal form tied to probation." },
    ],
  },
  {
    id: "transfer-promotion",
    label: "Transfer & Promotion",
    icon: ArrowLeftRight,
    description:
      "Career movements — transfer history (department/location/entity/manager changes), promotion history (designation/grade changes), lateral moves, and pending movements.",
    sections: [
      { title: "Transfer History", icon: ArrowLeftRight, hint: "Past transfers with from→to & date." },
      { title: "Promotion History", icon: TrendingUp, hint: "Past promotions with grade/designation change." },
      { title: "Lateral Moves", icon: ArrowLeftRight, hint: "Same-grade role changes." },
      { title: "Reporting Changes", icon: Users, hint: "Historical reporting manager changes." },
      { title: "Pending Movements", icon: Inbox, hint: "Approved-but-effective-future movements." },
    ],
  },
  {
    id: "exit",
    label: "Exit / Separation",
    icon: LogOut,
    description:
      "Offboarding lifecycle — resignation, notice period, exit clearance (HR/IT/Admin/Finance/Manager), exit interview, full & final settlement, and asset returns.",
    sections: [
      { title: "Resignation", icon: LogOut, hint: "Resignation date, reason, last working day." },
      { title: "Notice Period", icon: Clock, hint: "Notice start, end, buyout / waiver." },
      { title: "Clearance Checklist", icon: ClipboardCheck, hint: "HR / IT / Admin / Finance / Manager no-dues." },
      { title: "Exit Interview", icon: Mail, hint: "Interview form, feedback, rehire eligibility." },
      { title: "FnF Settlement", icon: Wallet, hint: "Leave encashment, recovery, gratuity, final salary." },
      { title: "Asset Returns", icon: Laptop, hint: "Outstanding assets pending return." },
    ],
  },
  {
    id: "login-access",
    label: "Login & Access",
    icon: KeyRound,
    description:
      "System access — login credentials, active sessions, password policy compliance, 2FA status, access history and last login details.",
    sections: [
      { title: "Login Credentials", icon: KeyRound, hint: "Username, official email, status (active/locked)." },
      { title: "Active Sessions", icon: Users, hint: "Active login sessions & devices." },
      { title: "Password Policy", icon: Shield, hint: "Last changed, expiry, history count." },
      { title: "2FA Status", icon: ShieldCheck, hint: "Enabled/disabled, method, last verified." },
      { title: "Access History", icon: GitBranch, hint: "Successful / failed login attempts." },
      { title: "Last Login", icon: Clock, hint: "Last login timestamp, IP, device." },
    ],
  },
  {
    id: "roles",
    label: "Roles & Permissions",
    icon: Shield,
    description:
      "RBAC for the employee — assigned roles, permission matrix per module, data scope (own / team / department / location / entity / org), and field-level access overrides.",
    sections: [
      { title: "Assigned Roles", icon: Shield, hint: "Primary and secondary roles mapped." },
      { title: "Permissions Matrix", icon: SlidersHorizontal, hint: "View / Create / Edit / Delete per module." },
      { title: "Data Scope", icon: Users, hint: "Own / team / dept / location / entity / org." },
      { title: "Field-level Access", icon: ShieldCheck, hint: "Sensitive field visibility (salary etc.)." },
      { title: "Role History", icon: GitBranch, hint: "Role assignment / revocation timeline." },
    ],
  },
  {
    id: "custom-fields",
    label: "Custom Fields",
    icon: SlidersHorizontal,
    description:
      "Tenant-specific custom fields captured for the employee — custom field values grouped by section, custom categories, and any custom reports that use these fields.",
    sections: [
      { title: "Custom Field Values", icon: SlidersHorizontal, hint: "All captured custom fields with value." },
      { title: "Custom Sections", icon: LayoutDashboard, hint: "Grouped custom field sections." },
      { title: "Field Categories", icon: FileText, hint: "Categories custom fields belong to." },
      { title: "Custom Reports", icon: TrendingUp, hint: "Reports leveraging custom fields." },
    ],
  },
  {
    id: "forms",
    label: "Forms",
    icon: ClipboardList,
    description:
      "Custom form submissions — submitted forms, pending forms, available form templates the employee can fill, and submission history with audit trail.",
    sections: [
      { title: "Submitted Forms", icon: ClipboardList, hint: "Forms submitted by / for the employee." },
      { title: "Pending Forms", icon: Inbox, hint: "Forms awaiting submission by employee." },
      { title: "Available Forms", icon: FileText, hint: "Form templates assignable to this employee." },
      { title: "Form Templates", icon: SlidersHorizontal, hint: "Tenant-wide custom form library." },
      { title: "Submission History", icon: GitBranch, hint: "Version history of form submissions." },
    ],
  },
]

// Sanity guard — keep the contract honest.
export const PROFILE_TAB_IDS = PROFILE_TABS.map((t) => t.id)
export const PROFILE_TAB_COUNT = PROFILE_TABS.length

// ----------------------------------------------------------------
// Role-based tab visibility.
// Phase 2 currently defaults to showing ALL tabs (no auth wired
// yet). This map is structured for future RBAC enforcement: each
// role lists the tab ids it is allowed to see. Use getVisibleTabs()
// to resolve the visible set for a given role.
// ----------------------------------------------------------------
export const TAB_VISIBILITY: Record<EmployeeRole, "all" | string[]> = {
  "Super Admin": "all",
  "Organization Admin": "all",
  "HR Admin": "all",
  "Payroll Admin": [
    "overview", "personal", "job", "bank", "statutory", "payroll",
    "compensation", "documents", "timeline", "audit", "notes",
    "login-access", "custom-fields",
  ],
  "Finance Admin": [
    "overview", "job", "bank", "statutory", "payroll", "compensation",
    "expenses", "documents", "timeline", "audit",
  ],
  "Department Head": [
    "overview", "personal", "job", "contact", "attendance", "leave",
    "performance", "skills", "training", "timeline", "notes",
    "transfer-promotion", "probation",
  ],
  "Reporting Manager": [
    "overview", "personal", "job", "contact", "attendance", "leave",
    "performance", "skills", "training", "timeline", "notes",
    "transfer-promotion", "probation",
  ],
  Employee: [
    "overview", "personal", "job", "contact", "family", "education",
    "documents", "attendance", "leave", "payroll", "skills", "training",
    "assets", "expenses", "helpdesk", "requests", "letters", "timeline",
  ],
  Recruiter: ["overview", "personal", "job", "documents", "timeline"],
  "IT Admin": [
    "overview", "personal", "job", "assets", "login-access", "roles",
    "audit", "timeline",
  ],
  Auditor: [
    "overview", "job", "audit", "timeline", "notes", "transfer-promotion",
    "exit", "login-access", "roles",
  ],
}

export function getVisibleTabs(role: EmployeeRole | string | undefined): ProfileTab[] {
  const r = (role || "HR Admin") as EmployeeRole
  const vis = TAB_VISIBILITY[r] ?? "all"
  if (vis === "all") return PROFILE_TABS
  const allowed = new Set(vis)
  return PROFILE_TABS.filter((t) => allowed.has(t.id))
}
