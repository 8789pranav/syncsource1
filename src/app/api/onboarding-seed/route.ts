import { ok, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"

// POST /api/onboarding-seed — seeds demo logs + default settings + sample doc/email/checklist templates
// Idempotent: only seeds if tables are empty.
export async function POST() {
  const tenantId = await ensureTenant()
  const now = new Date()

  // 1. Default settings — General tab
  const existingSettings = await db.onboardingSetting.count({ where: { tenantId } })
  if (existingSettings === 0) {
    const defaults: Record<string, Record<string, any>> = {
      general: {
        enableOnboardingModule: true,
        enableCandidateOnboarding: true,
        enableEmployeeOnboarding: true,
        enableBulkCandidateUpload: true,
        enableRehireOnboarding: false,
        enableInternalTransferOnboarding: false,
        allowSaveAsDraft: true,
        allowDeleteDraftCandidate: true,
      },
      candidate: {
        candidateIdAutoGenerate: true,
        candidateIdPrefix: "CAND",
        candidateIdFormat: "CAND-{YYYY}-{####}",
        duplicateCheckByEmail: true,
        duplicateCheckByMobile: true,
        allowCandidateEditAfterSubmit: false,
        allowHrEditCandidateData: true,
        candidatePortalExpiryDays: 30,
      },
      kanban: {
        allowCustomKanbanBoard: true,
        allowEntityWiseBoard: true,
        allowWorkflowWiseBoard: true,
        allowStageRename: true,
        allowStageReorder: true,
        allowMandatoryStage: true,
        allowStageSkip: false,
        allowStageSla: true,
        allowAutoStageMovement: true,
        allowManualStageMovement: true,
        allowDragAndDrop: true,
        requireReasonForManualStageMove: false,
      },
      workflow: {
        allowMultipleWorkflows: true,
        allowEntityWiseWorkflow: true,
        allowDepartmentWiseWorkflow: true,
        allowEmployeeTypeWiseWorkflow: true,
        allowWorkModeWiseWorkflow: true,
        allowWorkflowPriority: true,
        allowWorkflowVersioning: true,
        allowCloneWorkflow: true,
        allowArchiveWorkflow: true,
        allowWorkflowPublishApproval: false,
        conflictHandling: "Highest Priority Wins",
      },
      document: {
        allowDocumentLibrary: true,
        allowEntityWiseDocumentTemplate: true,
        allowWorkflowWiseDocumentTemplate: true,
        allowCustomDocumentType: true,
        allowESign: true,
        allowTemplateVersioning: true,
        allowedFileTypes: "pdf,docx,jpg,png",
        maximumFileSize: 10,
        documentVerificationRequired: true,
        documentExpiryTracking: true,
        blockOnboardingIfMandatoryDocumentMissing: true,
      },
      email: {
        enableEmailNotifications: true,
        enableEntityWiseEmailTemplates: true,
        enableWorkflowWiseEmailTemplates: true,
        enableStageWiseEmailRules: true,
        enableReminderEmails: true,
        enableEscalationEmails: true,
        enableEmailLogs: true,
        enableRetryFailedEmails: true,
        defaultFromEmail: "onboarding@acme.com",
        defaultReplyToEmail: "hr@acme.com",
        sendMode: "Queue",
        retryCount: 3,
        retryInterval: 60,
      },
      verification: {
        enableDocumentVerification: true,
        enableFormVerification: true,
        enableBankVerification: true,
        enableIdentityVerification: true,
        enableBackgroundVerification: true,
        enableEducationVerification: true,
        enableExperienceVerification: true,
        allowSendBackForCorrection: true,
        requireVerificationRemarks: true,
        correctionAttemptLimit: 2,
      },
      approval: {
        enableApprovalWorkflow: true,
        offerApprovalRequired: true,
        documentApprovalRequired: false,
        formApprovalRequired: false,
        salaryApprovalRequired: true,
        employeeConversionApprovalRequired: true,
        allowRoleBasedApprover: true,
        allowMultiLevelApproval: true,
        allowParallelApproval: false,
        allowDelegation: true,
        allowEscalation: true,
      },
      candidate_portal: {
        enableCandidatePortal: true,
        requireOtpLogin: true,
        requireEmailVerification: true,
        requireMobileVerification: false,
        showProgressTracker: true,
        showDocuments: true,
        showForms: true,
        showOfferLetter: true,
        showChecklist: true,
        showHrContact: true,
        showFaq: true,
        allowCandidateDownloadDocuments: true,
        allowCandidateSaveAsDraft: true,
        allowCandidateCorrectionAfterRejection: true,
      },
      employee_conversion: {
        generateEmployeeCode: true,
        createEmployeeProfile: true,
        createEmployeeDraftFirst: true,
        createLogin: true,
        activateLoginOnJoiningDate: true,
        assignRole: true,
        assignReportingManager: true,
        assignLeaveRule: true,
        assignAttendancePolicy: true,
        assignShift: true,
        assignWeeklyOff: true,
        assignHolidayCalendar: true,
        assignPayrollGroup: true,
        assignSalaryStructure: true,
        assignAssets: true,
        blockConversionIfMandatoryDataMissing: true,
        blockConversionIfVerificationPending: true,
        blockConversionIfApprovalPending: true,
      },
      audit: {
        logAllActions: true,
        logIpAndDevice: true,
        retainLogsForDays: 365,
        enableAuditTrailExport: true,
      },
      import_export: {
        allowBulkImport: true,
        allowBulkExport: true,
        importTemplate: "Standard",
      },
      template: {
        allowTemplateVersioning: true,
        allowTemplateSharing: false,
        defaultLanguage: "en",
      },
      checklist: {
        allowCustomChecklist: true,
        allowEntityWiseChecklist: true,
        allowDepartmentWiseChecklist: true,
        allowChecklistVersioning: true,
      },
    }

    for (const [category, kv] of Object.entries(defaults)) {
      for (const [key, value] of Object.entries(kv)) {
        await db.onboardingSetting.create({
          data: { tenantId, category, key, value: JSON.stringify(value) },
        })
      }
    }
  }

  // 2. Sample document templates
  const existingDocs = await db.onboardingDocumentTemplate.count({ where: { tenantId } })
  if (existingDocs === 0) {
    const sampleDocs = [
      {
        name: "Standard Offer Letter", code: "OFFER_STD", documentType: "Offer Letter",
        bodyHtml: "<p>Dear {{CandidateName}},</p><p>We are pleased to offer you the position of {{Designation}} at {{EntityName}}, {{Location}}. Your joining date will be {{JoiningDate}} and your annual CTC will be {{CTC}} {{SalaryCurrency}}.</p><p>Please review the attached terms and confirm your acceptance by {{OfferExpiryDate}}.</p><p>Warm regards,<br/>{{AuthorizedSignatory}}<br/>{{SignatoryDesignation}}, {{CompanyName}}</p>",
        variablesUsed: "CandidateName,Designation,EntityName,Location,JoiningDate,CTC,SalaryCurrency,OfferExpiryDate,AuthorizedSignatory,SignatoryDesignation,CompanyName",
        isDefault: true,
      },
      {
        name: "Standard Appointment Letter", code: "APPT_STD", documentType: "Appointment Letter",
        bodyHtml: "<p>Dear {{CandidateName}},</p><p>This is to formally appoint you as {{Designation}} in the {{Department}} department at {{EntityName}} effective {{JoiningDate}}.</p><p>Your probation period will be {{ProbationPeriod}} months. Please refer to the company policies for further details.</p><p>Sincerely,<br/>{{HRManager}}<br/>{{CompanyName}}</p>",
        variablesUsed: "CandidateName,Designation,Department,EntityName,JoiningDate,ProbationPeriod,HRManager,CompanyName",
        isDefault: true,
      },
      {
        name: "Mutual NDA", code: "NDA_STD", documentType: "NDA",
        bodyHtml: "<p>This Non-Disclosure Agreement is entered into between {{CompanyName}} (\"Company\") and {{CandidateName}} (\"Recipient\") on {{CurrentDate}}.</p><p>The Recipient agrees to keep confidential all proprietary information disclosed during the course of employment.</p><p>Signed:<br/>{{CandidateName}}<br/>{{AuthorizedSignatory}}</p>",
        variablesUsed: "CompanyName,CandidateName,CurrentDate,AuthorizedSignatory",
        isDefault: true,
      },
    ]
    for (const d of sampleDocs) {
      await db.onboardingDocumentTemplate.create({ data: { tenantId, ...d } })
    }
  }

  // 3. Sample email templates
  const existingEmails = await db.onboardingEmailTemplate.count({ where: { tenantId } })
  if (existingEmails === 0) {
    const sampleEmails = [
      {
        name: "Candidate Invite — Default", code: "EMAIL_INVITE", eventType: "Candidate Invite",
        subject: "Welcome to {{CompanyName}} — Complete your onboarding",
        bodyHtml: "<p>Hi {{CandidateName}},</p><p>Welcome to {{CompanyName}}! Please complete your onboarding form by visiting: <a href=\"{{PortalLink}}\">{{PortalLink}}</a></p><p>If you have any questions, reach out to {{HROwner}}.</p>",
        recipients: JSON.stringify({ to: [{ type: "candidate" }], cc: [{ type: "hr_owner" }] }),
        isDefault: true,
      },
      {
        name: "Document Upload Reminder", code: "EMAIL_DOC_REMINDER", eventType: "Document Pending",
        subject: "Reminder: {{DocumentName}} pending submission",
        bodyHtml: "<p>Hi {{CandidateName}},</p><p>This is a reminder to upload your {{DocumentName}}. Please log in to the candidate portal: {{PortalLink}}</p>",
        recipients: JSON.stringify({ to: [{ type: "candidate" }] }),
        isDefault: true,
      },
      {
        name: "Welcome Email — Day 1", code: "EMAIL_WELCOME", eventType: "Welcome Email",
        subject: "Welcome aboard, {{CandidateName}}!",
        bodyHtml: "<p>Hi {{CandidateName}},</p><p>Welcome to {{CompanyName}}! We're thrilled to have you join the {{Department}} team as {{Designation}}. Your reporting manager is {{ReportingManager}}.</p><p>Here's to a great journey ahead!</p>",
        recipients: JSON.stringify({ to: [{ type: "candidate" }], cc: [{ type: "reporting_manager" }, { type: "hr_owner" }] }),
        isDefault: true,
      },
    ]
    for (const e of sampleEmails) {
      await db.onboardingEmailTemplate.create({ data: { tenantId, ...e } })
    }
  }

  // 4. Sample checklists
  const existingChecklists = await db.onboardingChecklist.count({ where: { tenantId } })
  if (existingChecklists === 0) {
    await db.onboardingChecklist.create({
      data: {
        tenantId, name: "Standard HR Checklist", code: "CHK_HR_STD", category: "HR",
        description: "Standard HR tasks for every new hire", isDefault: true,
        tasks: {
          create: [
            { tenantId, name: "Create employee profile", code: "HR_EMP_PROFILE", ownerType: "hr_owner", dueDateRule: "on_joining", priority: "High", isMandatory: true, isBlocking: true, order: 0 },
            { tenantId, name: "Issue employee code", code: "HR_EMP_CODE", ownerType: "hr_owner", dueDateRule: "on_joining", priority: "High", isMandatory: true, isBlocking: true, order: 1 },
            { tenantId, name: "Open payroll record", code: "HR_PAYROLL", ownerType: "payroll_admin", dueDateRule: "after_joining_X", dueDateOffset: 1, priority: "Medium", isMandatory: true, order: 2 },
            { tenantId, name: "Share welcome kit", code: "HR_WELCOME_KIT", ownerType: "hr_owner", dueDateRule: "on_joining", priority: "Low", order: 3 },
          ],
        },
      },
    })

    await db.onboardingChecklist.create({
      data: {
        tenantId, name: "IT Setup Checklist", code: "CHK_IT_STD", category: "IT",
        description: "IT provisioning for new joiners", isDefault: true,
        tasks: {
          create: [
            { tenantId, name: "Create email account", code: "IT_EMAIL", ownerType: "it_admin", dueDateRule: "before_joining_X", dueDateOffset: 2, priority: "High", isMandatory: true, isBlocking: true, order: 0 },
            { tenantId, name: "Provision laptop", code: "IT_LAPTOP", ownerType: "it_admin", dueDateRule: "before_joining_X", dueDateOffset: 1, priority: "High", isMandatory: true, isBlocking: true, order: 1 },
            { tenantId, name: "Grant system access", code: "IT_ACCESS", ownerType: "it_admin", dueDateRule: "on_joining", priority: "High", isMandatory: true, order: 2 },
            { tenantId, name: "Configure VPN", code: "IT_VPN", ownerType: "it_admin", dueDateRule: "on_joining", priority: "Medium", order: 3 },
          ],
        },
      },
    })
  }

  // 5. Demo logs (only if no logs exist)
  const existingLogs = await db.onboardingLog.count({ where: { tenantId } })
  if (existingLogs === 0) {
    const candidate = await db.onboardingCandidate.findFirst({ where: { tenantId } })
    const candName = candidate?.candidateName || "Demo Candidate"
    const candId = candidate?.id

    const demoLogs = [
      { logType: "Candidate Activity", candidateId: candId, candidateName: candName, actionType: "Candidate Created", performedByName: "HR Admin", role: "HR", status: "Success", remarks: "Created via Add Candidate form" },
      { logType: "Workflow", candidateId: candId, candidateName: candName, actionType: "Workflow Assigned", oldValue: null, newValue: "Standard Onboarding", performedByName: "HR Admin", role: "HR", status: "Success" },
      { logType: "Stage Movement", candidateId: candId, candidateName: candName, actionType: "Moved to Application Received", oldValue: null, newValue: "Application Received", performedByName: "System", role: "System", status: "Success" },
      { logType: "Email", candidateId: candId, candidateName: candName, actionType: "Invite Sent", performedByName: "System", role: "System", status: "Success", remarks: "Candidate Invite template" },
      { logType: "Document", candidateId: candId, candidateName: candName, actionType: "Document Requested", newValue: "Offer Letter, ID Proof, Address Proof", performedByName: "HR Admin", role: "HR", status: "Success" },
      { logType: "Checklist", candidateId: candId, candidateName: candName, actionType: "Checklist Assigned", newValue: "Standard HR Checklist", performedByName: "System", role: "System", status: "Success" },
      { logType: "Verification", candidateId: candId, candidateName: candName, actionType: "Document Verification Pending", performedByName: "HR Admin", role: "HR", status: "Warning" },
      { logType: "System", actionType: "Onboarding Module Enabled", performedByName: "Admin", role: "Admin", status: "Success" },
    ]

    for (let i = 0; i < demoLogs.length; i++) {
      const log = demoLogs[i]
      const ts = new Date(now.getTime() - (demoLogs.length - i) * 60 * 60 * 1000)
      await db.onboardingLog.create({
        data: {
          tenantId,
          ...log,
          ipAddress: "192.168.1.10" + (i % 5),
          device: "Chrome on Windows",
          createdAt: ts,
        },
      })
    }
  }

  return ok({ seeded: true })
}
