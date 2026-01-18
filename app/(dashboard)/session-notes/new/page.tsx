import { auth } from '@/lib/auth/auth-config'
import { redirect } from 'next/navigation'
import { getPatient } from '@/actions/patients'
import { SessionNoteForm } from '@/components/session-notes/session-note-form'
import { getCurrentRole } from '@/lib/auth/permissions'

export default async function NewSessionNotePage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const userRole = getCurrentRole(session)

  // Only RBT, BT, BCBA, and Clinical Director can create session notes
  if (!['RBT', 'BT', 'BCBA', 'CLINICAL_DIRECTOR'].includes(userRole || '')) {
    redirect('/patients')
  }

  const resolvedSearchParams = await searchParams
  if (!resolvedSearchParams.patientId) {
    redirect('/patients')
  }

  const patientId = parseInt(resolvedSearchParams.patientId)
  if (isNaN(patientId)) {
    redirect('/patients')
  }

  try {
    const patient = await getPatient(patientId) as any

    return (
      <div className="max-w-4xl mx-auto py-6">
        <SessionNoteForm
          mode="create"
          patientId={patient.id}
          patientName={`${patient.firstName} ${patient.lastName}`}
          treatmentPlans={patient.treatmentPlans || []}
        />
      </div>
    )
  } catch (error: any) {
    redirect('/patients')
  }
}
