import { prisma } from '@/lib/db/prisma'
import { cache } from 'react'

export interface SubdomainValidationResult {
  valid: boolean
  org: {
    id: number
    name: string
    status: string
    logoPath: string | null
    primaryColor: string | null
  } | null
  reason?: string
}

// Reserved subdomains that should be skipped (no validation, treated as main site)
export const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'mail',
  'smtp',
  'ftp',
  'cdn',
  'static',
  'assets',
  'images',
  'docs',
  'help',
  'support',
  'billing',
  'status',
  'blog',
  'dashboard',
])

/**
 * Validate subdomain against the database
 * Uses React's cache() to ensure this is called once per request
 */
export const validateSubdomain = cache(
  async (subdomain: string | null): Promise<SubdomainValidationResult> => {
    // No subdomain = main site, allow through
    if (!subdomain) {
      return { valid: true, org: null }
    }

    // Reserved subdomains bypass validation
    if (RESERVED_SUBDOMAINS.has(subdomain.toLowerCase())) {
      return { valid: true, org: null }
    }

    try {
      const organization = await prisma.organization.findUnique({
        where: { subdomain: subdomain.toLowerCase() },
        select: {
          id: true,
          name: true,
          status: true,
          deletedAt: true,
          logoPath: true,
          primaryColor: true,
        },
      })

      // Organization not found
      if (!organization) {
        return { valid: false, org: null, reason: 'not_found' }
      }

      // Organization is deleted
      if (organization.deletedAt) {
        return { valid: false, org: null, reason: 'deleted' }
      }

      // Organization is suspended or cancelled
      if (organization.status === 'SUSPENDED' || organization.status === 'CANCELLED') {
        return { valid: false, org: null, reason: organization.status.toLowerCase() }
      }

      // Valid organization
      return {
        valid: true,
        org: {
          id: organization.id,
          name: organization.name,
          status: organization.status,
          logoPath: organization.logoPath,
          primaryColor: organization.primaryColor,
        },
      }
    } catch (error) {
      console.error('[Subdomain Validation] Database error:', error)
      // Fail closed - don't allow access on database errors
      return { valid: false, org: null, reason: 'error' }
    }
  }
)

/**
 * Extract subdomain from hostname
 * Supports localhost development and production domains
 */
export function extractSubdomain(hostname: string): string | null {
  // Handle localhost development (subdomain.localhost or subdomain.localhost:3000)
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    const parts = hostname.split('.')
    if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== '127') {
      return parts[0].toLowerCase()
    }
    return null
  }

  // Handle ngrok URLs (subdomain.randomname.ngrok-free.app)
  if (hostname.includes('ngrok')) {
    const parts = hostname.split('.')
    // ngrok format: [subdomain].randomname.ngrok-free.app (5 parts with subdomain)
    // or: randomname.ngrok-free.app (4 parts without subdomain)
    if (parts.length >= 5) {
      return parts[0].toLowerCase()
    }
    return null
  }

  // Production: subdomain.domain.tld
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    const potentialSubdomain = parts[0].toLowerCase()
    // Skip www and app as they're not tenant subdomains
    if (potentialSubdomain !== 'www' && potentialSubdomain !== 'app') {
      return potentialSubdomain
    }
  }

  return null
}
