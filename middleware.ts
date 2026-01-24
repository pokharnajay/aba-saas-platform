import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth-config'

// Cache for subdomain validation (in production, use Redis)
const subdomainCache = new Map<string, { valid: boolean; orgId: number | null; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl
  const response = NextResponse.next()

  // ============================================
  // HTTPS ENFORCEMENT & SECURITY HEADERS (HIPAA)
  // ============================================
  if (process.env.NODE_ENV === 'production') {
    // Enforce HTTPS
    const proto = request.headers.get('x-forwarded-proto')
    if (proto === 'http') {
      const httpsUrl = new URL(request.url)
      httpsUrl.protocol = 'https:'
      return NextResponse.redirect(httpsUrl, 301)
    }
  }

  // Add security headers (HSTS, CSP, etc.)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // ============================================
  // SUBDOMAIN VALIDATION
  // ============================================
  // Extract subdomain from hostname
  // Supports: subdomain.localhost:3000 or subdomain.abaplatform.app
  let subdomain: string | null = null

  // Handle localhost development
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    // Format: subdomain.localhost:3000
    const parts = hostname.split('.')
    if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== 'www') {
      subdomain = parts[0]
    }
  } else {
    // Production: subdomain.abaplatform.app or subdomain.yourdomain.com
    const parts = hostname.split('.')
    // Assuming format: subdomain.domain.tld (3 parts) or subdomain.domain.co.uk (4 parts)
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'app') {
      subdomain = parts[0]
    }
  }

  // If we have a subdomain, validate it
  if (subdomain) {
    const validationResult = await validateSubdomain(subdomain, request)

    if (!validationResult.valid) {
      // Invalid subdomain - show 404 page
      return NextResponse.rewrite(new URL('/subdomain-not-found', request.url))
    }

    // Set subdomain context in headers for server components
    response.headers.set('x-subdomain', subdomain)
    if (validationResult.orgId) {
      response.headers.set('x-organization-id', validationResult.orgId.toString())
    }
  }

  // ============================================
  // PUBLIC ROUTES
  // ============================================
  const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/api/health',
    '/api/auth',
    '/api/validate-subdomain',
    '/subdomain-not-found'
  ]
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return response
  }

  // ============================================
  // AUTHENTICATION CHECK
  // ============================================
  const session = await auth()

  // Redirect authenticated users away from auth pages
  if (isPublicRoute && session && !pathname.startsWith('/api') && pathname !== '/subdomain-not-found') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Protect all other routes
  if (!isPublicRoute && !session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ============================================
  // INACTIVITY TIMEOUT (15 minutes - HIPAA requirement)
  // ============================================
  if (session?.user) {
    const lastActivity = (session.user as any).lastActivity
    if (lastActivity) {
      const inactiveTime = Date.now() - new Date(lastActivity).getTime()
      const maxInactivity = 15 * 60 * 1000 // 15 minutes

      if (inactiveTime > maxInactivity) {
        // Force logout due to inactivity
        return NextResponse.redirect(new URL('/login?timeout=true', request.url))
      }
    }
  }

  // ============================================
  // SET TENANT CONTEXT FOR API ROUTES
  // ============================================
  if (pathname.startsWith('/api') && session?.user?.currentOrgId) {
    response.headers.set('x-organization-id', session.user.currentOrgId.toString())
  }

  return response
}

/**
 * Validate if a subdomain exists and is active
 */
async function validateSubdomain(
  subdomain: string,
  request: NextRequest
): Promise<{ valid: boolean; orgId: number | null }> {
  // Check cache first
  const cached = subdomainCache.get(subdomain)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { valid: cached.valid, orgId: cached.orgId }
  }

  try {
    // Build the validation URL using the current request's origin
    const url = new URL('/api/validate-subdomain', request.url)
    url.searchParams.set('subdomain', subdomain)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-internal-request': 'true'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const result = { valid: data.valid, orgId: data.orgId || null }

      // Cache the result
      subdomainCache.set(subdomain, { ...result, timestamp: Date.now() })

      return result
    }
  } catch (error) {
    console.error('Subdomain validation error:', error)
  }

  // Default to invalid if we can't validate
  return { valid: false, orgId: null }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|uploads).*)',
  ],
}
