import NextAuth, { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"
import { loginSchema } from "@/lib/validations/auth"
import { createAuditLog } from "@/lib/services/audit-logger"

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        // Validate input
        const validatedFields = loginSchema.safeParse(credentials)
        if (!validatedFields.success) {
          return null
        }

        const { email, password } = validatedFields.data

        // Get user
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            organizations: {
              where: { status: 'ACTIVE' },
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    subdomain: true,
                    features: true,
                    status: true,
                  }
                }
              }
            }
          }
        })

        if (!user || user.deletedAt) {
          return null
        }

        // Check status
        if (user.status !== 'ACTIVE') {
          throw new Error('Account inactive or suspended')
        }

        // Check if locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error('Account locked due to too many failed attempts')
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash)

        if (!isValidPassword) {
          // Increment failed attempts
          const failedAttempts = user.failedLoginAttempts + 1
          const lockAccount = failedAttempts >= 5

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: failedAttempts,
              lockedUntil: lockAccount
                ? new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
                : null
            }
          })

          return null
        }

        // Success - reset failed attempts
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLogin: new Date(),
            lastActivity: new Date()
          }
        })

        // Audit log
        await createAuditLog({
          userId: user.id,
          organizationId: user.organizations[0]?.organizationId || null,
          action: 'login',
          ipAddress: (req as any).headers?.get?.('x-forwarded-for') || 'unknown',
          userAgent: (req as any).headers?.get?.('user-agent') || 'unknown'
        })

        // Return user for session
        return {
          id: user.id.toString(),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          isIndependentClinician: user.isIndependentClinician,
          organizations: user.organizations.map(ou => ({
            id: ou.organization.id,
            name: ou.organization.name,
            subdomain: ou.organization.subdomain,
            role: ou.role,
            features: ou.organization.features
          }))
        } as any
      }
    })
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.firstName = (user as any).firstName
        token.lastName = (user as any).lastName
        token.isIndependentClinician = (user as any).isIndependentClinician
        token.organizations = (user as any).organizations
        token.currentOrgId = (user as any).organizations?.[0]?.id || null
      }

      // Update session (from client)
      if (trigger === "update" && session) {
        if (session.currentOrgId) {
          token.currentOrgId = session.currentOrgId
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
        session.user.isIndependentClinician = token.isIndependentClinician as boolean
        session.user.organizations = token.organizations as any[]
        session.user.currentOrgId = token.currentOrgId as number | null

        // Get current org details
        const currentOrg = (token.organizations as any[])?.find(
          (org: any) => org.id === token.currentOrgId
        )
        session.user.currentOrg = currentOrg || null
      }
      return session
    }
  },

  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login'
  },

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 15 * 60, // 15 minutes
  },

  secret: process.env.NEXTAUTH_SECRET,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
