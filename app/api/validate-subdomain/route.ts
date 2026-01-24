import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  // Only allow internal requests from middleware
  const isInternalRequest = request.headers.get('x-internal-request') === 'true'

  // In development, allow all requests for testing
  if (process.env.NODE_ENV === 'production' && !isInternalRequest) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subdomain = request.nextUrl.searchParams.get('subdomain')

  if (!subdomain) {
    return NextResponse.json({ valid: false, error: 'Subdomain required' }, { status: 400 })
  }

  try {
    // Check if organization with this subdomain exists and is active
    const organization = await prisma.organization.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
      select: {
        id: true,
        status: true,
        deletedAt: true
      }
    })

    if (!organization) {
      return NextResponse.json({ valid: false, reason: 'not_found' })
    }

    if (organization.deletedAt) {
      return NextResponse.json({ valid: false, reason: 'deleted' })
    }

    if (organization.status === 'SUSPENDED' || organization.status === 'CANCELLED') {
      return NextResponse.json({ valid: false, reason: organization.status.toLowerCase() })
    }

    return NextResponse.json({
      valid: true,
      orgId: organization.id,
      status: organization.status
    })
  } catch (error: any) {
    console.error('Subdomain validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Validation failed' },
      { status: 500 }
    )
  }
}
