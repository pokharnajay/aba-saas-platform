'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/auth-config'
import {
  hasValidSession,
  canInviteUsers,
  canManageUsers,
  canCreateClinicalManager,
  canCreateStaff,
  canChangeUserPassword,
  canUpdateUserRole,
  getAllowedRolesToCreate,
  hasRole,
} from '@/lib/auth/permissions'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import crypto from 'crypto'
import { sendStaffWelcomeEmail, sendPasswordRegeneratedEmail } from '@/lib/services/email'
import { createAuditLog } from '@/lib/services/audit-logger'

// Generate a secure random password
function generateSecurePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*'

  // Ensure at least one of each required type
  let password = ''
  password += uppercase[crypto.randomInt(uppercase.length)]
  password += lowercase[crypto.randomInt(lowercase.length)]
  password += numbers[crypto.randomInt(numbers.length)]
  password += special[crypto.randomInt(special.length)]

  // Fill the rest with random characters from all sets
  const allChars = uppercase + lowercase + numbers + special
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)]
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => crypto.randomInt(3) - 1)
    .join('')
}

const createStaffSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  role: z.enum(['CLINICAL_MANAGER', 'BCBA', 'RBT', 'BT']),
})

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
})

const resetPasswordSchema = z.object({
  userId: z.number(),
})

/**
 * Create a new staff member with auto-generated password
 * - Only ORG_ADMIN can create CLINICAL_MANAGER
 * - ORG_ADMIN and CLINICAL_MANAGER can create BCBA, RBT, BT
 */
export async function createStaffMember(data: z.infer<typeof createStaffSchema>) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    const validatedData = createStaffSchema.parse(data)

    // Check role-based permissions
    if (validatedData.role === 'CLINICAL_MANAGER') {
      if (!canCreateClinicalManager(session)) {
        return { error: 'Only Organization Admins can create Clinical Manager accounts' }
      }
    } else {
      if (!canCreateStaff(session)) {
        return { error: 'You do not have permission to create staff accounts' }
      }
    }

    // Check if role is in allowed list for this user
    const allowedRoles = getAllowedRolesToCreate(session)
    if (!allowedRoles.includes(validatedData.role)) {
      return { error: `You cannot create accounts with the ${validatedData.role} role` }
    }

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
        return { error: 'This email is already registered in your organization' }
      }

      return { error: 'This email is already registered. Contact support if you need to add this user.' }
    }

    // Generate secure auto-generated password
    const generatedPassword = generateSecurePassword(14)
    const passwordHash = await bcrypt.hash(generatedPassword, 10)

    // Create new user in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: validatedData.email.toLowerCase(),
          passwordHash,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          phone: validatedData.phone || null,
          status: 'ACTIVE',
          emailVerified: false, // Will need to verify on first login
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

    // Get organization details for welcome email
    const organization = await prisma.organization.findUnique({
      where: { id: currentOrgId },
      select: { name: true, subdomain: true }
    })

    // Format role name for display
    const roleDisplayNames: Record<string, string> = {
      'CLINICAL_MANAGER': 'Clinical Manager',
      'BCBA': 'BCBA (Board Certified Behavior Analyst)',
      'RBT': 'RBT (Registered Behavior Technician)',
      'BT': 'Behavior Technician',
    }
    const roleName = roleDisplayNames[validatedData.role] || validatedData.role

    // Build login URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const loginUrl = organization?.subdomain
      ? `${baseUrl.replace('://', `://${organization.subdomain}.`).replace('localhost', 'localhost')}`
      : baseUrl

    // Send welcome email with login credentials
    const emailResult = await sendStaffWelcomeEmail(
      validatedData.email.toLowerCase(),
      validatedData.firstName,
      validatedData.lastName,
      generatedPassword,
      organization?.name || 'ABA Practice Manager',
      loginUrl,
      roleName
    )

    if (!emailResult.success) {
      console.error('Failed to send welcome email:', emailResult.error)
      // Log the failure but don't fail the operation
      await createAuditLog({
        organizationId: currentOrgId,
        userId: parseInt(session.user.id),
        action: 'staff_welcome_email_failed',
        resourceType: 'user',
        resourceId: result.user.id,
        changes: { error: emailResult.error, targetEmail: validatedData.email }
      })
    } else {
      // Log successful creation and email
      await createAuditLog({
        organizationId: currentOrgId,
        userId: parseInt(session.user.id),
        action: 'staff_member_created',
        resourceType: 'user',
        resourceId: result.user.id,
        changes: {
          email: validatedData.email,
          role: validatedData.role,
          welcomeEmailSent: true
        }
      })
    }

    // Return success with generated password (to be shown ONCE to admin)
    return {
      success: true,
      userId: result.user.id,
      generatedPassword,
      emailSent: emailResult.success,
      message: emailResult.success
        ? `Account created for ${validatedData.firstName} ${validatedData.lastName}. A welcome email with login credentials has been sent to ${validatedData.email}.`
        : `Account created for ${validatedData.firstName} ${validatedData.lastName}. Note: Welcome email could not be sent. Please share the temporary password securely.`,
    }
  } catch (error: any) {
    console.error('Create staff member error:', error)
    return { error: error.message || 'Failed to create staff member' }
  }
}

/**
 * Reset a user's password (generates new auto-generated password)
 * - Only ORG_ADMIN can reset any password
 * - CLINICAL_MANAGER can reset BCBA, RBT, BT passwords
 */
export async function resetUserPassword(userId: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  // Check permission
  if (!canChangeUserPassword(session, userId)) {
    return { error: 'You do not have permission to reset this user\'s password' }
  }

  try {
    // Verify user is in this organization
    const orgUser = await prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: currentOrgId,
          userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!orgUser) {
      return { error: 'User not found in your organization' }
    }

    // CLINICAL_MANAGER cannot reset ORG_ADMIN or other CLINICAL_MANAGER passwords
    const currentRole = session.user.currentOrg?.role
    if (currentRole === 'CLINICAL_MANAGER' || currentRole === 'CLINICAL_DIRECTOR') {
      if (orgUser.role === 'ORG_ADMIN' || orgUser.role === 'CLINICAL_MANAGER' || orgUser.role === 'CLINICAL_DIRECTOR') {
        return { error: 'You cannot reset the password of an admin or clinical manager' }
      }
    }

    // Generate new secure password
    const generatedPassword = generateSecurePassword(14)
    const passwordHash = await bcrypt.hash(generatedPassword, 10)

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })

    // Get organization and current user details for email
    const organization = await prisma.organization.findUnique({
      where: { id: currentOrgId },
      select: { name: true }
    })

    const currentUser = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { firstName: true, lastName: true }
    })

    const regeneratedByName = currentUser
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : 'An administrator'

    // Send email notification with new password
    const loginUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const emailResult = await sendPasswordRegeneratedEmail(
      orgUser.user.email,
      orgUser.user.firstName || 'Team Member',
      generatedPassword,
      organization?.name || 'ABA Practice Manager',
      loginUrl,
      regeneratedByName
    )

    // Log the action
    await createAuditLog({
      organizationId: currentOrgId,
      userId: parseInt(session.user.id),
      action: 'password_reset_by_admin',
      resourceType: 'user',
      resourceId: userId,
      changes: {
        targetEmail: orgUser.user.email,
        emailNotificationSent: emailResult.success
      }
    })

    revalidatePath('/team')

    return {
      success: true,
      generatedPassword,
      userName: `${orgUser.user.firstName} ${orgUser.user.lastName}`,
      emailSent: emailResult.success,
      message: emailResult.success
        ? `Password reset for ${orgUser.user.firstName} ${orgUser.user.lastName}. An email with the new password has been sent to ${orgUser.user.email}.`
        : `Password reset for ${orgUser.user.firstName} ${orgUser.user.lastName}. Note: Email notification could not be sent. Please share the new temporary password securely.`,
    }
  } catch (error: any) {
    console.error('Reset password error:', error)
    return { error: error.message || 'Failed to reset password' }
  }
}

/**
 * Get all users in the organization
 */
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
          phone: true,
          status: true,
          lastLogin: true,
          createdAt: true,
        },
      },
      invitedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [
      { role: 'asc' },
      { createdAt: 'desc' },
    ],
  })

  return orgUsers.map((ou) => ({
    id: ou.user.id,
    email: ou.user.email,
    firstName: ou.user.firstName,
    lastName: ou.user.lastName,
    phone: ou.user.phone,
    role: ou.role,
    status: ou.user.status,
    orgStatus: ou.status,
    lastLogin: ou.user.lastLogin,
    joinedAt: ou.joinedAt,
    createdAt: ou.user.createdAt,
    invitedBy: ou.invitedBy
      ? `${ou.invitedBy.firstName} ${ou.invitedBy.lastName}`
      : null,
  }))
}

/**
 * Update a user's role
 * - Only ORG_ADMIN can change to CLINICAL_MANAGER
 * - ORG_ADMIN and CLINICAL_MANAGER can change to BCBA, RBT, BT
 */
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
    return { error: 'Insufficient permissions to manage users' }
  }

  // Check if user can assign this specific role
  if (!canUpdateUserRole(session, newRole as any)) {
    return { error: `You cannot assign the ${newRole} role` }
  }

  try {
    // Cannot change your own role
    if (userId === parseInt(session.user.id)) {
      return { error: 'You cannot change your own role' }
    }

    // Get current user's role to check if demotion is valid
    const currentOrgUser = await prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: currentOrgId,
          userId,
        },
      },
    })

    if (!currentOrgUser) {
      return { error: 'User not found in your organization' }
    }

    // CLINICAL_MANAGER cannot change ORG_ADMIN or other CLINICAL_MANAGER roles
    const currentRole = session.user.currentOrg?.role
    if (currentRole === 'CLINICAL_MANAGER' || currentRole === 'CLINICAL_DIRECTOR') {
      if (currentOrgUser.role === 'ORG_ADMIN' || currentOrgUser.role === 'CLINICAL_MANAGER' || currentOrgUser.role === 'CLINICAL_DIRECTOR') {
        return { error: 'You cannot modify the role of an admin or clinical manager' }
      }
    }

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

/**
 * Deactivate a user in the organization
 */
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
    return { error: 'Insufficient permissions to manage users' }
  }

  try {
    // Cannot deactivate yourself
    if (userId === parseInt(session.user.id)) {
      return { error: 'You cannot deactivate your own account' }
    }

    // Get current user's role
    const currentOrgUser = await prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: currentOrgId,
          userId,
        },
      },
    })

    if (!currentOrgUser) {
      return { error: 'User not found in your organization' }
    }

    // CLINICAL_MANAGER cannot deactivate ORG_ADMIN or other CLINICAL_MANAGERs
    const currentRole = session.user.currentOrg?.role
    if (currentRole === 'CLINICAL_MANAGER' || currentRole === 'CLINICAL_DIRECTOR') {
      if (currentOrgUser.role === 'ORG_ADMIN' || currentOrgUser.role === 'CLINICAL_MANAGER' || currentOrgUser.role === 'CLINICAL_DIRECTOR') {
        return { error: 'You cannot deactivate an admin or clinical manager' }
      }
    }

    await prisma.organizationUser.update({
      where: {
        organizationId_userId: {
          organizationId: currentOrgId,
          userId,
        },
      },
      data: {
        status: 'INACTIVE',
      },
    })

    // Also mark user as inactive
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

/**
 * Reactivate a user in the organization
 */
export async function reactivateUser(userId: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  if (!canManageUsers(session)) {
    return { error: 'Insufficient permissions to manage users' }
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
        status: 'ACTIVE',
      },
    })

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    })

    revalidatePath('/team')
    return { success: true }
  } catch (error: any) {
    console.error('Reactivate user error:', error)
    return { error: error.message || 'Failed to reactivate user' }
  }
}

/**
 * Update own profile (name, phone only - not password)
 */
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

// Legacy function for backward compatibility - redirects to createStaffMember
export async function inviteUser(data: any) {
  return createStaffMember(data)
}
