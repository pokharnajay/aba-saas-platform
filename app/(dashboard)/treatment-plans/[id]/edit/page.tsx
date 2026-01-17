import { auth } from '@/lib/auth/auth-config'
import { redirect, notFound } from 'next/navigation'
import { getTreatmentPlan } from '@/actions/treatment-plans'
import { canEditTreatmentPlan } from '@/lib/auth/permissions'
import { ProfessionalPlanEditor } from '@/components/treatment-plans/professional-plan-editor'
import { getPatients } from '@/actions/patients'
import { decryptPatientPHI } from '@/lib/services/encryption'
import { prisma } from '@/lib/db/prisma'

export default async function EditTreatmentPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const resolvedParams = await params
  const planId = parseInt(resolvedParams.id)
  if (isNaN(planId)) {
    notFound()
  }

  try {
    const plan = await getTreatmentPlan(planId)

    if (!canEditTreatmentPlan(session, plan)) {
      redirect('/treatment-plans')
    }

    // Get patients for dropdown
    const rawPatients = await getPatients()
    const patients = rawPatients.map((p: any) => {
      return {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        patientCode: p.patientCode,
      }
    })

    // Get existing AI review if any
    const existingAIReview = await prisma.aIReview.findFirst({
      where: {
        treatmentPlanId: planId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return (
      <div className="h-[calc(100vh-4rem)]">
        <ProfessionalPlanEditor
          mode="edit"
          initialData={plan}
          patients={patients}
          existingAIReview={existingAIReview}
        />
      </div>
    )
  } catch (error: any) {
    notFound()
  }
}
