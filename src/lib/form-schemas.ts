// Default dynamic form schemas for each module.
// These are used when no DB override (FormSchema) exists. Admins can clone & edit via the Form Builder.

import { FormSchema } from "./types"

function id(p: string) { return `${p}-${Math.random().toString(36).slice(2, 9)}` }

// ============================================================
// EMPLOYEE
// ============================================================

export const employeeFormSchema: FormSchema = {
  code: "employee-default",
  name: "Add Employee",
  module: "employee",
  description: "Dynamic form for creating a new employee record.",
  sections: [
    {
      id: "sec-basic",
      title: "Basic Details",
      description: "Personal & identity information",
      fields: [
        { id: id("f"), key: "employeeCode", label: "Employee Code", type: "text", placeholder: "EMP-0001", width: "half", validation: { required: true, maxLength: 20 }, helpText: "Unique identifier for the employee" },
        { id: id("f"), key: "firstName", label: "First Name", type: "text", placeholder: "Aarav", width: "half", validation: { required: true } },
        { id: id("f"), key: "middleName", label: "Middle Name", type: "text", width: "half" },
        { id: id("f"), key: "lastName", label: "Last Name", type: "text", placeholder: "Sharma", width: "half", validation: { required: true } },
        { id: id("f"), key: "gender", label: "Gender", type: "select", width: "half", options: [
          { label: "Male", value: "Male" }, { label: "Female", value: "Female" }, { label: "Other", value: "Other" },
        ] },
        { id: id("f"), key: "dateOfBirth", label: "Date of Birth", type: "date", width: "half" },
        { id: id("f"), key: "maritalStatus", label: "Marital Status", type: "select", width: "half", options: [
          { label: "Single", value: "Single" }, { label: "Married", value: "Married" }, { label: "Divorced", value: "Divorced" }, { label: "Widowed", value: "Widowed" },
        ] },
        { id: id("f"), key: "bloodGroup", label: "Blood Group", type: "select", width: "half", options: [
          { label: "A+", value: "A+" }, { label: "A-", value: "A-" }, { label: "B+", value: "B+" }, { label: "B-", value: "B-" },
          { label: "O+", value: "O+" }, { label: "O-", value: "O-" }, { label: "AB+", value: "AB+" }, { label: "AB-", value: "AB-" },
        ] },
        { id: id("f"), key: "personalEmail", label: "Personal Email", type: "email", width: "half", validation: { pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" } },
        { id: id("f"), key: "mobileNumber", label: "Mobile Number", type: "phone", width: "half", validation: { required: true } },
      ],
    },
    {
      id: "sec-employment",
      title: "Employment Details",
      description: "Job & organizational assignment",
      fields: [
        { id: id("f"), key: "dateOfJoining", label: "Date of Joining", type: "date", width: "half", validation: { required: true } },
        { id: id("f"), key: "employmentType", label: "Employment Type", type: "select", width: "half", defaultValue: "Full-time", options: [
          { label: "Full-time", value: "Full-time" }, { label: "Part-time", value: "Part-time" }, { label: "Contract", value: "Contract" }, { label: "Intern", value: "Intern" },
          { label: "Consultant", value: "Consultant" }, { label: "Apprentice", value: "Apprentice" }, { label: "Temporary", value: "Temporary" },
        ] },
        { id: id("f"), key: "entityId", label: "Entity", type: "entity", width: "half", endpoint: "/api/entities" },
        { id: id("f"), key: "branchId", label: "Branch", type: "select", width: "half", endpoint: "/api/branches" },
        { id: id("f"), key: "departmentId", label: "Department", type: "department", width: "half", endpoint: "/api/departments" },
        { id: id("f"), key: "designationId", label: "Designation", type: "designation", width: "half", endpoint: "/api/designations" },
        { id: id("f"), key: "gradeId", label: "Grade / Band", type: "grade", width: "half", endpoint: "/api/grades" },
        { id: id("f"), key: "locationId", label: "Location", type: "location", width: "half", endpoint: "/api/locations" },
        { id: id("f"), key: "reportingManagerId", label: "Reporting Manager", type: "employee", width: "half", endpoint: "/api/employees/picker" },
        { id: id("f"), key: "functionalManagerId", label: "Functional Manager", type: "employee", width: "half", endpoint: "/api/employees/picker" },
        { id: id("f"), key: "hrManagerId", label: "HR Manager", type: "employee", width: "half", endpoint: "/api/employees/picker" },
        { id: id("f"), key: "probationStatus", label: "Probation Status", type: "select", width: "half", options: [
          { label: "On Probation", value: "On Probation" }, { label: "Confirmed", value: "Confirmed" }, { label: "Extended", value: "Extended" }, { label: "Not Confirmed", value: "Not Confirmed" }, { label: "N/A", value: "" },
        ] },
        { id: id("f"), key: "probationEndDate", label: "Probation End Date", type: "date", width: "half", visibilityConditions: [{ field: "probationStatus", operator: "eq", value: "On Probation" }] },
        { id: id("f"), key: "noticePeriod", label: "Notice Period (days)", type: "number", width: "half", defaultValue: 30 },
        { id: id("f"), key: "employeeStatus", label: "Employee Status", type: "select", width: "half", defaultValue: "Active", options: [
          { label: "Active", value: "Active" }, { label: "On Notice", value: "On Notice" }, { label: "Resigned", value: "Resigned" }, { label: "Terminated", value: "Terminated" }, { label: "Inactive", value: "Inactive" },
        ] },
      ],
    },
    {
      id: "sec-compensation",
      title: "Compensation",
      description: "Salary & CTC details",
      fields: [
        { id: id("f"), key: "ctc", label: "Annual CTC", type: "currency", unit: "₹", width: "half" },
        { id: id("f"), key: "basicSalary", label: "Basic Salary (annual)", type: "currency", unit: "₹", width: "half" },
        { id: id("f"), key: "hra", label: "HRA (annual)", type: "currency", unit: "₹", width: "half" },
      ],
    },
    {
      id: "sec-bank",
      title: "Bank Details",
      fields: [
        { id: id("f"), key: "bankName", label: "Bank Name", type: "text", width: "half" },
        { id: id("f"), key: "accountNumber", label: "Account Number", type: "text", width: "half" },
        { id: id("f"), key: "ifscCode", label: "IFSC Code", type: "text", width: "half" },
        { id: id("f"), key: "branchName", label: "Branch Name", type: "text", width: "half" },
      ],
    },
    {
      id: "sec-statutory",
      title: "Statutory Details",
      fields: [
        { id: id("f"), key: "panNumber", label: "PAN", type: "text", width: "half", validation: { pattern: "^[A-Z]{5}[0-9]{4}[A-Z]{1}$" } },
        { id: id("f"), key: "aadhaarNumber", label: "Aadhaar", type: "text", width: "half" },
        { id: id("f"), key: "uanNumber", label: "UAN", type: "text", width: "half" },
        { id: id("f"), key: "pfNumber", label: "PF Number", type: "text", width: "half" },
      ],
    },
    {
      id: "sec-address",
      title: "Address",
      fields: [
        { id: id("f"), key: "currentAddress", label: "Current Address", type: "textarea", width: "full" },
        { id: id("f"), key: "permanentAddress", label: "Permanent Address", type: "textarea", width: "full" },
      ],
    },
  ],
}

// ============================================================
// EMPLOYEE — FULL FORM (Phase 2: comprehensive form with all fields)
// ============================================================

export const employeeFullFormSchema: FormSchema = {
  code: "employee-full",
  name: "Employee Full Form",
  module: "employee",
  description: "Comprehensive employee form covering all sections: personal, identity, employment, organization, policy assignments, bank, statutory, addresses, emergency contact, compensation.",
  sections: [
    {
      id: "sec-basic",
      title: "Basic Details",
      description: "Personal & identity information",
      fields: [
        { id: id("f"), key: "employeeCode", label: "Employee Code", type: "text", placeholder: "EMP-0001", width: "half", validation: { required: true, maxLength: 20 }, helpText: "Unique identifier for the employee" },
        { id: id("f"), key: "firstName", label: "First Name", type: "text", placeholder: "Aarav", width: "half", validation: { required: true } },
        { id: id("f"), key: "middleName", label: "Middle Name", type: "text", width: "half" },
        { id: id("f"), key: "lastName", label: "Last Name", type: "text", placeholder: "Sharma", width: "half", validation: { required: true } },
        { id: id("f"), key: "displayName", label: "Display Name", type: "text", width: "half", placeholder: "Aarav Sharma" },
        { id: id("f"), key: "gender", label: "Gender", type: "select", width: "half", options: [
          { label: "Male", value: "Male" }, { label: "Female", value: "Female" }, { label: "Other", value: "Other" },
        ] },
        { id: id("f"), key: "dateOfBirth", label: "Date of Birth", type: "date", width: "half" },
        { id: id("f"), key: "maritalStatus", label: "Marital Status", type: "select", width: "half", options: [
          { label: "Single", value: "Single" }, { label: "Married", value: "Married" }, { label: "Divorced", value: "Divorced" }, { label: "Widowed", value: "Widowed" },
        ] },
        { id: id("f"), key: "bloodGroup", label: "Blood Group", type: "select", width: "half", options: [
          { label: "A+", value: "A+" }, { label: "A-", value: "A-" }, { label: "B+", value: "B+" }, { label: "B-", value: "B-" },
          { label: "O+", value: "O+" }, { label: "O-", value: "O-" }, { label: "AB+", value: "AB+" }, { label: "AB-", value: "AB-" },
        ] },
        { id: id("f"), key: "nationality", label: "Nationality", type: "text", width: "half", defaultValue: "Indian" },
        { id: id("f"), key: "religion", label: "Religion", type: "select", width: "half", options: [
          { label: "Hindu", value: "Hindu" }, { label: "Muslim", value: "Muslim" }, { label: "Christian", value: "Christian" },
          { label: "Sikh", value: "Sikh" }, { label: "Jain", value: "Jain" }, { label: "Buddhist", value: "Buddhist" }, { label: "Other", value: "Other" },
        ] },
        { id: id("f"), key: "category", label: "Category", type: "select", width: "half", options: [
          { label: "General", value: "General" }, { label: "OBC", value: "OBC" }, { label: "SC", value: "SC" }, { label: "ST", value: "ST" },
        ] },
        { id: id("f"), key: "profilePhotoUrl", label: "Profile Photo URL", type: "url", width: "half" },
        { id: id("f"), key: "personalEmail", label: "Personal Email", type: "email", width: "half", validation: { pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" } },
        { id: id("f"), key: "officialEmail", label: "Official Email", type: "email", width: "half", validation: { pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" } },
        { id: id("f"), key: "mobileNumber", label: "Mobile Number", type: "phone", width: "half", validation: { required: true } },
        { id: id("f"), key: "alternateNumber", label: "Alternate Number", type: "phone", width: "half" },
      ],
    },
    {
      id: "sec-identity",
      title: "Identity Documents",
      description: "Government-issued identity numbers",
      fields: [
        { id: id("f"), key: "passportNumber", label: "Passport Number", type: "text", width: "half", placeholder: "P1234567" },
        { id: id("f"), key: "drivingLicense", label: "Driving License", type: "text", width: "half" },
        { id: id("f"), key: "voterId", label: "Voter ID", type: "text", width: "half" },
        { id: id("f"), key: "physicallyDisabled", label: "Physically Disabled", type: "switch", width: "half", defaultValue: false },
        { id: id("f"), key: "disabilityDetails", label: "Disability Details", type: "textarea", width: "full", visibilityConditions: [{ field: "physicallyDisabled", operator: "eq", value: true }] },
      ],
    },
    {
      id: "sec-employment",
      title: "Employment Details",
      description: "Job & probation",
      fields: [
        { id: id("f"), key: "dateOfJoining", label: "Date of Joining", type: "date", width: "half", validation: { required: true } },
        { id: id("f"), key: "employmentType", label: "Employment Type", type: "select", width: "half", defaultValue: "Full-time", options: [
          { label: "Full-time", value: "Full-time" }, { label: "Part-time", value: "Part-time" }, { label: "Contract", value: "Contract" }, { label: "Intern", value: "Intern" },
          { label: "Consultant", value: "Consultant" }, { label: "Apprentice", value: "Apprentice" }, { label: "Temporary", value: "Temporary" },
        ] },
        { id: id("f"), key: "workerType", label: "Worker Type", type: "select", width: "half", defaultValue: "Permanent", options: [
          { label: "Permanent", value: "Permanent" }, { label: "Contract", value: "Contract" }, { label: "Consultant", value: "Consultant" }, { label: "Temporary", value: "Temporary" },
        ] },
        { id: id("f"), key: "jobType", label: "Job Type", type: "select", width: "half", options: [
          { label: "On-roll", value: "On-roll" }, { label: "Off-roll", value: "Off-roll" },
        ] },
        { id: id("f"), key: "probationStatus", label: "Probation Status", type: "select", width: "half", options: [
          { label: "On Probation", value: "On Probation" }, { label: "Confirmed", value: "Confirmed" }, { label: "Extended", value: "Extended" }, { label: "Not Confirmed", value: "Not Confirmed" },
        ] },
        { id: id("f"), key: "probationStartDate", label: "Probation Start Date", type: "date", width: "half", visibilityConditions: [{ field: "probationStatus", operator: "eq", value: "On Probation" }] },
        { id: id("f"), key: "probationEndDate", label: "Probation End Date", type: "date", width: "half", visibilityConditions: [{ field: "probationStatus", operator: "eq", value: "On Probation" }] },
        { id: id("f"), key: "confirmationDate", label: "Confirmation Date", type: "date", width: "half" },
        { id: id("f"), key: "noticePeriod", label: "Notice Period (days)", type: "number", width: "half", defaultValue: 30 },
        { id: id("f"), key: "noticePeriodStartDate", label: "Notice Period Start Date", type: "date", width: "half" },
        { id: id("f"), key: "lastWorkingDate", label: "Last Working Date", type: "date", width: "half" },
        { id: id("f"), key: "employeeStatus", label: "Employee Status", type: "select", width: "half", defaultValue: "Active", options: [
          { label: "Active", value: "Active" }, { label: "On Notice", value: "On Notice" }, { label: "Resigned", value: "Resigned" }, { label: "Terminated", value: "Terminated" }, { label: "Absconded", value: "Absconded" }, { label: "Retired", value: "Retired" }, { label: "Inactive", value: "Inactive" }, { label: "Alumni", value: "Alumni" },
        ] },
        { id: id("f"), key: "workMode", label: "Work Mode", type: "select", width: "half", defaultValue: "Work from office", options: [
          { label: "Work from office", value: "Work from office" }, { label: "Work from home", value: "Work from home" }, { label: "Hybrid", value: "Hybrid" }, { label: "Field work", value: "Field work" },
        ] },
        { id: id("f"), key: "businessUnit", label: "Business Unit", type: "text", width: "half", placeholder: "Engineering" },
        { id: id("f"), key: "costCenter", label: "Cost Center", type: "text", width: "half", placeholder: "CC-ENG-100" },
      ],
    },
    {
      id: "sec-organization",
      title: "Organization",
      description: "Reporting hierarchy & policy assignments",
      fields: [
        { id: id("f"), key: "entityId", label: "Entity", type: "entity", width: "half", endpoint: "/api/entities" },
        { id: id("f"), key: "branchId", label: "Branch", type: "select", width: "half", endpoint: "/api/branches" },
        { id: id("f"), key: "departmentId", label: "Department", type: "department", width: "half", endpoint: "/api/departments" },
        { id: id("f"), key: "designationId", label: "Designation", type: "designation", width: "half", endpoint: "/api/designations" },
        { id: id("f"), key: "gradeId", label: "Grade / Band", type: "grade", width: "half", endpoint: "/api/grades" },
        { id: id("f"), key: "locationId", label: "Location", type: "location", width: "half", endpoint: "/api/locations" },
        { id: id("f"), key: "reportingManagerId", label: "Reporting Manager", type: "employee", width: "half", endpoint: "/api/employees/picker" },
        { id: id("f"), key: "functionalManagerId", label: "Functional Manager", type: "employee", width: "half", endpoint: "/api/employees/picker" },
        { id: id("f"), key: "hrManagerId", label: "HR Manager", type: "employee", width: "half", endpoint: "/api/employees/picker" },
      ],
    },
    {
      id: "sec-policies",
      title: "Policy Assignments",
      description: "Leave, attendance, payroll, shift & holiday policies",
      fields: [
        { id: id("f"), key: "leavePolicyId", label: "Leave Policy", type: "text", width: "half", placeholder: "Policy ID (optional)" },
        { id: id("f"), key: "attendancePolicyId", label: "Attendance Policy", type: "text", width: "half", placeholder: "Policy ID (optional)" },
        { id: id("f"), key: "payrollPolicyId", label: "Payroll Policy", type: "text", width: "half", placeholder: "Policy ID (optional)" },
        { id: id("f"), key: "shiftPolicyId", label: "Shift Policy", type: "text", width: "half", placeholder: "Policy ID (optional)" },
        { id: id("f"), key: "holidayCalendarId", label: "Holiday Calendar", type: "text", width: "half", placeholder: "Calendar ID (optional)" },
      ],
    },
    {
      id: "sec-bank",
      title: "Bank Details",
      fields: [
        { id: id("f"), key: "bankName", label: "Bank Name", type: "text", width: "half" },
        { id: id("f"), key: "accountHolderName", label: "Account Holder Name", type: "text", width: "half" },
        { id: id("f"), key: "accountNumber", label: "Account Number", type: "text", width: "half" },
        { id: id("f"), key: "accountType", label: "Account Type", type: "select", width: "half", options: [
          { label: "Savings", value: "Savings" }, { label: "Current", value: "Current" }, { label: "Salary", value: "Salary" },
        ] },
        { id: id("f"), key: "ifscCode", label: "IFSC Code", type: "text", width: "half" },
        { id: id("f"), key: "branchName", label: "Branch Name", type: "text", width: "half" },
        { id: id("f"), key: "upiId", label: "UPI ID", type: "text", width: "half", placeholder: "name@okhdfcbank" },
      ],
    },
    {
      id: "sec-statutory",
      title: "Statutory Details",
      fields: [
        { id: id("f"), key: "panNumber", label: "PAN", type: "text", width: "half", validation: { pattern: "^[A-Z]{5}[0-9]{4}[A-Z]{1}$" } },
        { id: id("f"), key: "aadhaarNumber", label: "Aadhaar", type: "text", width: "half" },
        { id: id("f"), key: "uanNumber", label: "UAN", type: "text", width: "half" },
        { id: id("f"), key: "pfNumber", label: "PF Number", type: "text", width: "half" },
        { id: id("f"), key: "esiNumber", label: "ESI Number", type: "text", width: "half" },
        { id: id("f"), key: "ptLocation", label: "PT Location", type: "text", width: "half" },
        { id: id("f"), key: "pfApplicable", label: "PF Applicable", type: "switch", width: "half", defaultValue: true },
        { id: id("f"), key: "esiApplicable", label: "ESI Applicable", type: "switch", width: "half", defaultValue: false },
        { id: id("f"), key: "ptApplicable", label: "PT Applicable", type: "switch", width: "half", defaultValue: true },
        { id: id("f"), key: "lwfApplicability", label: "LWF Applicability", type: "text", width: "half" },
        { id: id("f"), key: "gratuityApplicability", label: "Gratuity Applicability", type: "text", width: "half" },
        { id: id("f"), key: "taxRegime", label: "Tax Regime", type: "select", width: "half", options: [
          { label: "Old", value: "Old" }, { label: "New", value: "New" },
        ] },
        { id: id("f"), key: "tdsDeclarationStatus", label: "TDS Declaration Status", type: "select", width: "half", options: [
          { label: "Pending", value: "Pending" }, { label: "Submitted", value: "Submitted" }, { label: "Verified", value: "Verified" },
        ] },
      ],
    },
    {
      id: "sec-current-address",
      title: "Current Address",
      fields: [
        { id: id("f"), key: "currentAddress", label: "Address Line 1", type: "textarea", width: "full" },
        { id: id("f"), key: "currentAddressLine2", label: "Address Line 2", type: "text", width: "half" },
        { id: id("f"), key: "currentLandmark", label: "Landmark", type: "text", width: "half" },
        { id: id("f"), key: "currentCity", label: "City", type: "text", width: "half" },
        { id: id("f"), key: "currentState", label: "State", type: "text", width: "half" },
        { id: id("f"), key: "currentCountry", label: "Country", type: "text", width: "half", defaultValue: "India" },
        { id: id("f"), key: "currentPincode", label: "Pincode", type: "text", width: "half" },
      ],
    },
    {
      id: "sec-permanent-address",
      title: "Permanent Address",
      fields: [
        { id: id("f"), key: "sameAsCurrent", label: "Same as Current Address", type: "switch", width: "half", defaultValue: false },
        { id: id("f"), key: "permanentAddress", label: "Address Line 1", type: "textarea", width: "full", visibilityConditions: [{ field: "sameAsCurrent", operator: "eq", value: false }] },
        { id: id("f"), key: "permanentAddressLine2", label: "Address Line 2", type: "text", width: "half", visibilityConditions: [{ field: "sameAsCurrent", operator: "eq", value: false }] },
        { id: id("f"), key: "permanentCity", label: "City", type: "text", width: "half", visibilityConditions: [{ field: "sameAsCurrent", operator: "eq", value: false }] },
        { id: id("f"), key: "permanentState", label: "State", type: "text", width: "half", visibilityConditions: [{ field: "sameAsCurrent", operator: "eq", value: false }] },
        { id: id("f"), key: "permanentCountry", label: "Country", type: "text", width: "half", defaultValue: "India", visibilityConditions: [{ field: "sameAsCurrent", operator: "eq", value: false }] },
        { id: id("f"), key: "permanentPincode", label: "Pincode", type: "text", width: "half", visibilityConditions: [{ field: "sameAsCurrent", operator: "eq", value: false }] },
      ],
    },
    {
      id: "sec-emergency",
      title: "Emergency Contact",
      fields: [
        { id: id("f"), key: "emergencyContactName", label: "Contact Name", type: "text", width: "half" },
        { id: id("f"), key: "emergencyContactRelation", label: "Relationship", type: "text", width: "half", placeholder: "Spouse / Parent / Sibling" },
        { id: id("f"), key: "emergencyContactPhone", label: "Phone", type: "phone", width: "half" },
        { id: id("f"), key: "emergencyContactAltPhone", label: "Alternate Phone", type: "phone", width: "half" },
        { id: id("f"), key: "emergencyContactEmail", label: "Email", type: "email", width: "half" },
        { id: id("f"), key: "emergencyContactAddress", label: "Address", type: "textarea", width: "full" },
        { id: id("f"), key: "communicationPreference", label: "Communication Preference", type: "select", width: "half", options: [
          { label: "Email", value: "Email" }, { label: "SMS", value: "SMS" }, { label: "WhatsApp", value: "WhatsApp" },
        ] },
      ],
    },
    {
      id: "sec-compensation",
      title: "Compensation",
      description: "Salary & CTC details (annual figures)",
      fields: [
        { id: id("f"), key: "ctc", label: "Annual CTC", type: "currency", unit: "₹", width: "half" },
        { id: id("f"), key: "basicSalary", label: "Basic Salary (annual)", type: "currency", unit: "₹", width: "half", helpText: "Typically 50% of CTC" },
        { id: id("f"), key: "hra", label: "HRA (annual)", type: "currency", unit: "₹", width: "half", helpText: "Typically 40% of Basic" },
        { id: id("f"), key: "specialAllowance", label: "Special Allowance", type: "currency", unit: "₹", width: "half" },
        { id: id("f"), key: "conveyanceAllowance", label: "Conveyance Allowance", type: "currency", unit: "₹", width: "half" },
        { id: id("f"), key: "medicalAllowance", label: "Medical Allowance", type: "currency", unit: "₹", width: "half" },
        { id: id("f"), key: "bonusAmount", label: "Bonus Amount", type: "currency", unit: "₹", width: "half" },
        { id: id("f"), key: "pfEmployee", label: "PF (Employee)", type: "currency", unit: "₹", width: "half" },
        { id: id("f"), key: "pfEmployer", label: "PF (Employer)", type: "currency", unit: "₹", width: "half" },
        { id: id("f"), key: "esiAmount", label: "ESI Amount", type: "currency", unit: "₹", width: "half" },
        { id: id("f"), key: "professionalTax", label: "Professional Tax", type: "currency", unit: "₹", width: "half" },
        { id: id("f"), key: "tdsAmount", label: "TDS Amount", type: "currency", unit: "₹", width: "half" },
        { id: id("f"), key: "grossSalary", label: "Gross Salary", type: "currency", unit: "₹", width: "half" },
        { id: id("f"), key: "netSalary", label: "Net Salary", type: "currency", unit: "₹", width: "half" },
      ],
    },
  ],
}

// ============================================================
// ENTITY (Company)
// ============================================================

export const entityFormSchema: FormSchema = {
  code: "entity-default",
  name: "Add Entity",
  module: "entity",
  sections: [
    {
      id: "sec-1",
      title: "Entity Details",
      fields: [
        { id: id("f"), key: "code", label: "Entity Code", type: "text", width: "half", validation: { required: true }, placeholder: "ESPL" },
        { id: id("f"), key: "legalName", label: "Legal Name", type: "text", width: "half", validation: { required: true }, placeholder: "Example Services Pvt Ltd" },
        { id: id("f"), key: "tradeName", label: "Trade Name", type: "text", width: "half", placeholder: "Example" },
        { id: id("f"), key: "country", label: "Country", type: "text", width: "half", defaultValue: "India" },
        { id: id("f"), key: "currency", label: "Currency", type: "select", width: "half", defaultValue: "INR", options: [
          { label: "INR", value: "INR" }, { label: "USD", value: "USD" }, { label: "EUR", value: "EUR" }, { label: "GBP", value: "GBP" },
        ] },
        { id: id("f"), key: "effectiveDate", label: "Effective Date", type: "date", width: "half" },
      ],
    },
    {
      id: "sec-2",
      title: "Registrations",
      fields: [
        { id: id("f"), key: "pan", label: "PAN", type: "text", width: "half" },
        { id: id("f"), key: "gstin", label: "GSTIN", type: "text", width: "half" },
        { id: id("f"), key: "tan", label: "TAN", type: "text", width: "half" },
        { id: id("f"), key: "pfNumber", label: "PF Number", type: "text", width: "half" },
        { id: id("f"), key: "esiNumber", label: "ESI Number", type: "text", width: "half" },
      ],
    },
    {
      id: "sec-3",
      title: "Address & Applicability",
      fields: [
        { id: id("f"), key: "address", label: "Address", type: "textarea", width: "full" },
        { id: id("f"), key: "city", label: "City", type: "text", width: "half" },
        { id: id("f"), key: "state", label: "State", type: "text", width: "half" },
        { id: id("f"), key: "payrollApplicable", label: "Payroll Applicable", type: "switch", width: "half", defaultValue: true },
        { id: id("f"), key: "attendanceApplicable", label: "Attendance Applicable", type: "switch", width: "half", defaultValue: true },
        { id: id("f"), key: "leaveApplicable", label: "Leave Applicable", type: "switch", width: "half", defaultValue: true },
        { id: id("f"), key: "status", label: "Status", type: "select", width: "half", defaultValue: "Active", options: [
          { label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" },
        ] },
      ],
    },
  ],
}

// ============================================================
// DEPARTMENT
// ============================================================

export const departmentFormSchema: FormSchema = {
  code: "department-default",
  name: "Add Department",
  module: "department",
  sections: [{
    id: "sec-1",
    title: "Department Details",
    fields: [
      { id: id("f"), key: "code", label: "Department Code", type: "text", width: "half", validation: { required: true }, placeholder: "HR" },
      { id: id("f"), key: "name", label: "Department Name", type: "text", width: "half", validation: { required: true }, placeholder: "Human Resources" },
      { id: id("f"), key: "entityId", label: "Entity", type: "entity", width: "half", endpoint: "/api/entities" },
      { id: id("f"), key: "parentId", label: "Parent Department", type: "department", width: "half", endpoint: "/api/departments" },
      { id: id("f"), key: "departmentHeadId", label: "Department Head", type: "employee", width: "half", endpoint: "/api/employees/picker" },
      { id: id("f"), key: "status", label: "Status", type: "select", width: "half", defaultValue: "Active", options: [
        { label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" },
      ] },
    ],
  }],
}

// ============================================================
// DESIGNATION
// ============================================================

export const designationFormSchema: FormSchema = {
  code: "designation-default",
  name: "Add Designation",
  module: "designation",
  sections: [{
    id: "sec-1",
    title: "Designation Details",
    fields: [
      { id: id("f"), key: "code", label: "Designation Code", type: "text", width: "half", validation: { required: true }, placeholder: "MGR" },
      { id: id("f"), key: "name", label: "Designation Name", type: "text", width: "half", validation: { required: true }, placeholder: "Manager" },
      { id: id("f"), key: "gradeId", label: "Grade / Band", type: "grade", width: "half", endpoint: "/api/grades" },
      { id: id("f"), key: "level", label: "Level", type: "number", width: "half" },
      { id: id("f"), key: "departmentId", label: "Department", type: "department", width: "half", endpoint: "/api/departments" },
      { id: id("f"), key: "jobDescription", label: "Job Description", type: "textarea", width: "full" },
      { id: id("f"), key: "status", label: "Status", type: "select", width: "half", defaultValue: "Active", options: [
        { label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" },
      ] },
    ],
  }],
}

// ============================================================
// GRADE
// ============================================================

export const gradeFormSchema: FormSchema = {
  code: "grade-default",
  name: "Add Grade / Band",
  module: "grade",
  sections: [{
    id: "sec-1",
    title: "Grade Details",
    fields: [
      { id: id("f"), key: "code", label: "Grade Code", type: "text", width: "half", validation: { required: true }, placeholder: "L5" },
      { id: id("f"), key: "name", label: "Grade Name", type: "text", width: "half", validation: { required: true }, placeholder: "Senior" },
      { id: id("f"), key: "hierarchyLevel", label: "Hierarchy Level", type: "number", width: "half", defaultValue: 5, helpText: "Lower number = higher in hierarchy" },
      { id: id("f"), key: "minSalary", label: "Min Salary", type: "currency", unit: "₹", width: "half" },
      { id: id("f"), key: "maxSalary", label: "Max Salary", type: "currency", unit: "₹", width: "half" },
      { id: id("f"), key: "leaveEligibility", label: "Leave Eligibility (days/yr)", type: "number", width: "half" },
      { id: id("f"), key: "approvalAuthority", label: "Has Approval Authority", type: "switch", width: "half", defaultValue: false },
      { id: id("f"), key: "status", label: "Status", type: "select", width: "half", defaultValue: "Active", options: [
        { label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" },
      ] },
    ],
  }],
}

// ============================================================
// LEAVE TYPE
// ============================================================

export const leaveTypeFormSchema: FormSchema = {
  code: "leaveType-default",
  name: "Add Leave Type",
  module: "leaveType",
  sections: [
    {
      id: "sec-1",
      title: "Basic",
      fields: [
        { id: id("f"), key: "code", label: "Leave Code", type: "text", width: "half", validation: { required: true }, placeholder: "CL" },
        { id: id("f"), key: "name", label: "Leave Name", type: "text", width: "half", validation: { required: true }, placeholder: "Casual Leave" },
        { id: id("f"), key: "color", label: "Color", type: "text", width: "half", defaultValue: "#10b981", placeholder: "#10b981" },
        { id: id("f"), key: "isPaid", label: "Paid Leave", type: "switch", width: "half", defaultValue: true },
      ],
    },
    {
      id: "sec-2",
      title: "Allowed Modes",
      fields: [
        { id: id("f"), key: "fullDayAllowed", label: "Full Day Allowed", type: "switch", width: "half", defaultValue: true },
        { id: id("f"), key: "halfDayAllowed", label: "Half Day Allowed", type: "switch", width: "half", defaultValue: false },
        { id: id("f"), key: "hourlyAllowed", label: "Hourly Allowed", type: "switch", width: "half", defaultValue: false },
      ],
    },
    {
      id: "sec-3",
      title: "Accrual & Balance",
      fields: [
        { id: id("f"), key: "yearlyAccrual", label: "Yearly Accrual (days)", type: "number", width: "half", defaultValue: 12 },
        { id: id("f"), key: "monthlyAccrual", label: "Monthly Accrual (days)", type: "number", width: "half", defaultValue: 1 },
        { id: id("f"), key: "openingBalance", label: "Opening Balance", type: "number", width: "half", defaultValue: 0 },
        { id: id("f"), key: "carryForward", label: "Carry Forward", type: "switch", width: "half", defaultValue: false },
        { id: id("f"), key: "carryForwardLimit", label: "Carry Forward Limit", type: "number", width: "half", visibilityConditions: [{ field: "carryForward", operator: "eq", value: true }] },
        { id: id("f"), key: "encashment", label: "Encashment Allowed", type: "switch", width: "half", defaultValue: false },
        { id: id("f"), key: "negativeAllowed", label: "Negative Balance Allowed", type: "switch", width: "half", defaultValue: false },
      ],
    },
    {
      id: "sec-4",
      title: "Rules & Constraints",
      fields: [
        { id: id("f"), key: "minDays", label: "Minimum Days", type: "number", width: "half", defaultValue: 1 },
        { id: id("f"), key: "maxDays", label: "Maximum Days", type: "number", width: "half" },
        { id: id("f"), key: "backdatedAllowed", label: "Backdated Allowed", type: "switch", width: "half", defaultValue: true },
        { id: id("f"), key: "futureAllowed", label: "Future Date Allowed", type: "switch", width: "half", defaultValue: true },
        { id: id("f"), key: "attachmentRequired", label: "Attachment Required", type: "switch", width: "half", defaultValue: false },
        { id: id("f"), key: "reasonRequired", label: "Reason Required", type: "switch", width: "half", defaultValue: true },
        { id: id("f"), key: "genderApplicability", label: "Gender Applicability", type: "select", width: "half", defaultValue: "All", options: [
          { label: "All", value: "All" }, { label: "Male", value: "Male" }, { label: "Female", value: "Female" },
        ] },
        { id: id("f"), key: "status", label: "Status", type: "select", width: "half", defaultValue: "Active", options: [
          { label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" },
        ] },
      ],
    },
  ],
}

// ============================================================
// LEAVE APPLICATION
// ============================================================

export const leaveApplicationFormSchema: FormSchema = {
  code: "leaveApplication-default",
  name: "Apply Leave",
  module: "leaveApplication",
  sections: [{
    id: "sec-1",
    title: "Leave Application",
    fields: [
      { id: id("f"), key: "employeeId", label: "Employee", type: "employee", width: "full", validation: { required: true }, endpoint: "/api/employees/picker" },
      { id: id("f"), key: "leaveTypeId", label: "Leave Type", type: "leaveType", width: "half", validation: { required: true }, endpoint: "/api/leave-types" },
      { id: id("f"), key: "fromDate", label: "From Date", type: "date", width: "half", validation: { required: true } },
      { id: id("f"), key: "toDate", label: "To Date", type: "date", width: "half", validation: { required: true } },
      { id: id("f"), key: "halfDay", label: "Half Day", type: "switch", width: "half", defaultValue: false },
      { id: id("f"), key: "reason", label: "Reason", type: "textarea", width: "full", validation: { required: true } },
      { id: id("f"), key: "attachmentUrl", label: "Attachment", type: "file", width: "full" },
    ],
  }],
}

// ============================================================
// SHIFT
// ============================================================

export const shiftFormSchema: FormSchema = {
  code: "shift-default",
  name: "Add Shift",
  module: "shift",
  sections: [
    {
      id: "sec-1",
      title: "Shift Details",
      fields: [
        { id: id("f"), key: "code", label: "Shift Code", type: "text", width: "half", validation: { required: true }, placeholder: "GEN" },
        { id: id("f"), key: "name", label: "Shift Name", type: "text", width: "half", validation: { required: true }, placeholder: "General Shift" },
        { id: id("f"), key: "color", label: "Color", type: "text", width: "half", defaultValue: "#10b981" },
        { id: id("f"), key: "startTime", label: "Start Time", type: "time", width: "half", validation: { required: true }, defaultValue: "09:00" },
        { id: id("f"), key: "endTime", label: "End Time", type: "time", width: "half", validation: { required: true }, defaultValue: "18:00" },
        { id: id("f"), key: "breakStart", label: "Break Start", type: "time", width: "half", defaultValue: "13:00" },
        { id: id("f"), key: "breakEnd", label: "Break End", type: "time", width: "half", defaultValue: "14:00" },
      ],
    },
    {
      id: "sec-2",
      title: "Rules",
      fields: [
        { id: id("f"), key: "workingHours", label: "Working Hours", type: "decimal", width: "half", defaultValue: 8 },
        { id: id("f"), key: "graceMinutes", label: "Grace (minutes)", type: "number", width: "half", defaultValue: 15 },
        { id: id("f"), key: "halfDayHours", label: "Half Day Hours", type: "decimal", width: "half", defaultValue: 4 },
        { id: id("f"), key: "fullDayHours", label: "Full Day Hours", type: "decimal", width: "half", defaultValue: 8 },
        { id: id("f"), key: "isNightShift", label: "Night Shift", type: "switch", width: "half", defaultValue: false },
        { id: id("f"), key: "isFlexible", label: "Flexible", type: "switch", width: "half", defaultValue: false },
        { id: id("f"), key: "autoPunchOut", label: "Auto Punch-out", type: "switch", width: "half", defaultValue: false },
        { id: id("f"), key: "overtimeEligible", label: "Overtime Eligible", type: "switch", width: "half", defaultValue: false },
        { id: id("f"), key: "status", label: "Status", type: "select", width: "half", defaultValue: "Active", options: [
          { label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" },
        ] },
      ],
    },
  ],
}

// ============================================================
// ROSTER
// ============================================================

export const rosterFormSchema: FormSchema = {
  code: "roster-default",
  name: "Create Roster",
  module: "roster",
  sections: [{
    id: "sec-1",
    title: "Roster Details",
    fields: [
      { id: id("f"), key: "name", label: "Roster Name", type: "text", width: "half", validation: { required: true }, placeholder: "November Operations Roster" },
      { id: id("f"), key: "code", label: "Roster Code", type: "text", width: "half", validation: { required: true }, placeholder: "ROST-NOV-25" },
      { id: id("f"), key: "cycle", label: "Cycle", type: "select", width: "half", defaultValue: "Weekly", options: [
        { label: "Weekly", value: "Weekly" }, { label: "Monthly", value: "Monthly" },
      ] },
      { id: id("f"), key: "startDate", label: "Start Date", type: "date", width: "half", validation: { required: true } },
      { id: id("f"), key: "endDate", label: "End Date", type: "date", width: "half", validation: { required: true } },
      { id: id("f"), key: "status", label: "Status", type: "select", width: "half", defaultValue: "Draft", options: [
        { label: "Draft", value: "Draft" }, { label: "Published", value: "Published" }, { label: "Locked", value: "Locked" },
      ] },
    ],
  }],
}

// ============================================================
// ASSET
// ============================================================

export const assetFormSchema: FormSchema = {
  code: "asset-default",
  name: "Add Asset",
  module: "asset",
  sections: [
    {
      id: "sec-1",
      title: "Asset Details",
      fields: [
        { id: id("f"), key: "assetCode", label: "Asset Code", type: "text", width: "half", validation: { required: true }, placeholder: "AST-0001" },
        { id: id("f"), key: "name", label: "Asset Name", type: "text", width: "half", validation: { required: true }, placeholder: "Dell Latitude 5420" },
        { id: id("f"), key: "categoryId", label: "Category", type: "assetCategory", width: "half", endpoint: "/api/asset-categories" },
        { id: id("f"), key: "serialNumber", label: "Serial Number", type: "text", width: "half" },
        { id: id("f"), key: "assetTag", label: "Asset Tag", type: "text", width: "half" },
        { id: id("f"), key: "purchaseDate", label: "Purchase Date", type: "date", width: "half" },
        { id: id("f"), key: "purchaseValue", label: "Purchase Value", type: "currency", unit: "₹", width: "half" },
        { id: id("f"), key: "condition", label: "Condition", type: "select", width: "half", defaultValue: "Good", options: [
          { label: "Good", value: "Good" }, { label: "Fair", value: "Fair" }, { label: "Damaged", value: "Damaged" }, { label: "Lost", value: "Lost" },
        ] },
        { id: id("f"), key: "status", label: "Status", type: "select", width: "half", defaultValue: "In Stock", options: [
          { label: "In Stock", value: "In Stock" }, { label: "Assigned", value: "Assigned" }, { label: "Returned", value: "Returned" },
          { label: "Damaged", value: "Damaged" }, { label: "Lost", value: "Lost" }, { label: "Repair", value: "Repair" },
          { label: "Retired", value: "Retired" }, { label: "Disposed", value: "Disposed" },
        ] },
        { id: id("f"), key: "assignedToId", label: "Assigned To", type: "employee", width: "half", endpoint: "/api/employees/picker", visibilityConditions: [{ field: "status", operator: "eq", value: "Assigned" }] },
        { id: id("f"), key: "notes", label: "Notes", type: "textarea", width: "full" },
      ],
    },
  ],
}

// ============================================================
// ASSET CATEGORY
// ============================================================

export const assetCategoryFormSchema: FormSchema = {
  code: "assetCategory-default",
  name: "Add Asset Category",
  module: "assetCategory",
  sections: [{
    id: "sec-1",
    title: "Category Details",
    fields: [
      { id: id("f"), key: "code", label: "Category Code", type: "text", width: "half", validation: { required: true }, placeholder: "LAPTOP" },
      { id: id("f"), key: "name", label: "Category Name", type: "text", width: "half", validation: { required: true }, placeholder: "Laptops" },
      { id: id("f"), key: "icon", label: "Icon (lucide name)", type: "text", width: "half", placeholder: "laptop" },
      { id: id("f"), key: "description", label: "Description", type: "textarea", width: "full" },
    ],
  }],
}

// ============================================================
// HOLIDAY
// ============================================================

export const holidayFormSchema: FormSchema = {
  code: "holiday-default",
  name: "Add Holiday",
  module: "holiday",
  sections: [{
    id: "sec-1",
    title: "Holiday Details",
    fields: [
      { id: id("f"), key: "name", label: "Holiday Name", type: "text", width: "half", validation: { required: true }, placeholder: "Diwali" },
      { id: id("f"), key: "date", label: "Date", type: "date", width: "half", validation: { required: true } },
      { id: id("f"), key: "type", label: "Type", type: "select", width: "half", defaultValue: "National", options: [
        { label: "National", value: "National" }, { label: "Regional", value: "Regional" }, { label: "Optional", value: "Optional" }, { label: "Restricted", value: "Restricted" },
      ] },
      { id: id("f"), key: "country", label: "Country", type: "text", width: "half", defaultValue: "India" },
      { id: id("f"), key: "state", label: "State", type: "text", width: "half" },
      { id: id("f"), key: "description", label: "Description", type: "textarea", width: "full" },
    ],
  }],
}

// ============================================================
// ANNOUNCEMENT
// ============================================================

export const announcementFormSchema: FormSchema = {
  code: "announcement-default",
  name: "New Announcement",
  module: "announcement",
  sections: [{
    id: "sec-1",
    title: "Announcement",
    fields: [
      { id: id("f"), key: "title", label: "Title", type: "text", width: "full", validation: { required: true } },
      { id: id("f"), key: "body", label: "Body", type: "textarea", width: "full", validation: { required: true } },
      { id: id("f"), key: "audience", label: "Audience", type: "select", width: "half", defaultValue: "All", options: [
        { label: "All", value: "All" }, { label: "Entity", value: "Entity" }, { label: "Department", value: "Department" }, { label: "Location", value: "Location" },
      ] },
      { id: id("f"), key: "priority", label: "Priority", type: "select", width: "half", defaultValue: "Normal", options: [
        { label: "Low", value: "Low" }, { label: "Normal", value: "Normal" }, { label: "High", value: "High" }, { label: "Urgent", value: "Urgent" },
      ] },
      { id: id("f"), key: "expiryDate", label: "Expiry Date", type: "date", width: "half" },
    ],
  }],
}

// ============================================================
// WORKFLOW
// ============================================================

export const workflowFormSchema: FormSchema = {
  code: "workflow-default",
  name: "Create Workflow",
  module: "workflow",
  sections: [{
    id: "sec-1",
    title: "Workflow Details",
    fields: [
      { id: id("f"), key: "code", label: "Workflow Code", type: "text", width: "half", validation: { required: true }, placeholder: "LEAVE-2LVL" },
      { id: id("f"), key: "name", label: "Workflow Name", type: "text", width: "half", validation: { required: true }, placeholder: "Leave Approval (2 Levels)" },
      { id: id("f"), key: "module", label: "Module", type: "select", width: "half", validation: { required: true }, options: [
        { label: "Leave", value: "leave" }, { label: "Asset", value: "asset" }, { label: "Attendance", value: "attendance" },
        { label: "Employee", value: "employee" }, { label: "Expense", value: "expense" }, { label: "Onboarding", value: "onboarding" },
      ] },
      { id: id("f"), key: "event", label: "Event", type: "select", width: "half", defaultValue: "apply", options: [
        { label: "Apply", value: "apply" }, { label: "Create", value: "create" }, { label: "Update", value: "update" }, { label: "Request", value: "request" },
      ] },
      { id: id("f"), key: "approvalType", label: "Approval Type", type: "select", width: "half", defaultValue: "Sequential", options: [
        { label: "Sequential", value: "Sequential" }, { label: "Parallel", value: "Parallel" }, { label: "Auto", value: "Auto" },
      ] },
      { id: id("f"), key: "isActive", label: "Active", type: "switch", width: "half", defaultValue: true },
      { id: id("f"), key: "description", label: "Description", type: "textarea", width: "full" },
    ],
  }],
}

// ============================================================
// Registry
// ============================================================

export const leaveRuleBasicSchema: FormSchema = {
  code: "leaveRule-basic",
  name: "Leave Rule — Basic",
  module: "leaveRule",
  sections: [{
    id: "sec-basic",
    title: "Basic Details",
    fields: [
      { id: id("f"), key: "name", label: "Rule Name", type: "text", width: "half", validation: { required: true }, placeholder: "India Standard Leave Policy 2026" },
      { id: id("f"), key: "code", label: "Rule Code", type: "text", width: "half", validation: { required: true }, placeholder: "IN-STD-2026" },
      { id: id("f"), key: "description", label: "Description", type: "textarea", width: "full" },
      { id: id("f"), key: "country", label: "Country", type: "text", width: "half", defaultValue: "India" },
      { id: id("f"), key: "leaveYearType", label: "Leave Year Type", type: "select", width: "half", defaultValue: "CalendarYear", options: [
        { label: "Calendar Year", value: "CalendarYear" }, { label: "Financial Year", value: "FinancialYear" },
        { label: "Custom", value: "Custom" }, { label: "Joining Date", value: "JoiningDate" },
      ] },
      { id: id("f"), key: "calendarStartMonth", label: "Calendar Start Month", type: "select", width: "half", defaultValue: "1", options: [
        { label: "January", value: "1" }, { label: "February", value: "2" }, { label: "March", value: "3" }, { label: "April", value: "4" },
        { label: "May", value: "5" }, { label: "June", value: "6" }, { label: "July", value: "7" }, { label: "August", value: "8" },
        { label: "September", value: "9" }, { label: "October", value: "10" }, { label: "November", value: "11" }, { label: "December", value: "12" },
      ] },
      { id: id("f"), key: "effectiveFrom", label: "Effective From", type: "date", width: "half" },
      { id: id("f"), key: "effectiveTo", label: "Effective To", type: "date", width: "half" },
      { id: id("f"), key: "priority", label: "Priority (higher wins)", type: "number", width: "half", defaultValue: 0 },
      { id: id("f"), key: "isDefault", label: "Default Rule", type: "switch", width: "half", defaultValue: false },
      { id: id("f"), key: "status", label: "Status", type: "select", width: "half", defaultValue: "Active", options: [
        { label: "Active", value: "Active" }, { label: "Draft", value: "Draft" }, { label: "Inactive", value: "Inactive" },
      ] },
    ],
  }],
}

// ============================================================
// LEAVE ADJUSTMENT (manual credit/debit)
// ============================================================

export const leaveAdjustmentFormSchema: FormSchema = {
  code: "leaveAdjustment-default",
  name: "Leave Adjustment",
  module: "leaveAdjustment",
  sections: [{
    id: "sec-1",
    title: "Adjustment Details",
    fields: [
      { id: id("f"), key: "employeeId", label: "Employee", type: "employee", width: "full", validation: { required: true }, endpoint: "/api/employees/picker" },
      { id: id("f"), key: "leaveTypeId", label: "Leave Type", type: "leaveType", width: "half", validation: { required: true }, endpoint: "/api/leave-types" },
      { id: id("f"), key: "adjustmentType", label: "Adjustment Type", type: "select", width: "half", defaultValue: "Credit", options: [
        { label: "Credit", value: "Credit" }, { label: "Debit", value: "Debit" },
      ] },
      { id: id("f"), key: "amount", label: "Amount (days)", type: "decimal", width: "half", validation: { required: true, min: 0.5 } },
      { id: id("f"), key: "effectiveDate", label: "Effective Date", type: "date", width: "half", validation: { required: true } },
      { id: id("f"), key: "reason", label: "Reason", type: "text", width: "full", validation: { required: true } },
      { id: id("f"), key: "remarks", label: "Remarks", type: "textarea", width: "full" },
    ],
  }],
}

// ============================================================
// COMP-OFF GRANT
// ============================================================

export const compOffFormSchema: FormSchema = {
  code: "compOff-default",
  name: "Grant Comp-Off",
  module: "compOff",
  sections: [{
    id: "sec-1",
    title: "Comp-Off Details",
    fields: [
      { id: id("f"), key: "employeeId", label: "Employee", type: "employee", width: "full", validation: { required: true }, endpoint: "/api/employees/picker" },
      { id: id("f"), key: "source", label: "Source", type: "select", width: "half", validation: { required: true }, defaultValue: "Manual", options: [
        { label: "Weekly Off Work", value: "WeeklyOffWork" }, { label: "Holiday Work", value: "HolidayWork" },
        { label: "Overtime", value: "Overtime" }, { label: "On Call", value: "OnCall" }, { label: "Manual", value: "Manual" },
      ] },
      { id: id("f"), key: "sourceDate", label: "Source Date", type: "date", width: "half", validation: { required: true } },
      { id: id("f"), key: "hours", label: "Hours Worked", type: "decimal", width: "half", defaultValue: 8 },
      { id: id("f"), key: "days", label: "Days Earned", type: "decimal", width: "half", defaultValue: 1 },
      { id: id("f"), key: "expiryDate", label: "Expiry Date", type: "date", width: "half" },
      { id: id("f"), key: "approvedBy", label: "Approved By", type: "text", width: "half" },
      { id: id("f"), key: "remarks", label: "Remarks", type: "textarea", width: "full" },
    ],
  }],
}

// ============================================================
// LEAVE ENCASHMENT REQUEST
// ============================================================

export const encashmentFormSchema: FormSchema = {
  code: "encashment-default",
  name: "Request Encashment",
  module: "encashment",
  sections: [{
    id: "sec-1",
    title: "Encashment Details",
    fields: [
      { id: id("f"), key: "employeeId", label: "Employee", type: "employee", width: "full", validation: { required: true }, endpoint: "/api/employees/picker" },
      { id: id("f"), key: "leaveTypeId", label: "Leave Type", type: "leaveType", width: "half", validation: { required: true }, endpoint: "/api/leave-types" },
      { id: id("f"), key: "days", label: "Days to Encash", type: "decimal", width: "half", validation: { required: true, min: 0.5 } },
      { id: id("f"), key: "formula", label: "Formula", type: "text", width: "half", placeholder: "Basic/30*Days" },
      { id: id("f"), key: "payrollComponent", label: "Payroll Component", type: "text", width: "half", placeholder: "Leave Encashment" },
      { id: id("f"), key: "amount", label: "Amount (auto if blank)", type: "currency", unit: "₹", width: "half" },
    ],
  }],
}

// ============================================================
// WEEKLY OFF CALENDAR
// ============================================================

export const weeklyOffFormSchema: FormSchema = {
  code: "weeklyOff-default",
  name: "Weekly Off Calendar",
  module: "weeklyOff",
  sections: [{
    id: "sec-1",
    title: "Weekly Off Details",
    fields: [
      { id: id("f"), key: "name", label: "Name", type: "text", width: "half", validation: { required: true }, placeholder: "Standard Sunday Off" },
      { id: id("f"), key: "code", label: "Code", type: "text", width: "half", validation: { required: true }, placeholder: "WO-SUN" },
      { id: id("f"), key: "weekOffType", label: "Week Off Type", type: "select", width: "half", defaultValue: "Fixed", options: [
        { label: "Fixed", value: "Fixed" }, { label: "Alternate Saturday", value: "AlternateSaturday" },
        { label: "Rotational", value: "Rotational" }, { label: "Shift Based", value: "ShiftBased" }, { label: "Custom", value: "Custom" },
      ] },
      { id: id("f"), key: "fixedDays", label: "Fixed Days (0=Sun,6=Sat, comma-separated)", type: "text", width: "half", defaultValue: "0", placeholder: "0,6" },
      { id: id("f"), key: "entityIds", label: "Entity IDs (comma-separated)", type: "text", width: "half", placeholder: "All if blank" },
      { id: id("f"), key: "locationIds", label: "Location IDs (comma-separated)", type: "text", width: "half", placeholder: "All if blank" },
      { id: id("f"), key: "effectiveFrom", label: "Effective From", type: "date", width: "half" },
      { id: id("f"), key: "effectiveTo", label: "Effective To", type: "date", width: "half" },
      { id: id("f"), key: "status", label: "Status", type: "select", width: "half", defaultValue: "Active", options: [
        { label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" },
      ] },
    ],
  }],
}

// ============================================================
// LEAVE APPLICATION
// ============================================================


export const defaultFormSchemas: Record<string, FormSchema> = {
  employee: employeeFormSchema,
  entity: entityFormSchema,
  department: departmentFormSchema,
  designation: designationFormSchema,
  grade: gradeFormSchema,
  leaveType: leaveTypeFormSchema,
  leaveApplication: leaveApplicationFormSchema,
  leaveRule: leaveRuleBasicSchema,
  leaveAdjustment: leaveAdjustmentFormSchema,
  compOff: compOffFormSchema,
  encashment: encashmentFormSchema,
  weeklyOff: weeklyOffFormSchema,
  shift: shiftFormSchema,
  roster: rosterFormSchema,
  asset: assetFormSchema,
  assetCategory: assetCategoryFormSchema,
  holiday: holidayFormSchema,
  announcement: announcementFormSchema,
  workflow: workflowFormSchema,
}

export function getDefaultSchema(module: string): FormSchema | undefined {
  return defaultFormSchemas[module]
}
