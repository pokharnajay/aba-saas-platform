import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { auth } from '@/lib/auth/auth-config'
import { prisma } from '@/lib/db/prisma'
import { hasRole, hasValidSession } from '@/lib/auth/permissions'

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    // Check authentication
    if (!hasValidSession(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ORG_ADMIN can upload logo
    if (!hasRole(session, ['ORG_ADMIN'])) {
      return NextResponse.json({ error: 'Only organization admins can upload logos' }, { status: 403 })
    }

    const currentOrgId = session.user.currentOrgId
    if (!currentOrgId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('logo') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPG, PNG, SVG, WebP' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'logos')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const extension = file.name.split('.').pop() || 'png'
    const filename = `org-${currentOrgId}-${Date.now()}.${extension}`
    const filepath = path.join(uploadsDir, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Store the relative path that can be used with Next.js Image
    const logoPath = `/uploads/logos/${filename}`

    // Update organization with logo path
    await prisma.organization.update({
      where: { id: currentOrgId },
      data: { logoPath },
    })

    return NextResponse.json({
      success: true,
      logoPath,
      message: 'Logo uploaded successfully'
    })
  } catch (error: any) {
    console.error('Logo upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload logo' },
      { status: 500 }
    )
  }
}
