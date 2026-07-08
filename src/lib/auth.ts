import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db, DEFAULT_TENANT_ID } from "@/lib/db"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        const user = await db.user.findUnique({
          where: {
            tenantId_email: {
              tenantId: DEFAULT_TENANT_ID,
              email: credentials.email.toLowerCase().trim(),
            },
          },
        })

        if (!user || !user.isActive) {
          throw new Error("Invalid credentials")
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("Account temporarily locked. Try again later.")
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)

        if (!isValid) {
          const failedAttempts = user.failedAttempts + 1
          const shouldLock = failedAttempts >= 5
          await db.user.update({
            where: { id: user.id },
            data: {
              failedAttempts,
              lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null,
            },
          })
          throw new Error("Invalid credentials")
        }

        await db.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          employeeId: user.employeeId,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.tenantId = user.tenantId
        token.employeeId = user.employeeId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.tenantId = token.tenantId as string
        session.user.employeeId = token.employeeId as string | null
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
