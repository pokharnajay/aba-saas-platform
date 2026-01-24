'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/auth-config'
import { encryptPatientPHI, decryptPatientPHI } from '@/lib/services/encryption'
import { createAuditLog } from '@/lib/services/audit-logger'
import { patientSchema } from '@/lib/validations/patient'
import { z } from 'zod'
import {
  canCreatePatient,
  canViewPatient,
  canEditPatient,
  canDeletePatient,
  hasValidSession,
  getCurrentRole,
} from '@/lib/auth/permissions'
import { getPatientAccessFilter } from '@/lib/auth/filters'

export async function createPatient(data: z.infer<typeof patientSchema>) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    // Validate input
    const validatedData = patientSchema.parse(data)

    // Check permissions
    if (!canCreatePatient(session)) {
      throw new Error('Insufficient permissions to create patients')
    }

    // Encrypt PHI
    const encryptedPHI = encryptPatientPHI(validatedData)

    // Generate patient code
    const org = await prisma.organization.findUnique({
      where: { id: currentOrgId }
    })

    if (!org) {
      throw new Error('Organization not found')
    }

    const lastPatient = await prisma.patient.findFirst({
      where: { organizationId: currentOrgId },
      orderBy: { id: 'desc' }
    })

    const patientNumber = lastPatient ? lastPatient.id + 1 : 1
    const patientCode = `${org.subdomain.toUpperCase()}-${String(patientNumber).padStart(4, '0')}`

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        ...encryptedPHI,
        organizationId: currentOrgId,
        patientCode,
        diagnosis: validatedData.diagnosis as any,
        allergies: validatedData.allergies || [],
        medications: validatedData.medications as any,
        assignedBCBAId: validatedData.assignedBCBAId || null,
        assignedRBTId: validatedData.assignedRBTId || null,
        enrollmentDate: validatedData.enrollmentDate ? new Date(validatedData.enrollmentDate) : null,
        createdById: parseInt(session.user.id)
      }
    })

    // Audit log
    await createAuditLog({
      organizationId: currentOrgId,
      userId: parseInt(session.user.id),
      action: 'create_patient',
      resourceType: 'patient',
      resourceId: patient.id,
      phiAccessed: true,
      changes: { patient_code: patientCode }
    })

    revalidatePath('/patients')

    return { success: true, patientId: patient.id }
  } catch (error: any) {
    console.error('Create patient error:', error)
    return { error: error.message || 'Failed to create patient' }
  }
}

export async function getPatients() {
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
  if (!userRole) {
    throw new Error('Invalid user role')
  }

  // Get role-based filter
  const accessFilter = getPatientAccessFilter(userId, userRole, currentOrgId)

  const patients = await prisma.patient.findMany({
    where: accessFilter,
    include: {
      assignedBCBA: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      assignedRBT: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Decrypt PHI for display
  const decryptedPatients = patients.map((patient) => {
    const decrypted = decryptPatientPHI(patient)
    return decrypted
  })

  // Audit log
  await createAuditLog({
    organizationId: currentOrgId,
    userId: parseInt(session.user.id),
    action: 'list_patients',
    resourceType: 'patient',
    phiAccessed: true,
  })

  return decryptedPatients
}

export async function getPatient(id: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  const patient = await prisma.patient.findFirst({
    where: {
      id,
      organizationId: currentOrgId,
      deletedAt: null,
    },
    include: {
      assignedBCBA: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      assignedRBT: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      treatmentPlans: {
        where: {
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  })

  if (!patient) {
    throw new Error('Patient not found')
  }

  // Check if user has permission to view this patient
  if (!canViewPatient(session, patient)) {
    throw new Error('You do not have permission to view this patient')
  }

  // Decrypt PHI
  const decrypted = decryptPatientPHI(patient)

  // Audit log
  await createAuditLog({
    organizationId: currentOrgId,
    userId: parseInt(session.user.id),
    action: 'view_patient',
    resourceType: 'patient',
    resourceId: id,
    phiAccessed: true,
  })

  return decrypted
}

export async function updatePatient(id: number, data: z.infer<typeof patientSchema>) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    // Validate input
    const validatedData = patientSchema.parse(data)

    // Get existing patient
    const patient = await prisma.patient.findFirst({
      where: {
        id,
        organizationId: currentOrgId,
        deletedAt: null,
      },
    })

    if (!patient) {
      throw new Error('Patient not found')
    }

    // Check permissions
    if (!canEditPatient(session, patient)) {
      throw new Error('Insufficient permissions to edit this patient')
    }

    // Encrypt PHI
    const encryptedPHI = encryptPatientPHI(validatedData)

    // Update patient
    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: {
        ...encryptedPHI,
        diagnosis: validatedData.diagnosis as any,
        allergies: validatedData.allergies || [],
        medications: validatedData.medications as any,
        assignedBCBAId: validatedData.assignedBCBAId || null,
        assignedRBTId: validatedData.assignedRBTId || null,
        enrollmentDate: validatedData.enrollmentDate ? new Date(validatedData.enrollmentDate) : null,
      },
    })

    // Audit log
    await createAuditLog({
      organizationId: currentOrgId,
      userId: parseInt(session.user.id),
      action: 'update_patient',
      resourceType: 'patient',
      resourceId: id,
      phiAccessed: true,
      changes: validatedData,
    })

    revalidatePath('/patients')
    revalidatePath(`/patients/${id}`)

    return { success: true, patientId: updatedPatient.id }
  } catch (error: any) {
    console.error('Update patient error:', error)
    return { error: error.message || 'Failed to update patient' }
  }
}

export async function deletePatient(id: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    // Get existing patient
    const patient = await prisma.patient.findFirst({
      where: {
        id,
        organizationId: currentOrgId,
        deletedAt: null,
      },
    })

    if (!patient) {
      throw new Error('Patient not found')
    }

    // Check permissions
    if (!canDeletePatient(session, patient)) {
      throw new Error('Insufficient permissions to delete this patient')
    }

    // Soft delete
    await prisma.patient.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    })

    // Audit log
    await createAuditLog({
      organizationId: currentOrgId,
      userId: parseInt(session.user.id),
      action: 'delete_patient',
      resourceType: 'patient',
      resourceId: id,
      phiAccessed: false,
    })

    revalidatePath('/patients')

    return { success: true }
  } catch (error: any) {
    console.error('Delete patient error:', error)
    return { error: error.message || 'Failed to delete patient' }
  }
}

// Get list of BCBAs and RBTs for assignment dropdowns
export async function getAssignableStaff() {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  const staff = await prisma.user.findMany({
    where: {
      organizations: {
        some: {
          organizationId: currentOrgId,
          status: 'ACTIVE',
          role: {
            in: ['BCBA', 'RBT', 'BT'],
          },
        },
      },
      status: 'ACTIVE',
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      organizations: {
        where: {
          organizationId: currentOrgId,
        },
        select: {
          role: true,
        },
      },
    },
    orderBy: {
      firstName: 'asc',
    },
  })

  return staff.map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    role: user.organizations[0]?.role || '',
  })).filter(user => user.role)
}
