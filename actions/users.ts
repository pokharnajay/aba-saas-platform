'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/auth-config'
import { hasValidSession, canInviteUsers, canManageUsers } from '@/lib/auth/permissions'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const inviteUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['ORG_ADMIN', 'CLINICAL_DIRECTOR', 'BCBA', 'RBT', 'BT', 'HR_MANAGER']),
  password: z.string().min(8),
})

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
})

export async function inviteUser(data: z.infer<typeof inviteUserSchema>) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  if (!canInviteUsers(session)) {
    throw new Error('Insufficient permissions to invite users')
  }

  try {
    const validatedData = inviteUserSchema.parse(data)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    })

    if (existingUser) {
      // Check if already in organization
      const existingOrgUser = await prisma.organizationUser.findUnique({
        where: {
          organizationId_userId: {
            organizationId: currentOrgId,
            userId: existingUser.id,
          },
        },
      })

      if (existingOrgUser) {
        return { error: 'User already exists in this organization' }
      }

      // Add existing user to organization
      await prisma.organizationUser.create({
        data: {
          organizationId: currentOrgId,
          userId: existingUser.id,
          role: validatedData.role,
          status: 'ACTIVE',
          invitedById: parseInt(session.user.id),
          invitedAt: new Date(),
          joinedAt: new Date(),
        },
      })

      revalidatePath('/team')
      return { success: true, userId: existingUser.id }
    }

    // Create new user
    const passwordHash = await bcrypt.hash(validatedData.password, 10)

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: validatedData.email.toLowerCase(),
          passwordHash,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          status: 'ACTIVE',
        },
      })

      await tx.organizationUser.create({
        data: {
          organizationId: currentOrgId,
          userId: user.id,
          role: validatedData.role,
          status: 'ACTIVE',
          invitedById: parseInt(session.user.id),
          invitedAt: new Date(),
          joinedAt: new Date(),
        },
      })

      return { user }
    })

    revalidatePath('/team')
    return { success: true, userId: result.user.id }
  } catch (error: any) {
    console.error('Invite user error:', error)
    return { error: error.message || 'Failed to invite user' }
  }
}

export async function getOrganizationUsers() {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  const orgUsers = await prisma.organizationUser.findMany({
    where: {
      organizationId: currentOrgId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          lastLogin: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return orgUsers.map((ou) => ({
    id: ou.user.id,
    email: ou.user.email,
    firstName: ou.user.firstName,
    lastName: ou.user.lastName,
    role: ou.role,
    status: ou.user.status,
    orgStatus: ou.status,
    lastLogin: ou.user.lastLogin,
    joinedAt: ou.joinedAt,
  }))
}

export async function updateUserRole(userId: number, newRole: string) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  if (!canManageUsers(session)) {
    throw new Error('Insufficient permissions to manage users')
  }

  try {
    await prisma.organizationUser.update({
      where: {
        organizationId_userId: {
          organizationId: currentOrgId,
          userId,
        },
      },
      data: {
        role: newRole as any,
      },
    })

    revalidatePath('/team')
    return { success: true }
  } catch (error: any) {
    console.error('Update user role error:', error)
    return { error: error.message || 'Failed to update user role' }
  }
}

export async function deactivateUser(userId: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  if (!canManageUsers(session)) {
    throw new Error('Insufficient permissions to manage users')
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'INACTIVE' },
    })

    revalidatePath('/team')
    return { success: true }
  } catch (error: any) {
    console.error('Deactivate user error:', error)
    return { error: error.message || 'Failed to deactivate user' }
  }
}

export async function updateProfile(data: z.infer<typeof updateProfileSchema>) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  try {
    const validatedData = updateProfileSchema.parse(data)

    await prisma.user.update({
      where: { id: parseInt(session.user.id) },
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone || null,
      },
    })

    revalidatePath('/profile')
    return { success: true }
  } catch (error: any) {
    console.error('Update profile error:', error)
    return { error: error.message || 'Failed to update profile' }
  }
}
