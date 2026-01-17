'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/auth-config'
import { hasValidSession } from '@/lib/auth/permissions'

export async function getNotifications(limit: number = 20) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: parseInt(session.user.id),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    return notifications
  } catch (error: any) {
    console.error('Get notifications error:', error)
    throw new Error(error.message || 'Failed to fetch notifications')
  }
}

export async function getUnreadCount() {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  try {
    const count = await prisma.notification.count({
      where: {
        userId: parseInt(session.user.id),
        isRead: false,
      },
    })

    return count
  } catch (error: any) {
    console.error('Get unread count error:', error)
    return 0
  }
}

export async function markAsRead(notificationId: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    })

    if (!notification || notification.userId !== parseInt(session.user.id)) {
      return { error: 'Notification not found' }
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    })

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error('Mark as read error:', error)
    return { error: error.message || 'Failed to mark notification as read' }
  }
}

export async function markAllAsRead() {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  try {
    await prisma.notification.updateMany({
      where: {
        userId: parseInt(session.user.id),
        isRead: false,
      },
      data: {
        isRead: true,
      },
    })

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error('Mark all as read error:', error)
    return { error: error.message || 'Failed to mark all notifications as read' }
  }
}

export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  actionUrl?: string
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        notificationType: type as any,
        title,
        message,
        actionUrl,
        isRead: false,
      },
    })

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error('Create notification error:', error)
    return { error: error.message || 'Failed to create notification' }
  }
}

// Helper function to notify reviewers when treatment plan is submitted
export async function notifyReviewers(treatmentPlanId: number, patientName: string) {
  try {
    const plan = await prisma.treatmentPlan.findUnique({
      where: { id: treatmentPlanId },
      include: {
        patient: {
          include: {
            organization: true,
          },
        },
      },
    })

    if (!plan) return

    const organizationId = plan.patient.organizationId

    // Get reviewers based on status
    let reviewerRole = ''
    if (plan.status === 'PENDING_BCBA_REVIEW') {
      reviewerRole = 'BCBA'
    } else if (plan.status === 'PENDING_CLINICAL_DIRECTOR') {
      reviewerRole = 'CLINICAL_DIRECTOR'
    } else {
      return
    }

    // Find users with reviewer role in this organization
    const reviewers = await prisma.organizationUser.findMany({
      where: {
        organizationId,
        role: reviewerRole as any,
      },
      include: {
        user: true,
      },
    })

    // Create notifications for each reviewer
    for (const reviewer of reviewers) {
      await createNotification(
        reviewer.user.id,
        'TREATMENT_PLAN_REVIEW',
        'New Treatment Plan to Review',
        `A treatment plan for ${patientName} is awaiting your review.`,
        `/treatment-plans/${treatmentPlanId}`
      )
    }
  } catch (error: any) {
    console.error('Notify reviewers error:', error)
  }
}

// Helper function to notify creator when plan is approved/rejected
export async function notifyPlanCreator(
  treatmentPlanId: number,
  patientName: string,
  approved: boolean,
  reason?: string
) {
  try {
    const plan = await prisma.treatmentPlan.findUnique({
      where: { id: treatmentPlanId },
    })

    if (!plan) return

    await createNotification(
      plan.createdById,
      approved ? 'TREATMENT_PLAN_APPROVED' : 'TREATMENT_PLAN_REJECTED',
      approved ? 'Treatment Plan Approved' : 'Treatment Plan Rejected',
      approved
        ? `Your treatment plan for ${patientName} has been approved.`
        : `Your treatment plan for ${patientName} was rejected. Reason: ${reason}`,
      `/treatment-plans/${treatmentPlanId}`
    )
  } catch (error: any) {
    console.error('Notify plan creator error:', error)
  }
}

// Helper function to notify user when assigned to patient
export async function notifyPatientAssignment(userId: number, patientName: string, patientId: number) {
  try {
    await createNotification(
      userId,
      'PATIENT_ASSIGNED',
      'New Patient Assignment',
      `You have been assigned to patient ${patientName}.`,
      `/patients/${patientId}`
    )
  } catch (error: any) {
    console.error('Notify patient assignment error:', error)
  }
}
