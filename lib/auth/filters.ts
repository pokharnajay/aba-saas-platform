import { Prisma, UserRole } from '@prisma/client'

/**
 * Query Filters for Role-Based Data Access
 *
 * These functions generate Prisma where clauses based on user role
 * to ensure users only see data they're authorized to access
 */

/**
 * Get patient access filter based on user role
 *
 * Logic:
 * - ORG_ADMIN & CLINICAL_DIRECTOR: All patients in organization
 * - BCBA, RBT, BT: Only patients assigned to them
 * - HR_MANAGER: No patient access
 */
export function getPatientAccessFilter(
  userId: number,
  userRole: UserRole,
  organizationId: number
): Prisma.PatientWhereInput {
  const baseFilter: Prisma.PatientWhereInput = {
    organizationId,
    deletedAt: null,
  }

  switch (userRole) {
    case 'ORG_ADMIN':
    case 'CLINICAL_DIRECTOR':
      // Supervisors see all patients in org
      return baseFilter

    case 'BCBA':
      // BCBAs see patients where they're assigned as BCBA
      return {
        ...baseFilter,
        assignedBCBAId: userId,
      }

    case 'RBT':
    case 'BT':
      // RBTs and BTs see patients where they're assigned as RBT
      return {
        ...baseFilter,
        assignedRBTId: userId,
      }

    case 'HR_MANAGER':
      // HR has no patient access - return impossible filter
      return {
        ...baseFilter,
        id: -1, // No patient will ever have ID -1
      }

    default:
      // Unknown role - no access
      return {
        ...baseFilter,
        id: -1,
      }
  }
}

/**
 * Get treatment plan access filter based on user role
 *
 * Logic:
 * - ORG_ADMIN & CLINICAL_DIRECTOR: All plans in organization
 * - BCBA, RBT, BT: Plans they created OR plans for their assigned patients
 */
export function getTreatmentPlanAccessFilter(
  userId: number,
  userRole: UserRole,
  organizationId: number
): Prisma.TreatmentPlanWhereInput {
  const baseFilter: Prisma.TreatmentPlanWhereInput = {
    organizationId,
    deletedAt: null,
  }

  switch (userRole) {
    case 'ORG_ADMIN':
    case 'CLINICAL_DIRECTOR':
      // Supervisors see all plans
      return baseFilter

    case 'BCBA':
      // BCBAs see plans they created OR plans for patients where they're assigned as BCBA
      return {
        ...baseFilter,
        OR: [
          { createdById: userId },
          {
            patient: {
              assignedBCBAId: userId,
            },
          },
        ],
      }

    case 'RBT':
    case 'BT':
      // RBTs/BTs see plans they created OR plans for patients where they're assigned as RBT
      return {
        ...baseFilter,
        OR: [
          { createdById: userId },
          {
            patient: {
              assignedRBTId: userId,
            },
          },
        ],
      }

    case 'HR_MANAGER':
      // HR has no treatment plan access
      return {
        ...baseFilter,
        id: -1,
      }

    default:
      return {
        ...baseFilter,
        id: -1,
      }
  }
}

/**
 * Get comment access filter
 * Users can see comments on treatment plans they have access to
 */
export function getCommentAccessFilter(
  userId: number,
  userRole: UserRole,
  organizationId: number
): Prisma.CommentWhereInput {
  const treatmentPlanFilter = getTreatmentPlanAccessFilter(userId, userRole, organizationId)

  return {
    deletedAt: null,
    treatmentPlan: treatmentPlanFilter,
  }
}

/**
 * Get template access filter
 * Users can see:
 * - Public templates
 * - Templates from their organization
 * - Templates they created
 */
export function getTemplateAccessFilter(
  userId: number,
  userRole: UserRole,
  organizationId: number
): Prisma.TemplateWhereInput {
  return {
    deletedAt: null,
    isActive: true,
    OR: [
      { isPublic: true }, // Public templates
      { organizationId }, // Organization templates
      { createdById: userId }, // User's own templates
    ],
  }
}

/**
 * Get notification access filter
 * Users only see their own notifications
 */
export function getNotificationAccessFilter(
  userId: number,
  organizationId: number
): Prisma.NotificationWhereInput {
  return {
    userId,
    OR: [
      { organizationId }, // Notifications for current org
      { organizationId: null }, // System-wide notifications
    ],
  }
}

/**
 * Get audit log access filter
 * Only ORG_ADMIN and CLINICAL_DIRECTOR can view audit logs
 * They see all logs for their organization
 */
export function getAuditLogAccessFilter(
  userRole: UserRole,
  organizationId: number
): Prisma.AuditLogWhereInput {
  // Only supervisors can access audit logs
  if (userRole !== 'ORG_ADMIN' && userRole !== 'CLINICAL_DIRECTOR') {
    return { id: -1 } // No access
  }

  return {
    OR: [
      { organizationId }, // Organization logs
      { organizationId: null }, // System logs
    ],
  }
}

/**
 * Get user access filter for team management
 * HR_MANAGER and ORG_ADMIN can see all users in the organization
 */
export function getUserAccessFilter(
  userRole: UserRole,
  organizationId: number
): Prisma.UserWhereInput {
  // Only these roles can view user list
  if (userRole !== 'ORG_ADMIN' && userRole !== 'HR_MANAGER') {
    return { id: -1 } // No access
  }

  return {
    deletedAt: null,
    organizations: {
      some: {
        organizationId,
      },
    },
  }
}

/**
 * Get AI review access filter
 * Same access as treatment plans
 */
export function getAIReviewAccessFilter(
  userId: number,
  userRole: UserRole,
  organizationId: number
): Prisma.AIReviewWhereInput {
  const treatmentPlanFilter = getTreatmentPlanAccessFilter(userId, userRole, organizationId)

  return {
    organizationId,
    treatmentPlan: treatmentPlanFilter,
  }
}

/**
 * Get training module access filter
 * All users can see training modules for their organization
 */
export function getTrainingModuleAccessFilter(
  userRole: UserRole,
  organizationId: number
): Prisma.TrainingModuleWhereInput {
  return {
    isActive: true,
    OR: [
      { organizationId }, // Organization modules
      { organizationId: null }, // Public/system modules
    ],
    // Optionally filter by required roles
    // requiredForRoles: { has: userRole }
  }
}
