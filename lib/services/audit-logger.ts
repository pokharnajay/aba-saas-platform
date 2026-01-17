import { prisma } from '@/lib/db/prisma'

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
  consentVerified?: boolean
  responseTimeMs?: number | null
}

/**
 * Creates a HIPAA-compliant audit log entry
 * Required for all PHI access and system-critical operations
 */
export async function createAuditLog(input: AuditLogInput) {
  try {
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
        changes: input.changes || null,
        phiAccessed: input.phiAccessed || false,
        consentVerified: input.consentVerified !== false, // Default true
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
  limit = 1000,
}: {
  organizationId: number
  startDate: Date
  endDate: Date
  limit?: number
}) {
  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      phiAccessed: true,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
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
