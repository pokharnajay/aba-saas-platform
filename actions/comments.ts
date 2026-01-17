'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/auth-config'
import { hasValidSession, canCommentOnTreatmentPlan, canDeleteComment } from '@/lib/auth/permissions'

export async function createComment(
  treatmentPlanId: number,
  commentText: string,
  parentCommentId?: number
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
      where: {
        id: treatmentPlanId,
        organizationId: currentOrgId,
        deletedAt: null,
      },
      include: { patient: true },
    })

    if (!plan) {
      throw new Error('Treatment plan not found')
    }

    if (!canCommentOnTreatmentPlan(session, plan)) {
      throw new Error('Cannot comment on this treatment plan')
    }

    const comment = await prisma.comment.create({
      data: {
        treatmentPlanId,
        userId: parseInt(session.user.id),
        commentText,
        parentCommentId: parentCommentId || null,
      },
    })

    revalidatePath(`/treatment-plans/${treatmentPlanId}`)

    return { success: true, commentId: comment.id }
  } catch (error: any) {
    console.error('Create comment error:', error)
    return { error: error.message || 'Failed to create comment' }
  }
}

export async function deleteComment(commentId: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    })

    if (!comment) {
      throw new Error('Comment not found')
    }

    if (!canDeleteComment(session, comment.userId)) {
      throw new Error('Cannot delete this comment')
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    })

    revalidatePath(`/treatment-plans/${comment.treatmentPlanId}`)

    return { success: true }
  } catch (error: any) {
    console.error('Delete comment error:', error)
    return { error: error.message || 'Failed to delete comment' }
  }
}
