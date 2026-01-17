'use server'

import { signIn, signOut } from '@/lib/auth/auth-config'
import { prisma } from '@/lib/db/prisma'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'
import bcrypt from 'bcryptjs'
import { AuthError } from 'next-auth'

export async function loginAction(email: string, password: string) {
  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid credentials' }
        default:
          return { error: 'Something went wrong' }
      }
    }
    throw error
  }
}

export async function logoutAction() {
  await signOut({ redirect: false })
}

export async function registerAction(data: RegisterInput) {
  try {
    // Validate input
    const validatedData = registerSchema.parse(data)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    })

    if (existingUser) {
      return { error: 'Email already registered' }
    }

    // Check if subdomain is available
    const existingOrg = await prisma.organization.findUnique({
      where: { subdomain: validatedData.subdomain.toLowerCase() },
    })

    if (existingOrg) {
      return { error: 'Subdomain already taken' }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 10)

    // Create organization and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: validatedData.organizationName,
          subdomain: validatedData.subdomain.toLowerCase(),
          status: 'TRIAL',
          subscriptionPlan: 'STARTER',
          features: {
            aiReviewer: false,
            trainingModule: false,
          },
        },
      })

      // Create user
      const user = await tx.user.create({
        data: {
          email: validatedData.email.toLowerCase(),
          passwordHash,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          phone: validatedData.phone || null,
          status: 'ACTIVE',
          emailVerified: false,
        },
      })

      // Link user to organization as ORG_ADMIN
      await tx.organizationUser.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: 'ORG_ADMIN',
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      })

      return { organization, user }
    })

    // Auto-login after registration
    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    })

    return { success: true }
  } catch (error) {
    console.error('Registration error:', error)
    return { error: 'Failed to create account' }
  }
}
