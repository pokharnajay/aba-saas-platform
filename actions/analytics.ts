'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/auth-config'
import { hasValidSession, hasRole } from '@/lib/auth/permissions'

export async function getPatientStats(dateRange?: { start?: Date; end?: Date }) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  // Only ORG_ADMIN and CLINICAL_DIRECTOR can view reports
  if (!hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR'])) {
    return { error: 'Insufficient permissions to view reports' }
  }

  try {
    const where: any = {
      organizationId: currentOrgId,
      deletedAt: null,
    }

    if (dateRange?.start || dateRange?.end) {
      where.enrollmentDate = {}
      if (dateRange.start) {
        where.enrollmentDate.gte = dateRange.start
      }
      if (dateRange.end) {
        where.enrollmentDate.lte = dateRange.end
      }
    }

    const totalPatients = await prisma.patient.count({ where })

    const activePatients = await prisma.patient.count({
      where: {
        ...where,
        status: 'ACTIVE',
      },
    })

    const inactivePatients = await prisma.patient.count({
      where: {
        ...where,
        status: 'INACTIVE',
      },
    })

    const discharged = await prisma.patient.count({
      where: {
        ...where,
        status: 'DISCHARGED',
      },
    })

    // Enrollment trend (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const enrollmentTrend = await prisma.patient.groupBy({
      by: ['enrollmentDate'],
      where: {
        organizationId: currentOrgId,
        deletedAt: null,
        enrollmentDate: {
          gte: sixMonthsAgo,
        },
      },
      _count: true,
    })

    return {
      totalPatients,
      activePatients,
      inactivePatients,
      discharged,
      enrollmentTrend,
    }
  } catch (error: any) {
    console.error('Get patient stats error:', error)
    return { error: error.message || 'Failed to fetch patient statistics' }
  }
}

export async function getTreatmentPlanStats(dateRange?: { start?: Date; end?: Date }) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  if (!hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR'])) {
    return { error: 'Insufficient permissions to view reports' }
  }

  try {
    const where: any = {
      patient: {
        organizationId: currentOrgId,
      },
    }

    if (dateRange?.start || dateRange?.end) {
      where.createdAt = {}
      if (dateRange.start) {
        where.createdAt.gte = dateRange.start
      }
      if (dateRange.end) {
        where.createdAt.lte = dateRange.end
      }
    }

    const totalPlans = await prisma.treatmentPlan.count({ where })

    const plansByStatus = await prisma.treatmentPlan.groupBy({
      by: ['status'],
      where,
      _count: true,
    })

    const statusCounts = plansByStatus.reduce(
      (acc, curr) => {
        acc[curr.status] = curr._count
        return acc
      },
      {} as Record<string, number>
    )

    // Calculate average review time (from creation to approval)
    const approvedPlans = await prisma.treatmentPlan.findMany({
      where: {
        ...where,
        status: 'APPROVED',
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    })

    const avgReviewTime =
      approvedPlans.length > 0
        ? approvedPlans.reduce((acc, plan) => {
            const diff = plan.updatedAt.getTime() - plan.createdAt.getTime()
            return acc + diff
          }, 0) / approvedPlans.length
        : 0

    const avgReviewDays = avgReviewTime / (1000 * 60 * 60 * 24)

    return {
      totalPlans,
      draft: statusCounts.DRAFT || 0,
      pendingBcbaReview: statusCounts.PENDING_BCBA_REVIEW || 0,
      pendingDirectorReview: statusCounts.PENDING_CLINICAL_DIRECTOR || 0,
      approved: statusCounts.APPROVED || 0,
      active: statusCounts.ACTIVE || 0,
      rejected: statusCounts.REJECTED || 0,
      avgReviewDays: Math.round(avgReviewDays * 10) / 10,
    }
  } catch (error: any) {
    console.error('Get treatment plan stats error:', error)
    return { error: error.message || 'Failed to fetch treatment plan statistics' }
  }
}

export async function getStaffPerformance(dateRange?: { start?: Date; end?: Date }) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  if (!hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR'])) {
    return { error: 'Insufficient permissions to view reports' }
  }

  try {
    const where: any = {
      patient: {
        organizationId: currentOrgId,
      },
    }

    if (dateRange?.start || dateRange?.end) {
      where.createdAt = {}
      if (dateRange.start) {
        where.createdAt.gte = dateRange.start
      }
      if (dateRange.end) {
        where.createdAt.lte = dateRange.end
      }
    }

    const plansByCreator = await prisma.treatmentPlan.groupBy({
      by: ['createdById'],
      where,
      _count: true,
    })

    const creatorIds = plansByCreator.map((p) => p.createdById)

    const creators = await prisma.user.findMany({
      where: {
        id: {
          in: creatorIds,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    })

    const staffStats = plansByCreator.map((stat) => {
      const creator = creators.find((c) => c.id === stat.createdById)
      return {
        userId: stat.createdById,
        name: creator ? `${creator.firstName} ${creator.lastName}` : 'Unknown',
        plansCreated: stat._count,
      }
    })

    return { staffStats }
  } catch (error: any) {
    console.error('Get staff performance error:', error)
    return { error: error.message || 'Failed to fetch staff performance' }
  }
}

export async function getAIReviewStats(dateRange?: { start?: Date; end?: Date }) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  if (!hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR'])) {
    return { error: 'Insufficient permissions to view reports' }
  }

  try {
    const where: any = {
      patient: {
        organizationId: currentOrgId,
      },
      aiReviewed: true,
    }

    if (dateRange?.start || dateRange?.end) {
      where.createdAt = {}
      if (dateRange.start) {
        where.createdAt.gte = dateRange.start
      }
      if (dateRange.end) {
        where.createdAt.lte = dateRange.end
      }
    }

    const totalAIReviews = await prisma.treatmentPlan.count({ where })

    const plansWithAI = await prisma.treatmentPlan.findMany({
      where,
      select: {
        aiReviewed: true,
      },
    })

    // Calculate acceptance rate (plans that were approved after AI review)
    const aiReviewedThenApproved = await prisma.treatmentPlan.count({
      where: {
        ...where,
        status: {
          in: ['APPROVED', 'ACTIVE'],
        },
      },
    })

    const acceptanceRate =
      totalAIReviews > 0 ? (aiReviewedThenApproved / totalAIReviews) * 100 : 0

    return {
      totalAIReviews,
      acceptanceRate: Math.round(acceptanceRate * 10) / 10,
    }
  } catch (error: any) {
    console.error('Get AI review stats error:', error)
    return { error: error.message || 'Failed to fetch AI review statistics' }
  }
}
