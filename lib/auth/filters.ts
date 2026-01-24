import { Prisma, UserRole } from '@prisma/client'

/**
 * Query Filters for Role-Based Data Access
 *
 * These functions generate Prisma where clauses based on user role
 * to ensure users only see data they're authorized to access.
 *
 * CRITICAL: All queries MUST include organizationId to ensure
 * complete data isolation between organizations.
 *
 * ROLE HIERARCHY:
 * - ORG_ADMIN: Full access to everything in the organization
 * - CLINICAL_MANAGER (and legacy CLINICAL_DIRECTOR): Same as ORG_ADMIN for data access
 * - BCBA: Access to assigned patients and their data
 * - RBT/BT: Access to assigned patients and their data
 */

// Helper to check if role is admin-level
function isAdminRole(role: UserRole): boolean {
  return ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'].includes(role)
}

/**
 * Get patient access filter based on user role
 *
 * Logic:
 * - ORG_ADMIN, CLINICAL_MANAGER, CLINICAL_DIRECTOR: All patients in organization
 * - BCBA: Only patients assigned to them as BCBA
 * - RBT, BT: Only patients assigned to them as RBT
 */
export function getPatientAccessFilter(
  userId: number,
  userRole: UserRole,
  organizationId: number
): Prisma.PatientWhereInput {
  // CRITICAL: Always include organizationId for data isolation
  const baseFilter: Prisma.PatientWhereInput = {
    organizationId,
    deletedAt: null,
  }

  // Admin-level roles see all patients in organization
  if (isAdminRole(userRole)) {
    return baseFilter
  }

  switch (userRole) {
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
 * - ORG_ADMIN, CLINICAL_MANAGER, CLINICAL_DIRECTOR: All plans in organization
 * - BCBA, RBT, BT: Plans they created OR plans for their assigned patients
 */
export function getTreatmentPlanAccessFilter(
  userId: number,
  userRole: UserRole,
  organizationId: number
): Prisma.TreatmentPlanWhereInput {
  // CRITICAL: Always include organizationId for data isolation
  const baseFilter: Prisma.TreatmentPlanWhereInput = {
    organizationId,
    deletedAt: null,
  }

  // Admin-level roles see all plans
  if (isAdminRole(userRole)) {
    return baseFilter
  }

  switch (userRole) {
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
 * Get session notes access filter based on user role
 *
 * Logic:
 * - ORG_ADMIN, CLINICAL_MANAGER, CLINICAL_DIRECTOR: All session notes in organization
 * - BCBA, RBT, BT: Session notes for their assigned patients or notes they created
 */
export function getSessionNoteAccessFilter(
  userId: number,
  userRole: UserRole,
  organizationId: number
): Prisma.SessionNoteWhereInput {
  // CRITICAL: Always include organizationId for data isolation
  const baseFilter: Prisma.SessionNoteWhereInput = {
    organizationId,
    deletedAt: null,
  }

  // Admin-level roles see all session notes
  if (isAdminRole(userRole)) {
    return baseFilter
  }

  switch (userRole) {
    case 'BCBA':
      // BCBAs see notes they created OR notes for patients where they're assigned
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
      // RBTs/BTs see notes they created OR notes for patients where they're assigned
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
 *
 * Logic:
 * - ORG_ADMIN, CLINICAL_MANAGER can see and manage all templates
 * - Others can see public templates and org templates
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
 * Only ORG_ADMIN and CLINICAL_MANAGER can view audit logs
 */
export function getAuditLogAccessFilter(
  userRole: UserRole,
  organizationId: number
): Prisma.AuditLogWhereInput {
  // Only admin-level roles can access audit logs
  if (!isAdminRole(userRole)) {
    return { id: -1 } // No access
  }

  return {
    // CRITICAL: Always filter by organizationId
    organizationId,
  }
}

/**
 * Get user access filter for team management
 * ORG_ADMIN and CLINICAL_MANAGER can see all users in the organization
 */
export function getUserAccessFilter(
  userRole: UserRole,
  organizationId: number
): Prisma.UserWhereInput {
  // Only admin-level roles can view user list
  if (!isAdminRole(userRole)) {
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
    // CRITICAL: Always filter by organizationId
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

/**
 * Utility: Ensure organizationId is present in any query
 * Use this as a safety check in actions
 */
export function ensureOrgIsolation(
  organizationId: number | null | undefined
): asserts organizationId is number {
  if (!organizationId) {
    throw new Error('Organization context required for data access')
  }
}
