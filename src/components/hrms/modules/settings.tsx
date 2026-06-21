'use client'

import * as React from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  Building2, SlidersHorizontal, Palette, ShieldCheck, Sun, Moon, Check,
  Save, Monitor, Database, Lock,
} from "lucide-react"

import { PageHeader, SectionCard } from "@/components/hrms/ui"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

// ---------- module list ----------
const ALL_MODULES = [
  { id: "dashboard", label: "Dashboard", desc: "Analytics & insights" },
  { id: "organization", label: "Organization", desc: "Entities, branches, departments" },
  { id: "employees", label: "Employees", desc: "Employee master & lifecycle" },
  { id: "leave", label: "Leave", desc: "Types, policies, applications" },
  { id: "shift", label: "Shifts", desc: "Shift definitions & assignments" },
  { id: "roster", label: "Roster", desc: "Roster planning & publishing" },
  { id: "attendance", label: "Attendance", desc: "Daily attendance tracking" },
  { id: "holiday", label: "Holidays", desc: "Holiday calendar" },
  { id: "asset", label: "Assets", desc: "Asset master & assignment" },
  { id: "forms", label: "Form Builder", desc: "Dynamic form schemas" },
  { id: "workflows", label: "Workflows", desc: "Approval workflow engine" },
  { id: "announcements", label: "Announcements", desc: "Company announcements" },
]

// ---------- accent colors (decorative) ----------
const ACCENT_COLORS = [
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Coral", value: "#f43f5e" },
]

export function SettingsModule() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Configure your tenant, modules, appearance, and security policies."
        icon={SlidersHorizontal}
        badge={<Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0">ACME Corporation</Badge>}
      />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="general" className="gap-1.5"><Building2 className="h-4 w-4" /> General</TabsTrigger>
          <TabsTrigger value="modules" className="gap-1.5"><SlidersHorizontal className="h-4 w-4" /> Modules</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5"><Palette className="h-4 w-4" /> Appearance</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><ShieldCheck className="h-4 w-4" /> Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab />
        </TabsContent>
        <TabsContent value="modules">
          <ModulesTab />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// General tab — tenant profile form (hardcoded ACME defaults)
// ============================================================
function GeneralTab() {
  const [form, setForm] = React.useState({
    name: "ACME Corporation",
    legalName: "ACME Services Pvt Ltd",
    code: "ACME",
    country: "India",
    currency: "INR",
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    financialYear: "Apr-Mar",
    brandColor: "#10b981",
  })
  const [saving, setSaving] = React.useState(false)

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const onSave = async () => {
    setSaving(true)
    // Demo only — would PATCH /api/tenant in a real backend
    await new Promise((r) => setTimeout(r, 600))
    setSaving(false)
    toast.success("Settings saved (demo)")
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Tenant Profile"
        description="Basic information about your organization. Used across the platform."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <Field label="Display Name" htmlFor="name">
            <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="Legal Name" htmlFor="legalName">
            <Input id="legalName" value={form.legalName} onChange={(e) => update("legalName", e.target.value)} />
          </Field>
          <Field label="Tenant Code" htmlFor="code" hint="Short unique code (immutable).">
            <Input id="code" value={form.code} readOnly className="bg-muted/40 cursor-not-allowed" />
          </Field>
          <Field label="Country" htmlFor="country">
            <Select value={form.country} onValueChange={(v) => update("country", v)}>
              <SelectTrigger id="country"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="India">India</SelectItem>
                <SelectItem value="United States">United States</SelectItem>
                <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                <SelectItem value="Singapore">Singapore</SelectItem>
                <SelectItem value="UAE">UAE</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Currency" htmlFor="currency">
            <Select value={form.currency} onValueChange={(v) => update("currency", v)}>
              <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">INR — Indian Rupee</SelectItem>
                <SelectItem value="USD">USD — US Dollar</SelectItem>
                <SelectItem value="EUR">EUR — Euro</SelectItem>
                <SelectItem value="GBP">GBP — Pound Sterling</SelectItem>
                <SelectItem value="AED">AED — UAE Dirham</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Timezone" htmlFor="timezone">
            <Select value={form.timezone} onValueChange={(v) => update("timezone", v)}>
              <SelectTrigger id="timezone"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date Format" htmlFor="dateFormat">
            <Select value={form.dateFormat} onValueChange={(v) => update("dateFormat", v)}>
              <SelectTrigger id="dateFormat"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                <SelectItem value="DD-MMM-YYYY">DD-MMM-YYYY</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Financial Year" htmlFor="financialYear">
            <Select value={form.financialYear} onValueChange={(v) => update("financialYear", v)}>
              <SelectTrigger id="financialYear"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Apr-Mar">April – March (India)</SelectItem>
                <SelectItem value="Jan-Dec">January – December</SelectItem>
                <SelectItem value="Jul-Jun">July – June (Australia)</SelectItem>
                <SelectItem value="Oct-Sep">October – September (US)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Brand Color" htmlFor="brandColor" hint="Used in sidebar, headers, charts.">
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="color"
                  value={form.brandColor}
                  onChange={(e) => update("brandColor", e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
                />
              </div>
              <Input
                value={form.brandColor}
                onChange={(e) => update("brandColor", e.target.value)}
                className="max-w-[140px]"
              />
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Preview"
        description="How your branding appears to users."
      >
        <div className="flex items-center gap-3 pt-1">
          <div
            className="grid h-12 w-12 place-items-center rounded-xl text-primary-foreground font-semibold"
            style={{ background: form.brandColor }}
          >
            ACME
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{form.name}</p>
            <p className="text-xs text-muted-foreground">
              {form.legalName} · {form.country} · {form.currency} · {form.timezone}
            </p>
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => toast.info("Reverted (demo)")}>Reset</Button>
        <Button onClick={onSave} disabled={saving} className="gap-1.5">
          {saving ? <Save className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// Modules tab — toggle switches
// ============================================================
function ModulesTab() {
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>(
    () => Object.fromEntries(ALL_MODULES.map((m) => [m.id, true]))
  )
  const toggle = (id: string) => setEnabled((s) => ({ ...s, [id]: !s[id] }))

  return (
    <SectionCard
      title="Enabled Modules"
      description="Toggle individual modules on or off. Disabled modules are hidden from the sidebar."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {ALL_MODULES.map((m) => (
          <Card key={m.id} className="border-border/60 shadow-soft">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground truncate">{m.desc}</p>
              </div>
              <Switch
                checked={enabled[m.id]}
                onCheckedChange={() => toggle(m.id)}
                aria-label={`Toggle ${m.label}`}
              />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <Button onClick={() => toast.success("Module preferences saved (demo)")} className="gap-1.5">
          <Save className="h-4 w-4" /> Save Preferences
        </Button>
      </div>
    </SectionCard>
  )
}

// ============================================================
// Appearance tab — theme + accent picker
// ============================================================
function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const [accent, setAccent] = React.useState("#10b981")

  return (
    <div className="space-y-4">
      <SectionCard
        title="Theme"
        description="Choose between light and dark mode."
      >
        <div className="grid grid-cols-2 gap-3 max-w-md pt-1">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all hover:bg-muted/40 ${
              theme === "light" ? "border-emerald-500 bg-emerald-500/5" : "border-border"
            }`}
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-100 text-amber-700">
              <Sun className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">Light</span>
            {theme === "light" && (
              <Check className="absolute top-2 right-2 h-4 w-4 text-emerald-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all hover:bg-muted/40 ${
              theme === "dark" ? "border-emerald-500 bg-emerald-500/5" : "border-border"
            }`}
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-800 text-slate-200">
              <Moon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">Dark</span>
            {theme === "dark" && (
              <Check className="absolute top-2 right-2 h-4 w-4 text-emerald-500" />
            )}
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Accent Color"
        description="Pick the primary accent color used across buttons, links, and highlights."
      >
        <div className="flex flex-wrap gap-3 pt-1">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => { setAccent(c.value); toast.success(`Accent set to ${c.name} (demo)`) }}
              className={`relative h-11 w-11 rounded-full border-2 transition-all hover:scale-105 ${
                accent === c.value ? "border-foreground" : "border-transparent"
              }`}
              style={{ background: c.value }}
              aria-label={`Accent ${c.name}`}
              title={c.name}
            >
              {accent === c.value && (
                <Check className="absolute inset-0 m-auto h-5 w-5 text-white" />
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Accent selection is decorative in this demo. The emerald palette is applied throughout the app.
        </p>
      </SectionCard>

      <SectionCard
        title="System"
        description="Other display preferences."
      >
        <div className="space-y-3 pt-1">
          <ToggleRow
            icon={Monitor}
            label="Compact mode"
            desc="Reduce padding and font sizes for denser layouts."
          />
          <ToggleRow
            icon={Database}
            label="Show chart gridlines"
            desc="Display background gridlines on dashboard charts."
            defaultOn
          />
        </div>
      </SectionCard>
    </div>
  )
}

// ============================================================
// Security tab — password policy (decorative)
// ============================================================
function SecurityTab() {
  const [policy, setPolicy] = React.useState({
    minLength: "8",
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
    expiryDays: "90",
    historyCount: "5",
    maxAttempts: "5",
    lockoutMinutes: "15",
    twoFactorRequired: false,
  })
  const update = (k: keyof typeof policy, v: any) => setPolicy((p) => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4">
      <SectionCard
        title="Password Policy"
        description="Define rules for user passwords. Changes apply to new passwords only."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <Field label="Minimum Length" htmlFor="minLength">
            <Input id="minLength" type="number" value={policy.minLength} onChange={(e) => update("minLength", e.target.value)} />
          </Field>
          <Field label="Password Expiry (days)" htmlFor="expiryDays">
            <Input id="expiryDays" type="number" value={policy.expiryDays} onChange={(e) => update("expiryDays", e.target.value)} />
          </Field>
          <Field label="Password History (count)" htmlFor="historyCount" hint="Prevent reusing last N passwords.">
            <Input id="historyCount" type="number" value={policy.historyCount} onChange={(e) => update("historyCount", e.target.value)} />
          </Field>
          <Field label="Max Login Attempts" htmlFor="maxAttempts">
            <Input id="maxAttempts" type="number" value={policy.maxAttempts} onChange={(e) => update("maxAttempts", e.target.value)} />
          </Field>
          <Field label="Lockout Duration (minutes)" htmlFor="lockoutMinutes">
            <Input id="lockoutMinutes" type="number" value={policy.lockoutMinutes} onChange={(e) => update("lockoutMinutes", e.target.value)} />
          </Field>
        </div>

        <div className="mt-4 space-y-2">
          <PolicyToggle label="Require uppercase letter (A-Z)" checked={policy.requireUppercase} onChange={(v) => update("requireUppercase", v)} />
          <PolicyToggle label="Require lowercase letter (a-z)" checked={policy.requireLowercase} onChange={(v) => update("requireLowercase", v)} />
          <PolicyToggle label="Require number (0-9)" checked={policy.requireNumber} onChange={(v) => update("requireNumber", v)} />
          <PolicyToggle label="Require special character (!@#$%)" checked={policy.requireSpecial} onChange={(v) => update("requireSpecial", v)} />
        </div>
      </SectionCard>

      <SectionCard
        title="Two-Factor Authentication"
        description="Strengthen sign-in security with a second factor."
      >
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Require 2FA for all users</p>
              <p className="text-xs text-muted-foreground">Enforce TOTP-based two-factor authentication at sign-in.</p>
            </div>
          </div>
          <Switch checked={policy.twoFactorRequired} onCheckedChange={(v) => update("twoFactorRequired", v)} />
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button onClick={() => toast.success("Security policy saved (demo)")} className="gap-1.5">
          <ShieldCheck className="h-4 w-4" /> Save Security Policy
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// Small building blocks
// ============================================================
function Field({
  label, htmlFor, hint, children,
}: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ToggleRow({
  icon: Icon, label, desc, defaultOn,
}: { icon: any; label: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = React.useState(!!defaultOn)
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Switch checked={on} onCheckedChange={setOn} />
    </div>
  )
}

function PolicyToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-t border-border/40 first:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
