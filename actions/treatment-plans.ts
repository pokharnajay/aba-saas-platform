'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/auth-config'
import { createAuditLog } from '@/lib/services/audit-logger'
import { z } from 'zod'
import {
  canCreateTreatmentPlan,
  canViewTreatmentPlan,
  canEditTreatmentPlan,
  canDeleteTreatmentPlan,
  canSubmitForReview,
  canApproveTreatmentPlan,
  canRejectTreatmentPlan,
  canRequestAIReview,
  hasValidSession,
  getCurrentRole,
} from '@/lib/auth/permissions'
import { getTreatmentPlanAccessFilter } from '@/lib/auth/filters'
import { reviewTreatmentPlan } from '@/lib/services/ai-reviewer'

const treatmentPlanSchema = z.object({
  patientId: z.number(),
  title: z.string().min(1, 'Title is required'),
  goals: z.any(),
  behaviors: z.any(),
  interventions: z.any(),
  dataCollectionMethods: z.any(),
  sessionFrequency: z.string().optional(),
  reviewCycle: z.string().optional(),
  additionalNotes: z.string().optional(),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional(),
})

type TreatmentPlanInput = z.infer<typeof treatmentPlanSchema>

export async function createTreatmentPlan(data: TreatmentPlanInput) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    const validatedData = treatmentPlanSchema.parse(data)

    if (!canCreateTreatmentPlan(session)) {
      throw new Error('Insufficient permissions to create treatment plans')
    }

    // Verify patient exists and user has access
    const patient = await prisma.patient.findFirst({
      where: {
        id: validatedData.patientId,
        organizationId: currentOrgId,
        deletedAt: null,
      },
    })

    if (!patient) {
      throw new Error('Patient not found')
    }

    // Get latest version number for this patient
    const latestPlan = await prisma.treatmentPlan.findFirst({
      where: { patientId: validatedData.patientId },
      orderBy: { version: 'desc' },
    })

    const version = latestPlan ? latestPlan.version + 1 : 1

    const plan = await prisma.treatmentPlan.create({
      data: {
        organizationId: currentOrgId,
        patientId: validatedData.patientId,
        version,
        title: validatedData.title,
        goals: validatedData.goals || [],
        behaviors: validatedData.behaviors || [],
        interventions: validatedData.interventions || [],
        dataCollectionMethods: validatedData.dataCollectionMethods || [],
        sessionFrequency: validatedData.sessionFrequency,
        reviewCycle: validatedData.reviewCycle,
        additionalNotes: validatedData.additionalNotes,
        effectiveDate: validatedData.effectiveDate ? new Date(validatedData.effectiveDate) : null,
        expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
        status: 'DRAFT',
        createdById: parseInt(session.user.id),
        workflowHistory: [
          {
            status: 'DRAFT',
            timestamp: new Date().toISOString(),
            userId: parseInt(session.user.id),
            userName: `${session.user.firstName} ${session.user.lastName}`,
          },
        ],
      },
    })

    await createAuditLog({
      organizationId: currentOrgId,
      userId: parseInt(session.user.id),
      action: 'create_treatment_plan',
      resourceType: 'treatment_plan',
      resourceId: plan.id,
    })

    revalidatePath('/treatment-plans')
    revalidatePath(`/patients/${validatedData.patientId}`)

    return { success: true, planId: plan.id }
  } catch (error: any) {
    console.error('Create treatment plan error:', error)
    return { error: error.message || 'Failed to create treatment plan' }
  }
}

export async function getTreatmentPlans() {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  const userId = parseInt(session.user.id)
  const userRole = getCurrentRole(session)
  if (!userRole) {
    throw new Error('Invalid user role')
  }

  const accessFilter = getTreatmentPlanAccessFilter(userId, userRole, currentOrgId)

  const plans = await prisma.treatmentPlan.findMany({
    where: accessFilter,
    include: {
      patient: {
        select: {
          id: true,
          patientCode: true,
          firstNameEncrypted: true,
          lastNameEncrypted: true,
        },
      },
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return plans
}

export async function getTreatmentPlan(id: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  const plan = await prisma.treatmentPlan.findFirst({
    where: {
      id,
      organizationId: currentOrgId,
      deletedAt: null,
    },
    include: {
      patient: true,
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      reviewedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      approvedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      aiReviews: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      comments: {
        where: { deletedAt: null },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!plan) {
    throw new Error('Treatment plan not found')
  }

  if (!canViewTreatmentPlan(session, plan, plan.patient)) {
    throw new Error('You do not have permission to view this treatment plan')
  }

  await createAuditLog({
    organizationId: currentOrgId,
    userId: parseInt(session.user.id),
    action: 'view_treatment_plan',
    resourceType: 'treatment_plan',
    resourceId: id,
  })

  return plan
}

export async function updateTreatmentPlan(id: number, data: Partial<TreatmentPlanInput>) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    const plan = await prisma.treatmentPlan.findFirst({
      where: { id, organizationId: currentOrgId, deletedAt: null },
    })

    if (!plan) {
      throw new Error('Treatment plan not found')
    }

    if (!canEditTreatmentPlan(session, plan)) {
      throw new Error('Insufficient permissions to edit this treatment plan')
    }

    const updated = await prisma.treatmentPlan.update({
      where: { id },
      data: {
        title: data.title,
        goals: data.goals,
        behaviors: data.behaviors,
        interventions: data.interventions,
        dataCollectionMethods: data.dataCollectionMethods,
        sessionFrequency: data.sessionFrequency,
        reviewCycle: data.reviewCycle,
        additionalNotes: data.additionalNotes,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
    })

    await createAuditLog({
      organizationId: currentOrgId,
      userId: parseInt(session.user.id),
      action: 'update_treatment_plan',
      resourceType: 'treatment_plan',
      resourceId: id,
      changes: data,
    })

    revalidatePath('/treatment-plans')
    revalidatePath(`/treatment-plans/${id}`)

    return { success: true, planId: updated.id }
  } catch (error: any) {
    console.error('Update treatment plan error:', error)
    return { error: error.message || 'Failed to update treatment plan' }
  }
}

export async function submitForReview(planId: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    const plan = await prisma.treatmentPlan.findFirst({
      where: { id: planId, organizationId: currentOrgId, deletedAt: null },
    })

    if (!plan) {
      throw new Error('Treatment plan not found')
    }

    if (!canSubmitForReview(session, plan)) {
      throw new Error('Cannot submit this plan for review')
    }

    const workflowHistory = Array.isArray(plan.workflowHistory) ? plan.workflowHistory : []

    await prisma.treatmentPlan.update({
      where: { id: planId },
      data: {
        status: 'PENDING_BCBA_REVIEW',
        workflowHistory: [
          ...workflowHistory,
          {
            status: 'PENDING_BCBA_REVIEW',
            timestamp: new Date().toISOString(),
            userId: parseInt(session.user.id),
            userName: `${session.user.firstName} ${session.user.lastName}`,
          },
        ],
      },
    })

    await createAuditLog({
      organizationId: currentOrgId,
      userId: parseInt(session.user.id),
      action: 'submit_treatment_plan_review',
      resourceType: 'treatment_plan',
      resourceId: planId,
    })

    revalidatePath('/treatment-plans')
    revalidatePath(`/treatment-plans/${planId}`)

    return { success: true }
  } catch (error: any) {
    console.error('Submit for review error:', error)
    return { error: error.message || 'Failed to submit for review' }
  }
}

export async function approveTreatmentPlan(planId: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    const plan = await prisma.treatmentPlan.findFirst({
      where: { id: planId, organizationId: currentOrgId, deletedAt: null },
    })

    if (!plan) {
      throw new Error('Treatment plan not found')
    }

    if (!canApproveTreatmentPlan(session, plan)) {
      throw new Error('Cannot approve this treatment plan')
    }

    const userRole = getCurrentRole(session)
    let newStatus = plan.status
    const workflowHistory = Array.isArray(plan.workflowHistory) ? plan.workflowHistory : []

    if (userRole === 'BCBA' && plan.status === 'PENDING_BCBA_REVIEW') {
      newStatus = 'PENDING_CLINICAL_DIRECTOR'
    } else if (userRole === 'CLINICAL_DIRECTOR' && plan.status === 'PENDING_CLINICAL_DIRECTOR') {
      newStatus = 'APPROVED'
    }

    await prisma.treatmentPlan.update({
      where: { id: planId },
      data: {
        status: newStatus,
        reviewedById: userRole === 'BCBA' ? parseInt(session.user.id) : plan.reviewedById,
        approvedById: userRole === 'CLINICAL_DIRECTOR' ? parseInt(session.user.id) : null,
        approvedAt: userRole === 'CLINICAL_DIRECTOR' ? new Date() : null,
        workflowHistory: [
          ...workflowHistory,
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            userId: parseInt(session.user.id),
            userName: `${session.user.firstName} ${session.user.lastName}`,
            action: 'approved',
          },
        ],
      },
    })

    await createAuditLog({
      organizationId: currentOrgId,
      userId: parseInt(session.user.id),
      action: 'approve_treatment_plan',
      resourceType: 'treatment_plan',
      resourceId: planId,
    })

    revalidatePath('/treatment-plans')
    revalidatePath(`/treatment-plans/${planId}`)

    return { success: true }
  } catch (error: any) {
    console.error('Approve treatment plan error:', error)
    return { error: error.message || 'Failed to approve treatment plan' }
  }
}

export async function rejectTreatmentPlan(planId: number, reason: string) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    const plan = await prisma.treatmentPlan.findFirst({
      where: { id: planId, organizationId: currentOrgId, deletedAt: null },
    })

    if (!plan) {
      throw new Error('Treatment plan not found')
    }

    if (!canRejectTreatmentPlan(session, plan)) {
      throw new Error('Cannot reject this treatment plan')
    }

    const workflowHistory = Array.isArray(plan.workflowHistory) ? plan.workflowHistory : []

    await prisma.treatmentPlan.update({
      where: { id: planId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        workflowHistory: [
          ...workflowHistory,
          {
            status: 'REJECTED',
            timestamp: new Date().toISOString(),
            userId: parseInt(session.user.id),
            userName: `${session.user.firstName} ${session.user.lastName}`,
            action: 'rejected',
            reason,
          },
        ],
      },
    })

    await createAuditLog({
      organizationId: currentOrgId,
      userId: parseInt(session.user.id),
      action: 'reject_treatment_plan',
      resourceType: 'treatment_plan',
      resourceId: planId,
      changes: { reason },
    })

    revalidatePath('/treatment-plans')
    revalidatePath(`/treatment-plans/${planId}`)

    return { success: true }
  } catch (error: any) {
    console.error('Reject treatment plan error:', error)
    return { error: error.message || 'Failed to reject treatment plan' }
  }
}

export async function requestAIReview(
  planId: number,
  reviewType: 'DRAFT_REVIEW' | 'CLINICAL_REVIEW' | 'COMPLIANCE_REVIEW' = 'CLINICAL_REVIEW'
) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    const plan = await prisma.treatmentPlan.findFirst({
      where: { id: planId, organizationId: currentOrgId, deletedAt: null },
    })

    if (!plan) {
      throw new Error('Treatment plan not found')
    }

    if (!canRequestAIReview(session, plan)) {
      throw new Error('Cannot request AI review for this treatment plan')
    }

    const result = await reviewTreatmentPlan({
      treatmentPlanId: planId,
      reviewType,
      userId: parseInt(session.user.id),
    })

    await prisma.treatmentPlan.update({
      where: { id: planId },
      data: { aiReviewed: true },
    })

    revalidatePath(`/treatment-plans/${planId}`)

    return { success: true, review: result }
  } catch (error: any) {
    console.error('Request AI review error:', error)
    return { error: error.message || 'Failed to request AI review' }
  }
}

export async function deleteTreatmentPlan(id: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    const plan = await prisma.treatmentPlan.findFirst({
      where: { id, organizationId: currentOrgId, deletedAt: null },
    })

    if (!plan) {
      throw new Error('Treatment plan not found')
    }

    if (!canDeleteTreatmentPlan(session, plan)) {
      throw new Error('Insufficient permissions to delete this treatment plan')
    }

    await prisma.treatmentPlan.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await createAuditLog({
      organizationId: currentOrgId,
      userId: parseInt(session.user.id),
      action: 'delete_treatment_plan',
      resourceType: 'treatment_plan',
      resourceId: id,
    })

    revalidatePath('/treatment-plans')

    return { success: true }
  } catch (error: any) {
    console.error('Delete treatment plan error:', error)
    return { error: error.message || 'Failed to delete treatment plan' }
  }
}
