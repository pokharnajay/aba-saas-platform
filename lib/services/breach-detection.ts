import { prisma } from '@/lib/db/prisma'
import { createAuditLog } from './audit-logger'

/**
 * Breach Detection and Notification System (HIPAA Compliance)
 *
 * This module handles:
 * 1. Detection of potential security breaches
 * 2. Logging and tracking of breach events
 * 3. Notification workflow for breach response
 */

export type BreachType =
  | 'unauthorized_access'
  | 'failed_login_threshold'
  | 'unusual_data_access'
  | 'encryption_failure'
  | 'data_export_anomaly'
  | 'session_hijack_attempt'
  | 'phi_access_violation'
  | 'api_abuse'

export type BreachSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface BreachInput {
  organizationId: number
  userId?: number
  breachType: BreachType
  severity: BreachSeverity
  description: string
  affectedRecordIds?: number[]
  affectedRecordType?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

interface BreachThresholds {
  failedLoginAttempts: number
  unusualAccessCount: number
  dataExportThreshold: number
}

const DEFAULT_THRESHOLDS: BreachThresholds = {
  failedLoginAttempts: 5,
  unusualAccessCount: 100,
  dataExportThreshold: 50,
}

/**
 * Create a security breach record
 */
export async function createSecurityBreach(input: BreachInput) {
  try {
    // Log the breach
    await createAuditLog({
      organizationId: input.organizationId,
      userId: input.userId || 0,
      action: 'security_breach_detected',
      resourceType: 'security',
      changes: {
        breachType: input.breachType,
        severity: input.severity,
        description: input.description,
        affectedRecordIds: input.affectedRecordIds,
        affectedRecordType: input.affectedRecordType,
        metadata: input.metadata,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    })

    // Store breach in dedicated table (if exists) or settings
    // For now, we'll store in organization settings as a breach log
    const org = await prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { settings: true }
    })

    const currentSettings = (org?.settings as any) || {}
    const breachLog = currentSettings.breachLog || []

    breachLog.push({
      id: `breach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: input.breachType,
      severity: input.severity,
      description: input.description,
      affectedRecords: input.affectedRecordIds?.length || 0,
      userId: input.userId,
      ipAddress: input.ipAddress,
      status: 'OPEN',
      notificationSent: false,
    })

    await prisma.organization.update({
      where: { id: input.organizationId },
      data: {
        settings: {
          ...currentSettings,
          breachLog,
          lastBreachDetected: new Date().toISOString(),
        }
      }
    })

    // Trigger notifications based on severity
    if (input.severity === 'CRITICAL' || input.severity === 'HIGH') {
      await sendBreachNotification(input)
    }

    console.error(`[SECURITY BREACH DETECTED] Type: ${input.breachType}, Severity: ${input.severity}`, {
      organizationId: input.organizationId,
      description: input.description,
    })

    return { success: true, breachId: breachLog[breachLog.length - 1].id }
  } catch (error) {
    console.error('Failed to create breach record:', error)
    return { error: 'Failed to log breach' }
  }
}

/**
 * Send breach notification to administrators
 */
async function sendBreachNotification(breach: BreachInput) {
  try {
    // Get organization admins
    const admins = await prisma.organizationUser.findMany({
      where: {
        organizationId: breach.organizationId,
        role: { in: ['ORG_ADMIN', 'CLINICAL_MANAGER'] },
        status: 'ACTIVE'
      },
      include: {
        user: { select: { id: true, email: true, firstName: true } }
      }
    })

    // Create in-app notifications
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.userId,
          organizationId: breach.organizationId,
          notificationType: 'SYSTEM_ALERT',
          title: `Security Alert: ${breach.severity} severity breach detected`,
          message: breach.description,
          actionUrl: '/organization/settings?tab=security',
          isRead: false,
        }
      })
    }

    // TODO: Send email notifications for CRITICAL breaches
    // await sendBreachEmail(admins, breach)

    console.log(`Breach notification sent to ${admins.length} administrators`)
  } catch (error) {
    console.error('Failed to send breach notification:', error)
  }
}

/**
 * Check for failed login threshold breach
 */
export async function checkFailedLoginBreach(
  userId: number,
  organizationId: number,
  ipAddress?: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginAttempts: true, email: true }
  })

  if (user && user.failedLoginAttempts >= DEFAULT_THRESHOLDS.failedLoginAttempts) {
    await createSecurityBreach({
      organizationId,
      userId,
      breachType: 'failed_login_threshold',
      severity: 'MEDIUM',
      description: `User ${user.email} exceeded failed login threshold (${user.failedLoginAttempts} attempts)`,
      ipAddress,
    })
  }
}

/**
 * Check for unusual data access patterns
 */
export async function checkUnusualAccessBreach(
  userId: number,
  organizationId: number,
  accessCount: number,
  timeWindowMinutes: number = 60
) {
  if (accessCount > DEFAULT_THRESHOLDS.unusualAccessCount) {
    await createSecurityBreach({
      organizationId,
      userId,
      breachType: 'unusual_data_access',
      severity: 'HIGH',
      description: `Unusual data access pattern detected: ${accessCount} records accessed in ${timeWindowMinutes} minutes`,
      metadata: { accessCount, timeWindowMinutes }
    })
  }
}

/**
 * Check for PHI access violation
 */
export async function checkPHIAccessViolation(
  userId: number,
  organizationId: number,
  patientId: number,
  reason: string
) {
  await createSecurityBreach({
    organizationId,
    userId,
    breachType: 'phi_access_violation',
    severity: 'HIGH',
    description: `Unauthorized PHI access attempt: ${reason}`,
    affectedRecordIds: [patientId],
    affectedRecordType: 'patient',
  })
}

/**
 * Log encryption failure as potential breach
 */
export async function logEncryptionFailure(
  organizationId: number,
  operation: 'encrypt' | 'decrypt',
  recordType: string,
  recordId?: number
) {
  await createSecurityBreach({
    organizationId,
    breachType: 'encryption_failure',
    severity: 'CRITICAL',
    description: `Encryption ${operation} operation failed for ${recordType}${recordId ? ` (ID: ${recordId})` : ''}`,
    affectedRecordIds: recordId ? [recordId] : undefined,
    affectedRecordType: recordType,
  })
}

/**
 * Get breach statistics for organization
 */
export async function getBreachStatistics(organizationId: number) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true }
  })

  const settings = (org?.settings as any) || {}
  const breachLog = settings.breachLog || []

  const last30Days = new Date()
  last30Days.setDate(last30Days.getDate() - 30)

  const recentBreaches = breachLog.filter(
    (b: any) => new Date(b.timestamp) > last30Days
  )

  return {
    total: breachLog.length,
    last30Days: recentBreaches.length,
    bySeverity: {
      critical: recentBreaches.filter((b: any) => b.severity === 'CRITICAL').length,
      high: recentBreaches.filter((b: any) => b.severity === 'HIGH').length,
      medium: recentBreaches.filter((b: any) => b.severity === 'MEDIUM').length,
      low: recentBreaches.filter((b: any) => b.severity === 'LOW').length,
    },
    byType: recentBreaches.reduce((acc: any, b: any) => {
      acc[b.type] = (acc[b.type] || 0) + 1
      return acc
    }, {}),
    openBreaches: breachLog.filter((b: any) => b.status === 'OPEN').length,
  }
}
