'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/auth-config'
import { createAuditLog } from '@/lib/services/audit-logger'
import { z } from 'zod'
import { hasValidSession, getCurrentRole } from '@/lib/auth/permissions'

const sessionNoteSchema = z.object({
  patientId: z.number(),
  treatmentPlanId: z.number().optional().nullable(),
  sessionType: z.enum(['THERAPY', 'ASSESSMENT', 'PARENT_TRAINING', 'CONSULTATION', 'OTHER']).default('THERAPY'),
  sessionStatus: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).default('COMPLETED'),
  sessionDate: z.string().or(z.date()),
  sessionDuration: z.number().optional().nullable(),
  sessionNotes: z.string().optional().nullable(),
  goalProgress: z.array(z.any()).optional().default([]),
  behaviorsObserved: z.array(z.any()).optional().default([]),
  interventionsUsed: z.array(z.any()).optional().default([]),
  dataCollected: z.array(z.any()).optional().default([]),
  parentFeedback: z.string().optional().nullable(),
  nextSessionPlan: z.string().optional().nullable(),
  staffSignature: z.string().optional().nullable(),
})

export async function createSessionNote(data: z.infer<typeof sessionNoteSchema>) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  const userId = parseInt(session.user.id)
  const userRole = getCurrentRole(session)

  // Only RBT, BT, BCBA, and Clinical Director can create session notes
  if (!['RBT', 'BT', 'BCBA', 'CLINICAL_DIRECTOR'].includes(userRole || '')) {
    return { error: 'Only therapists and clinical staff can create session notes' }
  }

  try {
    const validatedData = sessionNoteSchema.parse(data)

    // Verify patient access
    const patient = await prisma.patient.findFirst({
      where: {
        id: validatedData.patientId,
        organizationId: currentOrgId,
        deletedAt: null,
      },
    })

    if (!patient) {
      return { error: 'Patient not found' }
    }

    // Check if user has access to this patient
    const hasAccess =
      userRole === 'CLINICAL_DIRECTOR' ||
      userRole === 'ORG_ADMIN' ||
      patient.assignedBCBAId === userId ||
      patient.assignedRBTId === userId

    if (!hasAccess) {
      return { error: 'You do not have access to this patient' }
    }

    // Create session note
    const sessionNote = await prisma.sessionNote.create({
      data: {
        organizationId: currentOrgId,
        patientId: validatedData.patientId,
        treatmentPlanId: validatedData.treatmentPlanId || null,
        sessionType: validatedData.sessionType,
        sessionStatus: validatedData.sessionStatus,
        sessionDate: new Date(validatedData.sessionDate),
        sessionDuration: validatedData.sessionDuration || null,
        sessionNotes: validatedData.sessionNotes || null,
        goalProgress: validatedData.goalProgress as any,
        behaviorsObserved: validatedData.behaviorsObserved as any,
        interventionsUsed: validatedData.interventionsUsed as any,
        dataCollected: validatedData.dataCollected as any,
        parentFeedback: validatedData.parentFeedback || null,
        nextSessionPlan: validatedData.nextSessionPlan || null,
        staffSignature: validatedData.staffSignature || null,
        signedAt: validatedData.staffSignature ? new Date() : null,
        createdById: userId,
      },
    })

    // Audit log
    await createAuditLog({
      organizationId: currentOrgId,
      userId,
      action: 'create_session_note',
      resourceType: 'session_note',
      resourceId: sessionNote.id,
      phiAccessed: true,
      changes: { patient_id: validatedData.patientId },
    })

    revalidatePath(`/patients/${validatedData.patientId}`)
    revalidatePath('/session-notes')

    return { success: true, sessionNoteId: sessionNote.id }
  } catch (error: any) {
    console.error('Create session note error:', error)
    return { error: error.message || 'Failed to create session note' }
  }
}

export async function getSessionNotes(patientId?: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  const userId = parseInt(session.user.id)
  const userRole = getCurrentRole(session)

  try {
    const where: any = {
      organizationId: currentOrgId,
      deletedAt: null,
    }

    // Filter by patient if provided
    if (patientId) {
      where.patientId = patientId

      // Verify access to this patient
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          organizationId: currentOrgId,
          deletedAt: null,
        },
      })

      if (!patient) {
        return { error: 'Patient not found' }
      }

      // Check access
      const hasAccess =
        userRole === 'CLINICAL_DIRECTOR' ||
        userRole === 'ORG_ADMIN' ||
        patient.assignedBCBAId === userId ||
        patient.assignedRBTId === userId

      if (!hasAccess) {
        return { error: 'You do not have access to this patient' }
      }
    } else {
      // If no patient specified, filter by user role
      if (userRole === 'BCBA') {
        where.patient = {
          assignedBCBAId: userId,
        }
      } else if (userRole === 'RBT' || userRole === 'BT') {
        where.patient = {
          assignedRBTId: userId,
        }
      }
      // CLINICAL_DIRECTOR and ORG_ADMIN see all session notes
    }

    const sessionNotes = await prisma.sessionNote.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            patientCode: true,
            firstNameEncrypted: true,
            lastNameEncrypted: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        treatmentPlan: {
          select: {
            id: true,
            title: true,
            version: true,
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
    })

    // Decrypt patient names
    const decryptedNotes = sessionNotes.map((note) => {
      const { decryptPatientPHI } = require('@/lib/services/encryption')
      const decryptedPatient = decryptPatientPHI(note.patient)
      return {
        ...note,
        patient: {
          ...note.patient,
          firstName: decryptedPatient.firstName,
          lastName: decryptedPatient.lastName,
        },
      }
    })

    // Audit log
    await createAuditLog({
      organizationId: currentOrgId,
      userId,
      action: 'list_session_notes',
      resourceType: 'session_note',
      phiAccessed: true,
    })

    return { sessionNotes: decryptedNotes }
  } catch (error: any) {
    console.error('Get session notes error:', error)
    return { error: error.message || 'Failed to fetch session notes' }
  }
}

export async function getSessionNote(id: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  const userId = parseInt(session.user.id)
  const userRole = getCurrentRole(session)

  try {
    const sessionNote = await prisma.sessionNote.findFirst({
      where: {
        id,
        organizationId: currentOrgId,
        deletedAt: null,
      },
      include: {
        patient: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        treatmentPlan: {
          select: {
            id: true,
            title: true,
            version: true,
          },
        },
      },
    })

    if (!sessionNote) {
      return { error: 'Session note not found' }
    }

    // Check access
    const hasAccess =
      userRole === 'CLINICAL_DIRECTOR' ||
      userRole === 'ORG_ADMIN' ||
      sessionNote.patient.assignedBCBAId === userId ||
      sessionNote.patient.assignedRBTId === userId ||
      sessionNote.createdById === userId

    if (!hasAccess) {
      return { error: 'You do not have access to this session note' }
    }

    // Decrypt patient PHI
    const { decryptPatientPHI } = require('@/lib/services/encryption')
    const decryptedPatient = decryptPatientPHI(sessionNote.patient)

    // Audit log
    await createAuditLog({
      organizationId: currentOrgId,
      userId,
      action: 'view_session_note',
      resourceType: 'session_note',
      resourceId: id,
      phiAccessed: true,
    })

    return {
      sessionNote: {
        ...sessionNote,
        patient: {
          ...sessionNote.patient,
          ...decryptedPatient,
        },
      },
    }
  } catch (error: any) {
    console.error('Get session note error:', error)
    return { error: error.message || 'Failed to fetch session note' }
  }
}

export async function updateSessionNote(id: number, data: z.infer<typeof sessionNoteSchema>) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  const userId = parseInt(session.user.id)
  const userRole = getCurrentRole(session)

  try {
    const validatedData = sessionNoteSchema.parse(data)

    // Get existing session note
    const existingNote = await prisma.sessionNote.findFirst({
      where: {
        id,
        organizationId: currentOrgId,
        deletedAt: null,
      },
    })

    if (!existingNote) {
      return { error: 'Session note not found' }
    }

    // Only the creator can edit (for now)
    if (existingNote.createdById !== userId && userRole !== 'CLINICAL_DIRECTOR' && userRole !== 'ORG_ADMIN') {
      return { error: 'You can only edit your own session notes' }
    }

    // Update session note
    const updatedNote = await prisma.sessionNote.update({
      where: { id },
      data: {
        sessionType: validatedData.sessionType,
        sessionStatus: validatedData.sessionStatus,
        sessionDate: new Date(validatedData.sessionDate),
        sessionDuration: validatedData.sessionDuration || null,
        sessionNotes: validatedData.sessionNotes || null,
        goalProgress: validatedData.goalProgress as any,
        behaviorsObserved: validatedData.behaviorsObserved as any,
        interventionsUsed: validatedData.interventionsUsed as any,
        dataCollected: validatedData.dataCollected as any,
        parentFeedback: validatedData.parentFeedback || null,
        nextSessionPlan: validatedData.nextSessionPlan || null,
        staffSignature: validatedData.staffSignature || null,
        signedAt: validatedData.staffSignature && !existingNote.signedAt ? new Date() : existingNote.signedAt,
      },
    })

    // Audit log
    await createAuditLog({
      organizationId: currentOrgId,
      userId,
      action: 'update_session_note',
      resourceType: 'session_note',
      resourceId: id,
      phiAccessed: true,
      changes: validatedData,
    })

    revalidatePath(`/patients/${existingNote.patientId}`)
    revalidatePath('/session-notes')

    return { success: true, sessionNoteId: updatedNote.id }
  } catch (error: any) {
    console.error('Update session note error:', error)
    return { error: error.message || 'Failed to update session note' }
  }
}

export async function deleteSessionNote(id: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  const userId = parseInt(session.user.id)
  const userRole = getCurrentRole(session)

  try {
    // Get existing session note
    const existingNote = await prisma.sessionNote.findFirst({
      where: {
        id,
        organizationId: currentOrgId,
        deletedAt: null,
      },
    })

    if (!existingNote) {
      return { error: 'Session note not found' }
    }

    // Only creator or admins can delete
    if (existingNote.createdById !== userId && userRole !== 'CLINICAL_DIRECTOR' && userRole !== 'ORG_ADMIN') {
      return { error: 'You can only delete your own session notes' }
    }

    // Soft delete
    await prisma.sessionNote.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    })

    // Audit log
    await createAuditLog({
      organizationId: currentOrgId,
      userId,
      action: 'delete_session_note',
      resourceType: 'session_note',
      resourceId: id,
      phiAccessed: false,
    })

    revalidatePath(`/patients/${existingNote.patientId}`)
    revalidatePath('/session-notes')

    return { success: true }
  } catch (error: any) {
    console.error('Delete session note error:', error)
    return { error: error.message || 'Failed to delete session note' }
  }
}
