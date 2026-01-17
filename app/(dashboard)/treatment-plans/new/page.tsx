import { auth } from '@/lib/auth/auth-config'
import { redirect } from 'next/navigation'
import { getPatients } from '@/actions/patients'
import { ProfessionalPlanEditor } from '@/components/treatment-plans/professional-plan-editor'
import { canCreateTreatmentPlan } from '@/lib/auth/permissions'
import { decryptPatientPHI } from '@/lib/services/encryption'

export default async function NewTreatmentPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  if (!canCreateTreatmentPlan(session)) {
    redirect('/treatment-plans')
  }

  const rawPatients = await getPatients()
  const patients = rawPatients.map((p: any) => {
    return {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      patientCode: p.patientCode,
    }
  })

  const resolvedSearchParams = await searchParams
  const preselectedPatientId = resolvedSearchParams.patientId ? parseInt(resolvedSearchParams.patientId) : undefined

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ProfessionalPlanEditor
        mode="create"
        patients={patients}
        preselectedPatientId={preselectedPatientId}
      />
    </div>
  )
}
