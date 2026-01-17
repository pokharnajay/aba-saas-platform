import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth-config'

export async function middleware(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  // Public routes
  const publicRoutes = ['/login', '/register', '/api/health']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Redirect authenticated users away from auth pages
  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Protect all other routes
  if (!isPublicRoute && !session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check inactivity timeout (15 minutes)
  if (session?.user) {
    const lastActivity = (session.user as any).lastActivity
    if (lastActivity) {
      const inactiveTime = Date.now() - new Date(lastActivity).getTime()
      const maxInactivity = 15 * 60 * 1000 // 15 minutes

      if (inactiveTime > maxInactivity) {
        // Force logout
        return NextResponse.redirect(new URL('/login?timeout=true', request.url))
      }
    }
  }

  // Set tenant context header for API routes
  if (pathname.startsWith('/api') && session?.user?.currentOrgId) {
    const response = NextResponse.next()
    response.headers.set('x-organization-id', session.user.currentOrgId.toString())
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
