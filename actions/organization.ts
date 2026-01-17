'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/auth-config'
import { hasValidSession, hasRole } from '@/lib/auth/permissions'
import { z } from 'zod'

const updateOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  billingEmail: z.string().email('Invalid email address').optional(),
})

const updateFeatureFlagsSchema = z.object({
  aiReviewerEnabled: z.boolean(),
  trainingModulesEnabled: z.boolean(),
})

export async function getOrganizationSettings() {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: currentOrgId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        subscriptionPlan: true,
        maxUsers: true,
        maxPatients: true,
        features: true,
        createdAt: true,
      },
    })

    if (!organization) {
      throw new Error('Organization not found')
    }

    return organization
  } catch (error: any) {
    console.error('Get organization settings error:', error)
    throw new Error(error.message || 'Failed to fetch organization settings')
  }
}

export async function updateOrganization(data: z.infer<typeof updateOrganizationSchema>) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  // Only ORG_ADMIN can update organization settings
  if (!hasRole(session, ['ORG_ADMIN'])) {
    return { error: 'Only organization admins can update these settings' }
  }

  try {
    const validatedData = updateOrganizationSchema.parse(data)

    await prisma.organization.update({
      where: { id: currentOrgId },
      data: {
        name: validatedData.name,
        // billingEmail would be stored in features JSON or separate field
      },
    })

    revalidatePath('/organization/settings')
    return { success: true }
  } catch (error: any) {
    console.error('Update organization error:', error)
    return { error: error.message || 'Failed to update organization' }
  }
}

export async function updateFeatureFlags(data: z.infer<typeof updateFeatureFlagsSchema>) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  // Only ORG_ADMIN can update feature flags
  if (!hasRole(session, ['ORG_ADMIN'])) {
    return { error: 'Only organization admins can update feature flags' }
  }

  try {
    const validatedData = updateFeatureFlagsSchema.parse(data)

    const organization = await prisma.organization.findUnique({
      where: { id: currentOrgId },
    })

    if (!organization) {
      return { error: 'Organization not found' }
    }

    const currentFeatures = (organization.features as any) || {}

    await prisma.organization.update({
      where: { id: currentOrgId },
      data: {
        features: {
          ...currentFeatures,
          aiReviewerEnabled: validatedData.aiReviewerEnabled,
          trainingModulesEnabled: validatedData.trainingModulesEnabled,
        },
      },
    })

    revalidatePath('/organization/settings')
    return { success: true }
  } catch (error: any) {
    console.error('Update feature flags error:', error)
    return { error: error.message || 'Failed to update feature flags' }
  }
}

export async function getAuditLogs(filters?: {
  limit?: number
  offset?: number
  userId?: number
  startDate?: Date
  endDate?: Date
}) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  // Only ORG_ADMIN and CLINICAL_DIRECTOR can view audit logs
  if (!hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR'])) {
    return { error: 'Insufficient permissions to view audit logs' }
  }

  try {
    const where: any = {
      organizationId: currentOrgId,
    }

    if (filters?.userId) {
      where.userId = filters.userId
    }

    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {}
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate
      }
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    })

    return { logs: auditLogs }
  } catch (error: any) {
    console.error('Get audit logs error:', error)
    return { error: error.message || 'Failed to fetch audit logs' }
  }
}
