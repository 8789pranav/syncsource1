'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Megaphone, Plus, Pencil, Trash2, Pin, Calendar, Users } from "lucide-react"

import { PageHeader, ListToolbar, EmptyState, useAsyncAction } from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { announcementFormSchema } from "@/lib/form-schemas"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface Announcement {
  id: string
  title: string
  body?: string | null
  audience: string
  audienceRef?: string | null
  publishDate: string
  expiryDate?: string | null
  priority: string
  createdAt: string
}

const priorityStyles: Record<string, { border: string; badge: string; dot: string }> = {
  Low: { border: "", badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  Normal: { border: "border-l-emerald-500", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400", dot: "bg-emerald-500" },
  High: { border: "border-l-amber-500", badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400", dot: "bg-amber-500" },
  Urgent: { border: "border-l-rose-500", badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400", dot: "bg-rose-500" },
}

const audienceStyles: Record<string, string> = {
  All: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Entity: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
  Department: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Location: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
}

const fmt = (v?: string | null) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

export function AnnouncementsModule() {
  const [rows, setRows] = React.useState<Announcement[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Announcement | null>(null)
  const { loading: saving, run } = useAsyncAction()

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/announcements")
      const data = await res.json()
      setRows(data.items || [])
    } catch { toast.error("Failed to load announcements") }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  const filtered = rows.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()) || (r.body || "").toLowerCase().includes(search.toLowerCase()))

  const handleSave = async (values: any) => {
    await run(async () => {
      const isEdit = !!editing
      const url = isEdit ? `/api/announcements/${editing!.id}` : "/api/announcements"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Save failed")
      }
      toast.success(isEdit ? "Announcement updated" : "Announcement published")
      setOpen(false); setEditing(null); load()
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return
    const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Announcement deleted"); load() }
    else toast.error("Delete failed")
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Announcements"
        description="Publish company-wide updates, policy changes, and notices to your people."
        icon={Megaphone}
      />
      <ListToolbar search={search} onSearch={setSearch} onAdd={() => { setEditing(null); setOpen(true) }} addLabel="New Announcement" />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements" description="Publish your first announcement to keep your team informed." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a, i) => {
            const ps = priorityStyles[a.priority] || priorityStyles.Normal
            const isExpired = a.expiryDate && new Date(a.expiryDate) < new Date()
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className={cn("group h-full hover:shadow-card transition-all border-l-4", ps.border)}>
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className={cn("font-medium border-0", ps.badge)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full mr-1", ps.dot)} />
                          {a.priority}
                        </Badge>
                        <Badge variant="secondary" className={cn("font-medium border-0", audienceStyles[a.audience] || audienceStyles.All)}>
                          <Users className="h-3 w-3 mr-1" /> {a.audience}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(a); setOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => handleDelete(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-foreground line-clamp-2 flex items-start gap-1.5">
                      {(a.priority === "Urgent" || a.priority === "High") && <Pin className="h-3.5 w-3.5 mt-1 text-rose-500 shrink-0" />}
                      <span>{a.title}</span>
                    </h3>
                    {a.body && (
                      <p className="text-sm text-muted-foreground mt-1.5 line-clamp-4 flex-1 whitespace-pre-wrap">{a.body}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmt(a.publishDate)}</span>
                      {a.expiryDate && (
                        <span className={cn("flex items-center gap-1", isExpired && "text-rose-600 dark:text-rose-400")}>
                          <Calendar className="h-3 w-3" /> Exp: {fmt(a.expiryDate)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Announcement" : "New Announcement"}</DialogTitle>
            <DialogDescription>{editing ? "Update the announcement details." : "Publish a new announcement to your team."}</DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={announcementFormSchema}
            initialValues={editing || {}}
            onSubmit={handleSave}
            onCancel={() => { setOpen(false); setEditing(null) }}
            submitLabel={editing ? "Update" : "Publish"}
            loading={saving}
            layout="flat"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
