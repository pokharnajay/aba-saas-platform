import { prisma } from '@/lib/db/prisma'

/**
 * Consent Status for PHI Access
 */
export type ConsentStatus =
  | 'VERIFIED'           // Patient consent verified
  | 'TREATMENT'          // Treatment relationship (implied consent)
  | 'EMERGENCY'          // Emergency access (no consent required)
  | 'ADMINISTRATIVE'     // Administrative functions (system)
  | 'AUDIT'              // Audit/compliance review
  | 'NOT_REQUIRED'       // Non-PHI access
  | 'PENDING'            // Consent pending verification
  | 'REVOKED'            // Consent revoked

/**
 * Access Reason Categories
 */
export type AccessReason =
  | 'direct_care'        // Direct patient care
  | 'treatment_planning' // Treatment plan creation/review
  | 'session_note'       // Session documentation
  | 'billing'            // Billing operations
  | 'quality_assurance'  // QA/compliance review
  | 'administrative'     // Administrative tasks
  | 'emergency'          // Emergency access
  | 'audit'              // Audit trail review
  | 'export'             // Data export
  | 'other'              // Other (requires explanation)

interface AuditLogInput {
  organizationId?: number | null
  userId?: number | null
  action: string
  resourceType?: string | null
  resourceId?: number | null
  ipAddress?: string
  userAgent?: string | null
  requestMethod?: string | null
  requestPath?: string | null
  requestBody?: any
  responseStatus?: number | null
  changes?: any
  phiAccessed?: boolean
  // Enhanced consent tracking
  consentStatus?: ConsentStatus
  accessReason?: AccessReason
  accessReasonDetails?: string
  patientId?: number | null  // Which patient's PHI was accessed
  fieldsAccessed?: string[]  // Specific PHI fields accessed
  consentVerified?: boolean  // Legacy support
  responseTimeMs?: number | null
}

/**
 * Creates a HIPAA-compliant audit log entry
 * Required for all PHI access and system-critical operations
 */
export async function createAuditLog(input: AuditLogInput) {
  try {
    // Determine consent status based on context
    let consentStatus: ConsentStatus = input.consentStatus || 'NOT_REQUIRED'

    if (input.phiAccessed && !input.consentStatus) {
      // Auto-determine consent status for PHI access
      if (input.action.includes('emergency')) {
        consentStatus = 'EMERGENCY'
      } else if (input.action.includes('audit') || input.action.includes('list')) {
        consentStatus = 'AUDIT'
      } else if (['create', 'update', 'view'].some(a => input.action.includes(a))) {
        consentStatus = 'TREATMENT'
      } else {
        consentStatus = 'ADMINISTRATIVE'
      }
    }

    // Build the changes object with enhanced tracking
    const enhancedChanges = {
      ...input.changes,
      _consent: {
        status: consentStatus,
        reason: input.accessReason || (input.phiAccessed ? 'direct_care' : undefined),
        reasonDetails: input.accessReasonDetails,
        patientId: input.patientId,
        fieldsAccessed: input.fieldsAccessed,
        timestamp: new Date().toISOString(),
      }
    }

    const auditLog = await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId || null,
        userId: input.userId || null,
        action: input.action,
        resourceType: input.resourceType || null,
        resourceId: input.resourceId || null,
        ipAddress: input.ipAddress || '0.0.0.0',
        userAgent: input.userAgent || null,
        requestMethod: input.requestMethod || null,
        requestPath: input.requestPath || null,
        requestBody: input.requestBody || null,
        responseStatus: input.responseStatus || null,
        changes: enhancedChanges,
        phiAccessed: input.phiAccessed || false,
        consentVerified: consentStatus !== 'PENDING' && consentStatus !== 'REVOKED',
        responseTimeMs: input.responseTimeMs || null,
      },
    })

    return auditLog
  } catch (error) {
    // Audit logging failures should not break the application
    // But should be logged for monitoring
    console.error('Failed to create audit log:', error)
    return null
  }
}

/**
 * Create audit log specifically for PHI access with required consent tracking
 */
export async function createPHIAccessLog({
  organizationId,
  userId,
  patientId,
  action,
  fieldsAccessed,
  accessReason,
  accessReasonDetails,
  consentStatus = 'TREATMENT',
  ipAddress,
  userAgent,
}: {
  organizationId: number
  userId: number
  patientId: number
  action: string
  fieldsAccessed: string[]
  accessReason: AccessReason
  accessReasonDetails?: string
  consentStatus?: ConsentStatus
  ipAddress?: string
  userAgent?: string
}) {
  return createAuditLog({
    organizationId,
    userId,
    action,
    resourceType: 'patient',
    resourceId: patientId,
    phiAccessed: true,
    consentStatus,
    accessReason,
    accessReasonDetails,
    patientId,
    fieldsAccessed,
    ipAddress,
    userAgent,
  })
}

/**
 * Gets audit logs for a specific resource
 */
export async function getAuditLogs({
  organizationId,
  userId,
  resourceType,
  resourceId,
  startDate,
  endDate,
  limit = 100,
}: {
  organizationId?: number
  userId?: number
  resourceType?: string
  resourceId?: number
  startDate?: Date
  endDate?: Date
  limit?: number
}) {
  const where: any = {}

  if (organizationId) where.organizationId = organizationId
  if (userId) where.userId = userId
  if (resourceType) where.resourceType = resourceType
  if (resourceId) where.resourceId = resourceId

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  return logs
}

/**
 * Gets PHI access logs for compliance reporting
 */
export async function getPHIAccessLogs({
  organizationId,
  startDate,
  endDate,
  patientId,
  limit = 1000,
}: {
  organizationId: number
  startDate: Date
  endDate: Date
  patientId?: number
  limit?: number
}) {
  const where: any = {
    organizationId,
    phiAccessed: true,
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  }

  if (patientId) {
    where.resourceType = 'patient'
    where.resourceId = patientId
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  return logs
}

/**
 * Get consent summary for a patient
 */
export async function getPatientConsentHistory({
  organizationId,
  patientId,
  limit = 100,
}: {
  organizationId: number
  patientId: number
  limit?: number
}) {
  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      resourceType: 'patient',
      resourceId: patientId,
      phiAccessed: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  // Extract consent information from changes
  return logs.map(log => ({
    id: log.id,
    timestamp: log.createdAt,
    userId: log.userId,
    userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown',
    action: log.action,
    consentStatus: (log.changes as any)?._consent?.status || 'UNKNOWN',
    accessReason: (log.changes as any)?._consent?.reason || 'unknown',
    fieldsAccessed: (log.changes as any)?._consent?.fieldsAccessed || [],
  }))
}

/**
 * Middleware helper to extract request metadata
 */
export function extractRequestMetadata(request: Request) {
  const headers = request.headers
  const url = new URL(request.url)

  return {
    ipAddress: headers.get('x-forwarded-for')?.split(',')[0] || headers.get('x-real-ip') || '0.0.0.0',
    userAgent: headers.get('user-agent') || null,
    requestMethod: request.method,
    requestPath: url.pathname,
  }
}

/**
 * Generate HIPAA compliance report for an organization
 */
export async function generateComplianceReport({
  organizationId,
  startDate,
  endDate,
}: {
  organizationId: number
  startDate: Date
  endDate: Date
}) {
  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  const phiLogs = logs.filter(l => l.phiAccessed)

  // Analyze consent statuses
  const consentBreakdown: Record<string, number> = {}
  phiLogs.forEach(log => {
    const status = (log.changes as any)?._consent?.status || 'UNKNOWN'
    consentBreakdown[status] = (consentBreakdown[status] || 0) + 1
  })

  // Analyze access reasons
  const reasonBreakdown: Record<string, number> = {}
  phiLogs.forEach(log => {
    const reason = (log.changes as any)?._consent?.reason || 'unknown'
    reasonBreakdown[reason] = (reasonBreakdown[reason] || 0) + 1
  })

  return {
    period: { startDate, endDate },
    totalAuditEntries: logs.length,
    phiAccessEntries: phiLogs.length,
    consentBreakdown,
    reasonBreakdown,
    uniqueUsersAccessingPHI: new Set(phiLogs.map(l => l.userId)).size,
    uniquePatientsAccessed: new Set(
      phiLogs
        .filter(l => l.resourceType === 'patient')
        .map(l => l.resourceId)
    ).size,
  }
}
