import { Session } from 'next-auth'
import { UserRole, Patient, TreatmentPlan } from '@prisma/client'

/**
 * RBAC Permission System for ABA SAAS Platform
 *
 * Permission Logic:
 * - ORG_ADMIN & CLINICAL_DIRECTOR: See all patients/plans in organization
 * - BCBA: See assigned patients + plans they created
 * - RBT & BT: See assigned patients + plans they created
 * - HR_MANAGER: User management only, no patient access
 */

// Type guard for session
export function hasValidSession(session: Session | null): session is Session & {
  user: {
    id: string
    email: string
    currentOrgId: number | null
    currentOrg: {
      id: number
      role: UserRole
    } | null
    organizations: Array<{
      id: number
      role: UserRole
    }>
  }
} {
  return !!session?.user?.id && !!session.user.currentOrgId
}

// Check if user has specific role(s)
export function hasRole(
  session: Session | null,
  roles: UserRole[]
): boolean {
  if (!hasValidSession(session)) return false

  const userRole = session.user.currentOrg?.role
  return userRole ? roles.includes(userRole) : false
}

// Check if user is admin or clinical director (supervisory roles)
export function isSupervisor(session: Session | null): boolean {
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR'])
}

// Check if user is a clinical staff member
export function isClinicalStaff(session: Session | null): boolean {
  return hasRole(session, ['BCBA', 'RBT', 'BT', 'CLINICAL_DIRECTOR'])
}

// Check if patient is assigned to user
export function isPatientAssignedToUser(
  userId: number,
  patient: Pick<Patient, 'assignedBCBAId' | 'assignedRBTId'>
): boolean {
  return patient.assignedBCBAId === userId || patient.assignedRBTId === userId
}

// PATIENT PERMISSIONS

export function canViewPatient(
  session: Session | null,
  patient: Pick<Patient, 'organizationId' | 'assignedBCBAId' | 'assignedRBTId'>
): boolean {
  if (!hasValidSession(session)) return false

  // Must be in same organization
  if (patient.organizationId !== session.user.currentOrgId) return false

  const userRole = session.user.currentOrg?.role
  const userId = parseInt(session.user.id)

  switch (userRole) {
    case 'ORG_ADMIN':
    case 'CLINICAL_DIRECTOR':
      // Supervisors see all patients in org
      return true

    case 'BCBA':
    case 'RBT':
    case 'BT':
      // Clinical staff see only assigned patients
      return isPatientAssignedToUser(userId, patient)

    case 'HR_MANAGER':
      // HR has no patient access
      return false

    default:
      return false
  }
}

export function canEditPatient(
  session: Session | null,
  patient: Pick<Patient, 'organizationId' | 'assignedBCBAId' | 'assignedRBTId'>
): boolean {
  if (!hasValidSession(session)) return false

  // Must be able to view first
  if (!canViewPatient(session, patient)) return false

  // Only these roles can edit patients
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR', 'BCBA'])
}

export function canCreatePatient(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // Only these roles can create patients
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR', 'BCBA'])
}

export function canDeletePatient(
  session: Session | null,
  patient: Pick<Patient, 'organizationId'>
): boolean {
  if (!hasValidSession(session)) return false

  // Must be in same organization
  if (patient.organizationId !== session.user.currentOrgId) return false

  // Only admins and clinical directors can delete
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR'])
}

export function canAssignStaff(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // Only these roles can assign staff to patients
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR', 'BCBA'])
}

// TREATMENT PLAN PERMISSIONS

type TreatmentPlanForPermission = Pick<
  TreatmentPlan,
  'organizationId' | 'patientId' | 'createdById' | 'status'
>

export function canViewTreatmentPlan(
  session: Session | null,
  plan: TreatmentPlanForPermission,
  patient?: Pick<Patient, 'assignedBCBAId' | 'assignedRBTId'>
): boolean {
  if (!hasValidSession(session)) return false

  // Must be in same organization
  if (plan.organizationId !== session.user.currentOrgId) return false

  const userRole = session.user.currentOrg?.role
  const userId = parseInt(session.user.id)

  switch (userRole) {
    case 'ORG_ADMIN':
    case 'CLINICAL_DIRECTOR':
      // Supervisors see all plans
      return true

    case 'BCBA':
    case 'RBT':
    case 'BT':
      // Can view if: created by them OR patient is assigned to them
      if (plan.createdById === userId) return true
      if (patient && isPatientAssignedToUser(userId, patient)) return true
      return false

    case 'HR_MANAGER':
      return false

    default:
      return false
  }
}

export function canEditTreatmentPlan(
  session: Session | null,
  plan: TreatmentPlanForPermission
): boolean {
  if (!hasValidSession(session)) return false

  // Must be able to view first
  if (!canViewTreatmentPlan(session, plan)) return false

  const userId = parseInt(session.user.id)
  const userRole = session.user.currentOrg?.role

  // RBT/BT cannot edit treatment plans - view only
  if (userRole === 'RBT' || userRole === 'BT') {
    return false
  }

  // Admins and clinical directors can edit any plan
  if (userRole === 'ORG_ADMIN' || userRole === 'CLINICAL_DIRECTOR') {
    return true
  }

  // BCBA creators can edit their own draft plans
  if (userRole === 'BCBA' && plan.createdById === userId && plan.status === 'DRAFT') {
    return true
  }

  return false
}

export function canCreateTreatmentPlan(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // Only BCBA and above can create treatment plans
  // RBT/BT can only VIEW treatment plans
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR', 'BCBA'])
}

export function canDeleteTreatmentPlan(
  session: Session | null,
  plan: TreatmentPlanForPermission
): boolean {
  if (!hasValidSession(session)) return false

  // Must be in same organization
  if (plan.organizationId !== session.user.currentOrgId) return false

  const userId = parseInt(session.user.id)
  const userRole = session.user.currentOrg?.role

  // Admins can delete any plan
  if (userRole === 'ORG_ADMIN') return true

  // Creators can delete their own draft plans
  if (plan.createdById === userId && plan.status === 'DRAFT') {
    return true
  }

  return false
}

export function canSubmitForReview(
  session: Session | null,
  plan: TreatmentPlanForPermission
): boolean {
  if (!hasValidSession(session)) return false

  const userId = parseInt(session.user.id)

  // Must be creator and plan must be in DRAFT status
  return plan.createdById === userId && plan.status === 'DRAFT'
}

export function canReviewTreatmentPlan(
  session: Session | null,
  plan: TreatmentPlanForPermission
): boolean {
  if (!hasValidSession(session)) return false

  // Only BCBA and Clinical Directors can review
  if (!hasRole(session, ['BCBA', 'CLINICAL_DIRECTOR'])) return false

  // BCBA can review if status is PENDING_BCBA_REVIEW
  if (session.user.currentOrg?.role === 'BCBA' && plan.status === 'PENDING_BCBA_REVIEW') {
    return true
  }

  // Clinical Director can review if status is PENDING_CLINICAL_DIRECTOR
  if (session.user.currentOrg?.role === 'CLINICAL_DIRECTOR' && plan.status === 'PENDING_CLINICAL_DIRECTOR') {
    return true
  }

  return false
}

export function canApproveTreatmentPlan(
  session: Session | null,
  plan: TreatmentPlanForPermission
): boolean {
  if (!hasValidSession(session)) return false

  const userRole = session.user.currentOrg?.role

  // BCBA can approve if status is PENDING_BCBA_REVIEW (moves to PENDING_CLINICAL_DIRECTOR)
  if (userRole === 'BCBA' && plan.status === 'PENDING_BCBA_REVIEW') {
    return true
  }

  // Clinical Director can approve if status is PENDING_CLINICAL_DIRECTOR (moves to APPROVED)
  if (userRole === 'CLINICAL_DIRECTOR' && plan.status === 'PENDING_CLINICAL_DIRECTOR') {
    return true
  }

  return false
}

export function canRejectTreatmentPlan(
  session: Session | null,
  plan: TreatmentPlanForPermission
): boolean {
  // Same permission as approve - reviewers can reject
  return canApproveTreatmentPlan(session, plan)
}

export function canRequestAIReview(
  session: Session | null,
  plan: TreatmentPlanForPermission
): boolean {
  if (!hasValidSession(session)) return false

  // Must be able to view the plan
  if (!canViewTreatmentPlan(session, plan)) return false

  // Clinical staff can request AI review
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR', 'BCBA'])
}

// COMMENT PERMISSIONS

export function canCommentOnTreatmentPlan(
  session: Session | null,
  plan: TreatmentPlanForPermission
): boolean {
  // Anyone who can view the plan can comment
  return canViewTreatmentPlan(session, plan)
}

export function canDeleteComment(
  session: Session | null,
  commentUserId: number
): boolean {
  if (!hasValidSession(session)) return false

  const userId = parseInt(session.user.id)

  // Users can delete their own comments, or admins can delete any
  return userId === commentUserId || hasRole(session, ['ORG_ADMIN'])
}

// USER MANAGEMENT PERMISSIONS

export function canInviteUsers(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // Only admins and HR managers can invite users
  return hasRole(session, ['ORG_ADMIN', 'HR_MANAGER'])
}

export function canManageUsers(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // Only admins and HR managers can manage users
  return hasRole(session, ['ORG_ADMIN', 'HR_MANAGER'])
}

export function canUpdateUserRole(
  session: Session | null,
  targetRole: UserRole
): boolean {
  if (!hasValidSession(session)) return false

  // Only ORG_ADMIN can change roles
  if (!hasRole(session, ['ORG_ADMIN'])) return false

  // Cannot demote the last ORG_ADMIN (would need additional check in action)
  return true
}

// ORGANIZATION PERMISSIONS

export function canUpdateOrganization(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // Only ORG_ADMIN can update organization settings
  return hasRole(session, ['ORG_ADMIN'])
}

export function canViewAuditLogs(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // Only supervisors can view audit logs
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR'])
}

// TEMPLATE PERMISSIONS

export function canCreateTemplate(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // Clinical staff can create templates
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR', 'BCBA'])
}

export function canEditTemplate(
  session: Session | null,
  templateCreatorId: number,
  templateOrgId: number | null
): boolean {
  if (!hasValidSession(session)) return false

  const userId = parseInt(session.user.id)

  // Admins can edit any template
  if (hasRole(session, ['ORG_ADMIN'])) return true

  // Creators can edit their own templates
  if (templateCreatorId === userId) return true

  return false
}

export function canDeleteTemplate(
  session: Session | null,
  templateCreatorId: number
): boolean {
  if (!hasValidSession(session)) return false

  const userId = parseInt(session.user.id)

  // Admins can delete any template
  if (hasRole(session, ['ORG_ADMIN'])) return true

  // Creators can delete their own templates
  return templateCreatorId === userId
}

// REPORTS PERMISSIONS

export function canViewReports(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // Only supervisors can view reports
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR'])
}

// Utility to get user's current organization ID
export function getCurrentOrgId(session: Session | null): number | null {
  if (!hasValidSession(session)) return null
  return session.user.currentOrgId
}

// Utility to get user's current role
export function getCurrentRole(session: Session | null): UserRole | null {
  if (!hasValidSession(session)) return null
  return session.user.currentOrg?.role || null
}
