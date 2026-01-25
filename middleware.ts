import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth-config'

// Reserved subdomains that should be skipped (no validation needed)
const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'api', 'admin', 'mail', 'smtp', 'ftp', 'cdn',
  'static', 'assets', 'images', 'docs', 'help', 'support',
  'billing', 'status', 'blog', 'dashboard'
])

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // Use the host header to get the full hostname including subdomain
  // request.nextUrl.hostname only returns 'localhost', not 'xyz.localhost'
  const host = request.headers.get('host') || request.nextUrl.hostname
  const hostname = host.split(':')[0] // Remove port number


  // ============================================
  // HTTPS ENFORCEMENT (HIPAA)
  // ============================================
  if (process.env.NODE_ENV === 'production') {
    const proto = request.headers.get('x-forwarded-proto')
    if (proto === 'http') {
      const httpsUrl = new URL(request.url)
      httpsUrl.protocol = 'https:'
      return NextResponse.redirect(httpsUrl, 301)
    }
  }

  // ============================================
  // SUBDOMAIN EXTRACTION (No DB validation here)
  // ============================================
  // Database validation happens in layouts (Server Components)
  // Middleware only extracts and passes the subdomain via request headers

  const subdomain = extractSubdomain(hostname)

  // Clone request headers and add subdomain
  const requestHeaders = new Headers(request.headers)
  if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain.toLowerCase())) {
    requestHeaders.set('x-subdomain', subdomain.toLowerCase())
  }

  // Create response with modified request headers (for server components)
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Add security headers to response
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // ============================================
  // STATIC FILES & INTERNALS
  // ============================================
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return response
  }

  // ============================================
  // PUBLIC ROUTES
  // ============================================
  const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/colors',
    '/api/health',
    '/api/auth',
    '/subdomain-not-found'
  ]
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

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
 * Extract subdomain from hostname
 * Supports localhost development and production domains
 */
function extractSubdomain(hostname: string): string | null {
  // Handle localhost development (subdomain.localhost or subdomain.localhost:3000)
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    const parts = hostname.split('.')
    if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== '127') {
      return parts[0]
    }
    return null
  }

  // Handle ngrok URLs (subdomain.randomname.ngrok-free.app)
  if (hostname.includes('ngrok')) {
    const parts = hostname.split('.')
    // ngrok format: [subdomain].randomname.ngrok-free.app (5 parts with subdomain)
    if (parts.length >= 5) {
      return parts[0]
    }
    return null
  }

  // Production: subdomain.domain.tld
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    const potentialSubdomain = parts[0]
    if (potentialSubdomain !== 'www' && potentialSubdomain !== 'app') {
      return potentialSubdomain
    }
  }

  return null
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|uploads).*)',
  ],
}
