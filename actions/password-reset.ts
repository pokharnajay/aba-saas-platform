'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/auth-config'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { createAuditLog } from '@/lib/services/audit-logger'
import { hasValidSession, getCurrentRole } from '@/lib/auth/permissions'
import { createSecurityBreach } from '@/lib/services/breach-detection'
import { sendPasswordResetEmail, sendPasswordRegeneratedEmail } from '@/lib/services/email'

/**
 * Request password reset - ONLY for ORG_ADMIN and CLINICAL_MANAGER
 * Staff (BCBA, RBT, BT) must have their passwords reset by an admin
 */
export async function requestPasswordReset(email: string) {
  try {
    const normalizedEmail = email.toLowerCase().trim()

    // Find user and check their role
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        organizations: {
          where: { status: 'ACTIVE' },
          select: { role: true, organizationId: true }
        }
      }
    })

    // Always return success to prevent email enumeration
    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      return { success: true }
    }

    // Check if user has admin role in at least one organization
    const hasAdminRole = user.organizations.some(
      org => ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'].includes(org.role)
    )

    if (!hasAdminRole) {
      // Don't reveal that the user exists but can't reset
      // Log this as a potential security event
      await createAuditLog({
        organizationId: user.organizations[0]?.organizationId || 0,
        userId: user.id,
        action: 'password_reset_denied',
        resourceType: 'user',
        resourceId: user.id,
        changes: { reason: 'non_admin_role' }
      })
      return { success: true }
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetTokenHash,
        passwordResetExpires: resetExpires
      }
    })

    // Audit log
    await createAuditLog({
      organizationId: user.organizations[0]?.organizationId || 0,
      userId: user.id,
      action: 'password_reset_requested',
      resourceType: 'user',
      resourceId: user.id
    })

    // Send password reset email
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`

    const emailResult = await sendPasswordResetEmail(
      user.email,
      resetUrl,
      user.firstName || undefined
    )

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error)
      // Still return success to prevent email enumeration
      // But log the failure for monitoring
      await createAuditLog({
        organizationId: user.organizations[0]?.organizationId || 0,
        userId: user.id,
        action: 'password_reset_email_failed',
        resourceType: 'user',
        resourceId: user.id,
        changes: { error: emailResult.error }
      })
    }

    return { success: true }
  } catch (error: any) {
    console.error('Password reset request error:', error)
    return { error: 'Failed to process request' }
  }
}

/**
 * Validate reset token
 */
export async function validateResetToken(token: string) {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: new Date() },
        deletedAt: null,
        status: 'ACTIVE'
      }
    })

    if (!user) {
      return { valid: false, error: 'Invalid or expired reset token' }
    }

    return { valid: true }
  } catch (error: any) {
    console.error('Token validation error:', error)
    return { valid: false, error: 'Validation failed' }
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string) {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: new Date() },
        deletedAt: null,
        status: 'ACTIVE'
      },
      include: {
        organizations: {
          where: { status: 'ACTIVE' },
          select: { organizationId: true }
        }
      }
    })

    if (!user) {
      return { error: 'Invalid or expired reset token' }
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12)

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    })

    // Audit log
    await createAuditLog({
      organizationId: user.organizations[0]?.organizationId || 0,
      userId: user.id,
      action: 'password_reset_completed',
      resourceType: 'user',
      resourceId: user.id
    })

    return { success: true }
  } catch (error: any) {
    console.error('Password reset error:', error)
    return { error: 'Failed to reset password' }
  }
}

/**
 * Admin regenerates password for a staff member
 * - ORG_ADMIN can regenerate for anyone
 * - CLINICAL_MANAGER can regenerate for BCBA, RBT, BT only
 */
export async function regenerateStaffPassword(targetUserId: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  const currentUserId = parseInt(session.user.id)
  const currentRole = getCurrentRole(session)

  try {
    // Check if current user has permission to regenerate passwords
    if (!['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'].includes(currentRole || '')) {
      return { error: 'Insufficient permissions' }
    }

    // Get target user and their role in current organization
    const targetOrgUser = await prisma.organizationUser.findFirst({
      where: {
        userId: targetUserId,
        organizationId: currentOrgId,
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            deletedAt: true,
            status: true
          }
        }
      }
    })

    if (!targetOrgUser || targetOrgUser.user.deletedAt || targetOrgUser.user.status !== 'ACTIVE') {
      return { error: 'User not found' }
    }

    const targetRole = targetOrgUser.role

    // CLINICAL_MANAGER cannot regenerate for ORG_ADMIN or other CLINICAL_MANAGER
    if (currentRole === 'CLINICAL_MANAGER' || currentRole === 'CLINICAL_DIRECTOR') {
      if (['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'].includes(targetRole)) {
        return { error: 'Cannot regenerate password for this user' }
      }
    }

    // Cannot regenerate own password via this method
    if (currentUserId === targetUserId) {
      return { error: 'Cannot regenerate your own password. Use the reset password feature.' }
    }

    // Generate new password
    const newPassword = generateSecurePassword()
    const passwordHash = await bcrypt.hash(newPassword, 12)

    // Update password
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    })

    // Audit log
    await createAuditLog({
      organizationId: currentOrgId,
      userId: currentUserId,
      action: 'password_regenerated',
      resourceType: 'user',
      resourceId: targetUserId,
      changes: {
        targetUserEmail: targetOrgUser.user.email,
        regeneratedBy: currentUserId
      }
    })

    // Get organization name and current user name for email
    const organization = await prisma.organization.findUnique({
      where: { id: currentOrgId },
      select: { name: true }
    })

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { firstName: true, lastName: true }
    })

    const regeneratedByName = currentUser
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : 'An administrator'

    // Send email notification with new password
    const loginUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    await sendPasswordRegeneratedEmail(
      targetOrgUser.user.email,
      targetOrgUser.user.firstName || 'Team Member',
      newPassword,
      organization?.name || 'ABA Practice Manager',
      loginUrl,
      regeneratedByName
    )

    return {
      success: true,
      generatedPassword: newPassword,
      userEmail: targetOrgUser.user.email,
      userName: `${targetOrgUser.user.firstName} ${targetOrgUser.user.lastName}`
    }
  } catch (error: any) {
    console.error('Password regeneration error:', error)
    return { error: 'Failed to regenerate password' }
  }
}

/**
 * Generate a secure random password
 */
function generateSecurePassword(): string {
  const length = 16
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*'
  const all = uppercase + lowercase + numbers + special

  // Ensure at least one of each type
  let password = ''
  password += uppercase[crypto.randomInt(uppercase.length)]
  password += lowercase[crypto.randomInt(lowercase.length)]
  password += numbers[crypto.randomInt(numbers.length)]
  password += special[crypto.randomInt(special.length)]

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[crypto.randomInt(all.length)]
  }

  // Shuffle the password
  return password.split('').sort(() => crypto.randomInt(3) - 1).join('')
}
