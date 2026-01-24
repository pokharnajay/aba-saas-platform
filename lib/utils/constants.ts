// User Roles - Only 4 active roles
// ORG_ADMIN: Organization owner with full control
// CLINICAL_MANAGER: Same permissions as ORG_ADMIN except cannot create other Clinical Managers
// BCBA: Board Certified Behavior Analyst - creates treatment plans
// RBT/BT: Registered Behavior Technician / Behavior Technician - session notes, view-only treatment plans
export const USER_ROLES = {
  ORG_ADMIN: 'ORG_ADMIN',
  CLINICAL_MANAGER: 'CLINICAL_MANAGER',
  BCBA: 'BCBA',
  RBT: 'RBT',
  BT: 'BT',
} as const

// Role display labels for UI
export const ROLE_LABELS: Record<string, string> = {
  ORG_ADMIN: 'Organization Admin',
  CLINICAL_MANAGER: 'Clinical Manager',
  CLINICAL_DIRECTOR: 'Clinical Manager', // Legacy - displays as Clinical Manager
  BCBA: 'BCBA',
  RBT: 'RBT',
  BT: 'BT',
  HR_MANAGER: 'HR Manager', // Legacy
}

export const PATIENT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DISCHARGED: 'DISCHARGED',
  ON_HOLD: 'ON_HOLD',
} as const

export const PLAN_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_BCBA_REVIEW: 'PENDING_BCBA_REVIEW',
  PENDING_MANAGER_REVIEW: 'PENDING_MANAGER_REVIEW', // Renamed from PENDING_CLINICAL_DIRECTOR
  PENDING_CLINICAL_DIRECTOR: 'PENDING_CLINICAL_DIRECTOR', // Legacy - keep for existing data
  APPROVED: 'APPROVED',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
  REJECTED: 'REJECTED',
} as const

// Plan status display labels
export const PLAN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_BCBA_REVIEW: 'Pending BCBA Review',
  PENDING_MANAGER_REVIEW: 'Pending Manager Review',
  PENDING_CLINICAL_DIRECTOR: 'Pending Manager Review', // Legacy displays same
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
  REJECTED: 'Rejected',
}

export const SUBSCRIPTION_PLANS = {
  STARTER: 'STARTER',
  PROFESSIONAL: 'PROFESSIONAL',
  ENTERPRISE: 'ENTERPRISE',
} as const

export const REVIEW_TYPES = {
  DRAFT_REVIEW: 'DRAFT_REVIEW',
  CLINICAL_REVIEW: 'CLINICAL_REVIEW',
  COMPLIANCE_REVIEW: 'COMPLIANCE_REVIEW',
} as const

export const NOTIFICATION_TYPES = {
  TREATMENT_PLAN_REVIEW: 'TREATMENT_PLAN_REVIEW',
  TREATMENT_PLAN_APPROVED: 'TREATMENT_PLAN_APPROVED',
  TREATMENT_PLAN_REJECTED: 'TREATMENT_PLAN_REJECTED',
  CERTIFICATION_EXPIRING: 'CERTIFICATION_EXPIRING',
  PLAN_EXPIRING: 'PLAN_EXPIRING',
  PATIENT_ASSIGNMENT: 'PATIENT_ASSIGNMENT',
  SYSTEM_ALERT: 'SYSTEM_ALERT',
} as const

export type UserRole = keyof typeof USER_ROLES
export type PatientStatus = keyof typeof PATIENT_STATUS
export type PlanStatus = keyof typeof PLAN_STATUS
export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS
export type ReviewType = keyof typeof REVIEW_TYPES
export type NotificationType = keyof typeof NOTIFICATION_TYPES
