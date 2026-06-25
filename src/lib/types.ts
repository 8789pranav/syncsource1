// ============================================================
// Dynamic Form Engine — shared types
// ============================================================

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "decimal"
  | "date"
  | "time"
  | "datetime"
  | "select"
  | "multiselect"
  | "checkbox"
  | "radio"
  | "switch"
  | "email"
  | "phone"
  | "url"
  | "currency"
  | "percentage"
  | "file"
  | "image"
  | "employee"
  | "department"
  | "location"
  | "entity"
  | "designation"
  | "grade"
  | "shift"
  | "leaveType"
  | "assetCategory"
  | "section"
  | "divider"
  | "formula"
  | "tag";

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string; // regex
  message?: string;
}

export interface VisibilityCondition {
  field: string;
  operator: "eq" | "neq" | "in" | "not_in" | "gt" | "lt" | "contains";
  value: unknown;
}

export interface FormField {
  id: string;
  key: string; // unique field key
  label: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
  options?: { label: string; value: string }[]; // for select/multiselect/radio
  validation?: ValidationRule;
  width?: "full" | "half" | "third"; // grid width
  visibilityConditions?: VisibilityCondition[];
  readOnly?: boolean;
  hidden?: boolean;
  // for picker fields
  endpoint?: string; // api endpoint for picker data
  // formula
  formula?: string;
  unit?: string; // e.g. "₹", "%"
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export interface FormSchema {
  id?: string;
  code: string;
  name: string;
  module: string;
  description?: string;
  sections: FormSection[];
  status?: "Draft" | "Published";
}

export type FormValues = Record<string, unknown>;

// ============================================================
// Module registry
// ============================================================

export type ModuleId =
  | "dashboard"
  | "organization"
  | "employees"
  | "onboarding"
  | "offboarding"
  | "leave"
  | "shift"
  | "roster"
  | "attendance"
  | "holiday"
  | "asset"
  | "payroll"
  | "forms"
  | "workflows"
  | "announcements"
  | "settings"
  | "audit";

export interface ModuleDef {
  id: ModuleId;
  label: string;
  icon: string; // lucide icon name
  group: "Main" | "People" | "Time" | "Config" | "System";
  description?: string;
}
