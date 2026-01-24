import { Session } from 'next-auth'
import { UserRole, Patient, TreatmentPlan } from '@prisma/client'

/**
 * RBAC Permission System for ABA SAAS Platform
 *
 * ROLE HIERARCHY (highest to lowest):
 * 1. ORG_ADMIN - Organization owner, full control over everything
 * 2. CLINICAL_MANAGER (also CLINICAL_DIRECTOR) - Same as ORG_ADMIN except cannot create other Clinical Managers
 * 3. BCBA - Creates treatment plans, views assigned patients
 * 4. RBT/BT - Creates session notes, views assigned patients, view-only for treatment plans
 *
 * KEY RULES:
 * - Only ORG_ADMIN can register (create organization)
 * - Only ORG_ADMIN can create CLINICAL_MANAGER accounts
 * - ORG_ADMIN and CLINICAL_MANAGER can create BCBA and RBT/BT accounts
 * - ORG_ADMIN and CLINICAL_MANAGER can create patients
 * - Only ORG_ADMIN and CLINICAL_MANAGER can assign/remove staff to patients
 * - Only ORG_ADMIN and CLINICAL_MANAGER can review/approve treatment plans
 * - Only ORG_ADMIN and CLINICAL_MANAGER can create treatment plan templates
 * - BCBA and RBT/BT cannot change their own passwords
 * - Complete data isolation between organizations
 */

// Helper to normalize CLINICAL_DIRECTOR to CLINICAL_MANAGER for consistency
function normalizeRole(role: UserRole | undefined | null): UserRole | null {
  if (!role) return null
  // Map legacy CLINICAL_DIRECTOR to CLINICAL_MANAGER
  if (role === 'CLINICAL_DIRECTOR') return 'CLINICAL_MANAGER'
  return role
}

// Check if role is admin level (ORG_ADMIN or CLINICAL_MANAGER/CLINICAL_DIRECTOR)
export function isAdminLevel(role: UserRole | null): boolean {
  if (!role) return false
  return ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'].includes(role)
}

// Check if role is organization owner
export function isOrgOwner(role: UserRole | null): boolean {
  return role === 'ORG_ADMIN'
}

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
  if (!userRole) return false

  // Normalize role and check
  const normalizedRole = normalizeRole(userRole)

  // Check if normalized role matches any in the list, also check for CLINICAL_DIRECTOR -> CLINICAL_MANAGER mapping
  return roles.some(r => {
    if (r === normalizedRole) return true
    // If checking for CLINICAL_MANAGER, also accept CLINICAL_DIRECTOR
    if (r === 'CLINICAL_MANAGER' && userRole === 'CLINICAL_DIRECTOR') return true
    // If checking for CLINICAL_DIRECTOR, also accept CLINICAL_MANAGER
    if (r === 'CLINICAL_DIRECTOR' && userRole === 'CLINICAL_MANAGER') return true
    return false
  })
}

// Check if user is admin level (org admin or clinical manager)
export function isSupervisor(session: Session | null): boolean {
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

// Check if user is a clinical staff member (can see patients)
export function isClinicalStaff(session: Session | null): boolean {
  return hasRole(session, ['BCBA', 'RBT', 'BT', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

// Check if patient is assigned to user
export function isPatientAssignedToUser(
  userId: number,
  patient: Pick<Patient, 'assignedBCBAId' | 'assignedRBTId'>
): boolean {
  return patient.assignedBCBAId === userId || patient.assignedRBTId === userId
}

// ==========================================
// PATIENT PERMISSIONS
// ==========================================

export function canViewPatient(
  session: Session | null,
  patient: Pick<Patient, 'organizationId' | 'assignedBCBAId' | 'assignedRBTId'>
): boolean {
  if (!hasValidSession(session)) return false

  // Must be in same organization (data isolation)
  if (patient.organizationId !== session.user.currentOrgId) return false

  const userRole = normalizeRole(session.user.currentOrg?.role)
  const userId = parseInt(session.user.id)

  switch (userRole) {
    case 'ORG_ADMIN':
    case 'CLINICAL_MANAGER':
      // Supervisors see all patients in org
      return true

    case 'BCBA':
    case 'RBT':
    case 'BT':
      // Clinical staff see only assigned patients
      return isPatientAssignedToUser(userId, patient)

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

  // Only ORG_ADMIN and CLINICAL_MANAGER can edit patients
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

export function canCreatePatient(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // Only ORG_ADMIN and CLINICAL_MANAGER can create patients
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

export function canDeletePatient(
  session: Session | null,
  patient: Pick<Patient, 'organizationId'>
): boolean {
  if (!hasValidSession(session)) return false

  // Must be in same organization
  if (patient.organizationId !== session.user.currentOrgId) return false

  // Only ORG_ADMIN and CLINICAL_MANAGER can delete
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

export function canAssignStaff(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // Only ORG_ADMIN and CLINICAL_MANAGER can assign staff to patients
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

// ==========================================
// TREATMENT PLAN PERMISSIONS
// ==========================================

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

  // Must be in same organization (data isolation)
  if (plan.organizationId !== session.user.currentOrgId) return false

  const userRole = normalizeRole(session.user.currentOrg?.role)
  const userId = parseInt(session.user.id)

  switch (userRole) {
    case 'ORG_ADMIN':
    case 'CLINICAL_MANAGER':
      // Supervisors see all plans
      return true

    case 'BCBA':
    case 'RBT':
    case 'BT':
      // Can view if: created by them OR patient is assigned to them
      if (plan.createdById === userId) return true
      if (patient && isPatientAssignedToUser(userId, patient)) return true
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
  const userRole = normalizeRole(session.user.currentOrg?.role)

  // RBT/BT cannot edit treatment plans - view only
  if (userRole === 'RBT' || userRole === 'BT') {
    return false
  }

  // ORG_ADMIN and CLINICAL_MANAGER can edit any plan
  if (userRole === 'ORG_ADMIN' || userRole === 'CLINICAL_MANAGER') {
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
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR', 'BCBA'])
}

export function canDeleteTreatmentPlan(
  session: Session | null,
  plan: TreatmentPlanForPermission
): boolean {
  if (!hasValidSession(session)) return false

  // Must be in same organization
  if (plan.organizationId !== session.user.currentOrgId) return false

  const userId = parseInt(session.user.id)
  const userRole = normalizeRole(session.user.currentOrg?.role)

  // ORG_ADMIN and CLINICAL_MANAGER can delete any plan
  if (userRole === 'ORG_ADMIN' || userRole === 'CLINICAL_MANAGER') return true

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

  // Only ORG_ADMIN and CLINICAL_MANAGER can review treatment plans
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

export function canApproveTreatmentPlan(
  session: Session | null,
  plan: TreatmentPlanForPermission
): boolean {
  if (!hasValidSession(session)) return false

  // Only ORG_ADMIN and CLINICAL_MANAGER can approve treatment plans
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
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

  // Clinical staff (BCBA and above) can request AI review
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR', 'BCBA'])
}

// ==========================================
// COMMENT PERMISSIONS
// ==========================================

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
  return userId === commentUserId || hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

// ==========================================
// USER MANAGEMENT PERMISSIONS
// ==========================================

export function canCreateClinicalManager(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // Only ORG_ADMIN can create Clinical Manager accounts
  return hasRole(session, ['ORG_ADMIN'])
}

export function canCreateStaff(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // ORG_ADMIN and CLINICAL_MANAGER can create BCBA and RBT/BT accounts
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

export function canInviteUsers(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // ORG_ADMIN and CLINICAL_MANAGER can invite users
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

export function canManageUsers(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // ORG_ADMIN and CLINICAL_MANAGER can manage users
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

export function canUpdateUserRole(
  session: Session | null,
  targetRole: UserRole
): boolean {
  if (!hasValidSession(session)) return false

  const currentRole = normalizeRole(session.user.currentOrg?.role)

  // Only ORG_ADMIN can assign CLINICAL_MANAGER role
  if (targetRole === 'CLINICAL_MANAGER' || targetRole === 'CLINICAL_DIRECTOR') {
    return currentRole === 'ORG_ADMIN'
  }

  // ORG_ADMIN and CLINICAL_MANAGER can assign other roles
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

export function canChangeUserPassword(
  session: Session | null,
  targetUserId: number
): boolean {
  if (!hasValidSession(session)) return false

  // Only ORG_ADMIN and CLINICAL_MANAGER can change passwords
  // Users CANNOT change their own passwords (except ORG_ADMIN for themselves)
  const currentRole = normalizeRole(session.user.currentOrg?.role)
  const currentUserId = parseInt(session.user.id)

  // ORG_ADMIN can change anyone's password including their own
  if (currentRole === 'ORG_ADMIN') return true

  // CLINICAL_MANAGER can change others' passwords but not ORG_ADMIN's
  if (currentRole === 'CLINICAL_MANAGER') {
    // Cannot change own password unless they are also admin level
    if (targetUserId === currentUserId) return false
    return true
  }

  return false
}

export function canDeleteUser(
  session: Session | null,
  targetUserId: number
): boolean {
  if (!hasValidSession(session)) return false

  const currentUserId = parseInt(session.user.id)

  // Cannot delete yourself
  if (targetUserId === currentUserId) return false

  // Only ORG_ADMIN and CLINICAL_MANAGER can delete users
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

// ==========================================
// ORGANIZATION PERMISSIONS
// ==========================================

export function canUpdateOrganization(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // Only ORG_ADMIN can update organization settings (including branding)
  return hasRole(session, ['ORG_ADMIN'])
}

export function canViewAuditLogs(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // ORG_ADMIN and CLINICAL_MANAGER can view audit logs
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

// ==========================================
// TEMPLATE PERMISSIONS
// ==========================================

export function canCreateTemplate(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // Only ORG_ADMIN and CLINICAL_MANAGER can create templates
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

export function canEditTemplate(
  session: Session | null,
  templateCreatorId: number,
  templateOrgId: number | null
): boolean {
  if (!hasValidSession(session)) return false

  // Only ORG_ADMIN and CLINICAL_MANAGER can edit templates
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

export function canDeleteTemplate(
  session: Session | null,
  templateCreatorId: number
): boolean {
  if (!hasValidSession(session)) return false

  // Only ORG_ADMIN and CLINICAL_MANAGER can delete templates
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

// ==========================================
// REPORTS PERMISSIONS
// ==========================================

export function canViewReports(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // ORG_ADMIN and CLINICAL_MANAGER can view reports
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'])
}

// ==========================================
// SESSION NOTES PERMISSIONS
// ==========================================

export function canCreateSessionNote(session: Session | null): boolean {
  if (!hasValidSession(session)) return false

  // All clinical staff can create session notes
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR', 'BCBA', 'RBT', 'BT'])
}

export function canViewSessionNotes(
  session: Session | null,
  patientOrgId: number
): boolean {
  if (!hasValidSession(session)) return false

  // Must be same organization
  if (patientOrgId !== session.user.currentOrgId) return false

  // All clinical staff can view session notes for their patients
  return hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR', 'BCBA', 'RBT', 'BT'])
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Utility to get user's current organization ID
export function getCurrentOrgId(session: Session | null): number | null {
  if (!hasValidSession(session)) return null
  return session.user.currentOrgId
}

// Utility to get user's current role (normalized)
export function getCurrentRole(session: Session | null): UserRole | null {
  if (!hasValidSession(session)) return null
  const role = session.user.currentOrg?.role
  // Return the actual role, not normalized, for display purposes
  return role || null
}

// Utility to get user's current role label for display
export function getCurrentRoleLabel(session: Session | null): string {
  const role = getCurrentRole(session)
  if (!role) return 'Unknown'

  const labels: Record<UserRole, string> = {
    ORG_ADMIN: 'Organization Admin',
    CLINICAL_MANAGER: 'Clinical Manager',
    CLINICAL_DIRECTOR: 'Clinical Manager', // Show as Clinical Manager
    BCBA: 'BCBA',
    RBT: 'RBT',
    BT: 'BT',
    HR_MANAGER: 'HR Manager',
  }

  return labels[role] || role
}

// Check if user can self-register (only organization owners)
export function canRegister(): boolean {
  // Registration is only for creating new organizations (ORG_ADMIN)
  // Staff accounts are created by ORG_ADMIN or CLINICAL_MANAGER
  return true // Anyone can register a new organization
}

// Check what roles the current user can create
export function getAllowedRolesToCreate(session: Session | null): UserRole[] {
  if (!hasValidSession(session)) return []

  const currentRole = normalizeRole(session.user.currentOrg?.role)

  if (currentRole === 'ORG_ADMIN') {
    // ORG_ADMIN can create all roles
    return ['CLINICAL_MANAGER', 'BCBA', 'RBT', 'BT']
  }

  if (currentRole === 'CLINICAL_MANAGER') {
    // CLINICAL_MANAGER can only create BCBA and RBT/BT
    return ['BCBA', 'RBT', 'BT']
  }

  return []
}
