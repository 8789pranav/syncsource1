'use client'

import * as React from "react"
import { useForm, Controller, FieldValues } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { apiFetch } from "@/lib/api-client"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  CalendarIcon, Loader2, Plus, Save, X, Info,
} from "lucide-react"
import {
  FormField as FormFieldDef, FormSchema, FormValues, VisibilityCondition,
} from "@/lib/types"

// ---------- helpers ----------

function evalCondition(values: FormValues, cond: VisibilityCondition): boolean {
  const v = values[cond.field]
  switch (cond.operator) {
    case "eq": return v === cond.value
    case "neq": return v !== cond.value
    case "in": return Array.isArray(cond.value) && cond.value.includes(v)
    case "not_in": return Array.isArray(cond.value) && !cond.value.includes(v)
    case "gt": return Number(v) > Number(cond.value)
    case "lt": return Number(v) < Number(cond.value)
    case "contains": return typeof v === "string" && v.includes(String(cond.value))
    default: return true
  }
}

function fieldVisible(field: FormFieldDef, values: FormValues): boolean {
  if (field.hidden) return false
  if (!field.visibilityConditions?.length) return true
  return field.visibilityConditions.every((c) => evalCondition(values, c))
}

function widthClass(w?: string): string {
  switch (w) {
    case "half": return "sm:col-span-1"
    case "third": return "sm:col-span-1"
    default: return "sm:col-span-2"
  }
}

// ---------- picker data hook ----------

const pickerCache = new Map<string, { label: string; value: string }[]>()

function usePickerOptions(endpoint?: string) {
  const [options, setOptions] = React.useState<{ label: string; value: string }[]>(pickerCache.get(endpoint || "") || [])
  React.useEffect(() => {
    if (!endpoint) return
    if (pickerCache.has(endpoint)) { setOptions(pickerCache.get(endpoint)!); return }
    let alive = true
    apiFetch(endpoint)
      .then((r) => r.json())
      .then((data) => {
        const items = (data?.items || data || []).map((d: any) => ({
          label: d.label || d.name || d.code || d.id,
          value: d.value || d.id,
        }))
        if (alive) {
          pickerCache.set(endpoint, items)
          setOptions(items)
        }
      })
      .catch(() => {})
    return () => { alive = false }
  }, [endpoint])
  return options
}

// ---------- field renderer ----------

interface FieldProps {
  field: FormFieldDef
  value: unknown
  onChange: (v: unknown) => void
  error?: string
  disabled?: boolean
}

function FieldRenderer({ field, value, onChange, error, disabled }: FieldProps) {
  const options = usePickerOptions(field.endpoint)
  const common = cn(
    "w-full",
    error && "border-destructive focus-visible:ring-destructive",
  )

  const labelEl = (
    <div className="flex items-center gap-1.5 mb-1.5">
      <Label htmlFor={field.id} className="text-[13px] font-medium text-foreground">
        {field.label}
        {field.validation?.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {field.helpText && (
        <span className="group relative inline-flex">
          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
          <span className="pointer-events-none absolute left-1/2 top-5 z-50 -translate-x-1/2 whitespace-pre rounded-md bg-foreground px-2 py-1 text-[11px] text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100">
            {field.helpText}
          </span>
        </span>
      )}
    </div>
  )

  let control: React.ReactNode = null

  switch (field.type) {
    case "textarea":
      control = (
        <Textarea
          id={field.id}
          placeholder={field.placeholder}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={3}
          className={common}
        />
      )
      break

    case "number":
    case "decimal":
    case "currency":
    case "percentage":
      control = (
        <div className="relative">
          {field.unit && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              {field.unit}
            </span>
          )}
          <Input
            id={field.id}
            type="number"
            step={field.type === "decimal" || field.type === "currency" || field.type === "percentage" ? "0.01" : "1"}
            placeholder={field.placeholder}
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
            disabled={disabled}
            className={cn(common, field.unit && "pl-8")}
          />
        </div>
      )
      break

    case "email":
      control = (
        <Input id={field.id} type="email" placeholder={field.placeholder || "name@company.com"}
          value={(value as string) || ""} onChange={(e) => onChange(e.target.value)}
          disabled={disabled} className={common} />
      )
      break

    case "phone":
      control = (
        <Input id={field.id} type="tel" placeholder={field.placeholder || "+91 98765 43210"}
          value={(value as string) || ""} onChange={(e) => onChange(e.target.value)}
          disabled={disabled} className={common} />
      )
      break

    case "url":
      control = (
        <Input id={field.id} type="url" placeholder={field.placeholder || "https://"}
          value={(value as string) || ""} onChange={(e) => onChange(e.target.value)}
          disabled={disabled} className={common} />
      )
      break

    case "switch":
      control = (
        <div className="flex items-center gap-2 h-9">
          <Switch checked={Boolean(value)} onCheckedChange={onChange} disabled={disabled} />
          <span className="text-sm text-muted-foreground">{value ? "Yes" : "No"}</span>
        </div>
      )
      break

    case "checkbox":
      control = (
        <div className="flex items-center gap-2 h-9">
          <Checkbox checked={Boolean(value)} onCheckedChange={(v) => onChange(Boolean(v))} disabled={disabled} id={field.id} />
          <Label htmlFor={field.id} className="text-sm text-muted-foreground cursor-pointer">{field.placeholder || "Check to enable"}</Label>
        </div>
      )
      break

    case "select":
    case "employee":
    case "department":
    case "location":
    case "entity":
    case "designation":
    case "grade":
    case "shift":
    case "leaveType":
    case "assetCategory": {
      const opts = field.type === "select" ? (field.options || []) : options
      control = (
        <Select value={(value as string) || ""} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className={common} id={field.id}>
            <SelectValue placeholder={field.placeholder || "Select..."} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {opts.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
            {opts.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground text-center">No options</div>}
          </SelectContent>
        </Select>
      )
      break
    }

    case "multiselect": {
      const opts = field.options || []
      const cur = Array.isArray(value) ? (value as string[]) : []
      control = (
        <div className="flex flex-wrap gap-2 min-h-9 items-center rounded-md border border-input bg-background p-2">
          {opts.map((o) => {
            const checked = cur.includes(o.value)
            return (
              <button
                type="button"
                key={o.value}
                onClick={() => onChange(checked ? cur.filter((v) => v !== o.value) : [...cur, o.value])}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/40 hover:bg-muted text-muted-foreground",
                )}
              >
                {o.label}
              </button>
            )
          })}
          {opts.length === 0 && <span className="text-xs text-muted-foreground">No options</span>}
        </div>
      )
      break
    }

    case "radio": {
      const opts = field.options || []
      control = (
        <RadioGroup value={(value as string) || ""} onValueChange={onChange} disabled={disabled} className="flex flex-wrap gap-4 h-9 items-center">
          {opts.map((o) => (
            <div key={o.value} className="flex items-center gap-1.5">
              <RadioGroupItem value={o.value} id={`${field.id}-${o.value}`} />
              <Label htmlFor={`${field.id}-${o.value}`} className="text-sm cursor-pointer">{o.label}</Label>
            </div>
          ))}
        </RadioGroup>
      )
      break
    }

    case "date":
      control = (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn(common, "justify-start text-left font-normal h-9", !value && "text-muted-foreground")} disabled={disabled}>
              <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
              {value ? format(new Date(value as string), "dd MMM yyyy") : <span>{field.placeholder || "Pick a date"}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={value ? new Date(value as string) : undefined} onSelect={(d) => onChange(d?.toISOString())} initialFocus />
          </PopoverContent>
        </Popover>
      )
      break

    case "time":
      control = (
        <Input id={field.id} type="time" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={common} />
      )
      break

    case "datetime":
      control = (
        <Input id={field.id} type="datetime-local" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={common} />
      )
      break

    case "file":
    case "image":
      control = (
        <div className="flex h-9 items-center gap-2 rounded-md border border-dashed border-input bg-muted/30 px-3">
          <input
            id={field.id}
            type="file"
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0]?.name || "")}
            disabled={disabled}
          />
          <Button type="button" variant="ghost" size="sm" asChild disabled={disabled}>
            <label htmlFor={field.id} className="cursor-pointer text-xs gap-1.5 flex items-center">
              <Plus className="h-3.5 w-3.5" /> Upload
            </label>
          </Button>
          {value ? <span className="text-xs text-muted-foreground truncate">{String(value)}</span> : <span className="text-xs text-muted-foreground">{field.placeholder || "No file chosen"}</span>}
        </div>
      )
      break

    case "divider":
      return <div className="sm:col-span-2 h-px bg-border my-2" />

    default:
      control = (
        <Input id={field.id} placeholder={field.placeholder} value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)} disabled={disabled || field.readOnly} className={common} />
      )
  }

  return (
    <div className={cn("space-y-0", field.width !== "full" && "min-w-0")}>
      {field.type !== "checkbox" && field.type !== "divider" && labelEl}
      {control}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ---------- main dynamic form ----------

interface DynamicFormProps {
  schema: FormSchema
  initialValues?: FormValues
  onSubmit: (values: FormValues) => void | Promise<void>
  onCancel?: () => void
  submitLabel?: string
  loading?: boolean
  className?: string
  layout?: "sections" | "flat"
}

export function DynamicForm({
  schema, initialValues, onSubmit, onCancel, submitLabel = "Save",
  loading, className, layout = "sections",
}: DynamicFormProps) {
  const { control, handleSubmit, watch, formState: { errors }, reset } = useForm<FieldValues>({
    defaultValues: initialValues || {},
    mode: "onSubmit",
  })

  React.useEffect(() => {
    reset(initialValues || {})
  }, [initialValues, reset])

  const watchedValues = watch()
  const currentValues = { ...initialValues, ...watchedValues } as FormValues

  const sections = schema.sections || []

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v as FormValues))} className={cn("space-y-5", className)}>
      {layout === "sections" && sections.length > 1 ? (
        <Accordion type="multiple" defaultValue={sections.map((s) => s.id)} className="space-y-3">
          {sections.map((section) => (
            <AccordionItem key={section.id} value={section.id} className="rounded-xl border bg-card overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40">
                <div className="flex items-center gap-2 text-left">
                  <span className="font-semibold text-sm">{section.title}</span>
                  {section.description && <span className="text-xs text-muted-foreground hidden sm:inline">— {section.description}</span>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {section.fields.filter((f) => fieldVisible(f, currentValues)).map((field) => (
                    <div key={field.id} className={widthClass(field.width)}>
                      <Controller
                        control={control}
                        name={field.key}
                        rules={{
                          required: field.validation?.required ? field.validation.message || "This field is required" : false,
                          min: field.validation?.min !== undefined ? { value: field.validation.min, message: `Min ${field.validation.min}` } : undefined,
                          max: field.validation?.max !== undefined ? { value: field.validation.max, message: `Max ${field.validation.max}` } : undefined,
                          minLength: field.validation?.minLength !== undefined ? { value: field.validation.minLength, message: `Min ${field.validation.minLength} chars` } : undefined,
                          maxLength: field.validation?.maxLength !== undefined ? { value: field.validation.maxLength, message: `Max ${field.validation.maxLength} chars` } : undefined,
                          pattern: field.validation?.pattern ? { value: new RegExp(field.validation.pattern), message: "Invalid format" } : undefined,
                        }}
                        render={({ field: f, fieldState }) => (
                          <FieldRenderer
                            field={field}
                            value={f.value}
                            onChange={f.onChange}
                            error={fieldState.error?.message}
                          />
                        )}
                      />
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        sections.map((section) => (
          <Card key={section.id} className="border-border/70">
            {section.title && (
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{section.title}</CardTitle>
                {section.description && <CardDescription className="text-xs">{section.description}</CardDescription>}
              </CardHeader>
            )}
            <CardContent className={cn(section.title && "pt-0")}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {section.fields.filter((f) => fieldVisible(f, currentValues)).map((field) => (
                  <div key={field.id} className={widthClass(field.width)}>
                    <Controller
                      control={control}
                      name={field.key}
                      rules={{
                        required: field.validation?.required ? field.validation.message || "This field is required" : false,
                        min: field.validation?.min !== undefined ? { value: field.validation.min, message: `Min ${field.validation.min}` } : undefined,
                        max: field.validation?.max !== undefined ? { value: field.validation.max, message: `Max ${field.validation.max}` } : undefined,
                        minLength: field.validation?.minLength !== undefined ? { value: field.validation.minLength, message: `Min ${field.validation.minLength} chars` } : undefined,
                        maxLength: field.validation?.maxLength !== undefined ? { value: field.validation.maxLength, message: `Max ${field.validation.maxLength} chars` } : undefined,
                        pattern: field.validation?.pattern ? { value: new RegExp(field.validation.pattern), message: "Invalid format" } : undefined,
                      }}
                      render={({ field: f, fieldState }) => (
                        <FieldRenderer field={field} value={f.value} onChange={f.onChange} error={fieldState.error?.message} />
                      )}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <div className="flex items-center justify-end gap-2 pt-2 sticky bottom-0 bg-background/80 backdrop-blur-sm -mx-1 px-1 py-2 border-t">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            <X className="h-4 w-4 mr-1.5" /> Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={loading} className="min-w-24">
          {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

// ---------- a lightweight read-only value viewer for detail panels ----------

export function FieldValue({ field, value }: { field: FormFieldDef; value: unknown }) {
  if (value === undefined || value === null || value === "") {
    return <span className="text-muted-foreground/50 text-sm italic">—</span>
  }
  let display: string = String(value)
  if (field.type === "date") {
    try { display = format(new Date(value as string), "dd MMM yyyy") } catch {}
  }
  if (field.type === "currency") display = `₹${Number(value).toLocaleString("en-IN")}`
  if (field.type === "percentage") display = `${value}%`
  if (field.type === "switch" || field.type === "checkbox") display = value ? "Yes" : "No"
  if (field.type === "multiselect" && Array.isArray(value)) display = (value as string[]).join(", ")
  return <span className="text-sm font-medium">{display}</span>
}
