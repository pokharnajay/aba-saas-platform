'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/auth-config'
import { hasValidSession, hasRole } from '@/lib/auth/permissions'
import { decryptPatientPHI } from '@/lib/services/encryption'
import { z } from 'zod'

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  templateContent: z.object({
    goals: z.array(z.any()).optional(),
    behaviors: z.array(z.any()).optional(),
    interventions: z.array(z.any()).optional(),
    dataCollectionMethods: z.array(z.any()).optional(),
  }),
  isPublic: z.boolean().optional(),
})

export async function createTemplate(data: z.infer<typeof createTemplateSchema>) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  // Only BCBA, CLINICAL_DIRECTOR, and ORG_ADMIN can create templates
  if (!hasRole(session, ['BCBA', 'CLINICAL_DIRECTOR', 'ORG_ADMIN'])) {
    return { error: 'Insufficient permissions to create templates' }
  }

  try {
    const validatedData = createTemplateSchema.parse(data)

    const template = await prisma.template.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        templateContent: validatedData.templateContent,
        organizationId: currentOrgId,
        createdById: parseInt(session.user.id),
        isPublic: validatedData.isPublic || false,
      },
    })

    revalidatePath('/templates')
    return { templateId: template.id }
  } catch (error: any) {
    console.error('Create template error:', error)
    return { error: error.message || 'Failed to create template' }
  }
}

export async function getTemplates() {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    // Get organization templates + public templates
    const templates = await prisma.template.findMany({
      where: {
        OR: [
          { organizationId: currentOrgId },
          { isPublic: true },
        ],
      },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return templates
  } catch (error: any) {
    console.error('Get templates error:', error)
    throw new Error(error.message || 'Failed to fetch templates')
  }
}

export async function getTemplate(id: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!template) {
      throw new Error('Template not found')
    }

    // Check access: must be from same org or be public
    if (template.organizationId !== currentOrgId && !template.isPublic) {
      throw new Error('You do not have permission to view this template')
    }

    return template
  } catch (error: any) {
    console.error('Get template error:', error)
    throw new Error(error.message || 'Failed to fetch template')
  }
}

export async function updateTemplate(id: number, data: z.infer<typeof createTemplateSchema>) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    const template = await prisma.template.findUnique({
      where: { id },
    })

    if (!template) {
      return { error: 'Template not found' }
    }

    // Only creator or admins can update
    if (
      template.createdById !== parseInt(session.user.id) &&
      !hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR'])
    ) {
      return { error: 'You do not have permission to update this template' }
    }

    const validatedData = createTemplateSchema.parse(data)

    await prisma.template.update({
      where: { id },
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        templateContent: validatedData.templateContent,
        isPublic: validatedData.isPublic || false,
      },
    })

    revalidatePath('/templates')
    revalidatePath(`/templates/${id}`)
    return { success: true }
  } catch (error: any) {
    console.error('Update template error:', error)
    return { error: error.message || 'Failed to update template' }
  }
}

export async function deleteTemplate(id: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    const template = await prisma.template.findUnique({
      where: { id },
    })

    if (!template) {
      return { error: 'Template not found' }
    }

    // Only creator or admins can delete
    if (
      template.createdById !== parseInt(session.user.id) &&
      !hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR'])
    ) {
      return { error: 'You do not have permission to delete this template' }
    }

    await prisma.template.delete({
      where: { id },
    })

    revalidatePath('/templates')
    return { success: true }
  } catch (error: any) {
    console.error('Delete template error:', error)
    return { error: error.message || 'Failed to delete template' }
  }
}

export async function applyTemplateToPatient(templateId: number, patientId: number) {
  const session = await auth()
  if (!hasValidSession(session)) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  try {
    const template = await prisma.template.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      return { error: 'Template not found' }
    }

    // Check template access
    if (template.organizationId !== currentOrgId && !template.isPublic) {
      return { error: 'You do not have permission to use this template' }
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    })

    if (!patient || patient.organizationId !== currentOrgId) {
      return { error: 'Patient not found' }
    }

    const decryptedPatient = decryptPatientPHI(patient)
    const templateContent = template.templateContent as any

    // Create new treatment plan from template
    const treatmentPlan = await prisma.treatmentPlan.create({
      data: {
        patientId,
        organizationId: currentOrgId,
        title: `${template.name} - ${decryptedPatient.firstName} ${decryptedPatient.lastName}`,
        sessionFrequency: 'WEEKLY',
        reviewCycle: 'QUARTERLY',
        goals: templateContent.goals || [],
        behaviors: templateContent.behaviors || [],
        interventions: templateContent.interventions || [],
        dataCollectionMethods: templateContent.dataCollectionMethods || [],
        status: 'DRAFT',
        version: 1,
        createdById: parseInt(session.user.id),
      },
    })

    return { treatmentPlanId: treatmentPlan.id }
  } catch (error: any) {
    console.error('Apply template error:', error)
    return { error: error.message || 'Failed to apply template' }
  }
}
