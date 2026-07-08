'use client'

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, LogIn } from "lucide-react"
import { toast } from "sonner"
import { apiFetch, setToken } from "@/lib/api-client"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const callbackUrl = searchParams.get("callbackUrl") || "/"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Please enter email and password")
      return
    }
    setLoading(true)
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.detail || "Invalid credentials")
      } else {
        setToken(data.access_token)
        toast.success("Login successful")
        // Hard redirect to ensure cookie is picked up by middleware
        window.location.href = callbackUrl
      }
    } catch {
      toast.error("Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSetup() {
    setLoading(true)
    try {
      const res = await apiFetch("/api/auth/setup", { method: "POST" })
      const data = await res.json()
      if (data?.credentials) {
        setEmail(data.credentials.email)
        setPassword(data.credentials.password)
        toast.success("Default admin created. Click Sign In to continue.")
      } else {
        toast.info("Default admin already exists. Use admin@nexushr.com / admin123456")
        setEmail("admin@nexushr.com")
        setPassword("admin123456")
      }
    } catch {
      toast.error("Setup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <LogIn className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Nexus HR</CardTitle>
          <CardDescription>Sign in to your HRMS account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@nexushr.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button variant="link" onClick={handleSetup} disabled={loading} className="text-sm text-muted-foreground">
              Create default admin account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
