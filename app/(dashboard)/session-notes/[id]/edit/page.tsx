import { auth } from '@/lib/auth/auth-config'
import { redirect, notFound } from 'next/navigation'
import { getSessionNote } from '@/actions/session-notes'
import { getPatient } from '@/actions/patients'
import { SessionNoteForm } from '@/components/session-notes/session-note-form'
import { getCurrentRole } from '@/lib/auth/permissions'

export default async function EditSessionNotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const resolvedParams = await params
  const sessionNoteId = parseInt(resolvedParams.id)
  if (isNaN(sessionNoteId)) {
    notFound()
  }

  const userId = parseInt(session.user.id)
  const userRole = getCurrentRole(session)

  try {
    const result = await getSessionNote(sessionNoteId)

    if (result.error) {
      redirect('/patients')
    }

    const sessionNote = result.sessionNote!

    // Only creator or admins can edit
    if (
      sessionNote.createdById !== userId &&
      userRole !== 'CLINICAL_DIRECTOR' &&
      userRole !== 'ORG_ADMIN'
    ) {
      redirect(`/session-notes/${sessionNoteId}`)
    }

    const patient = await getPatient(sessionNote.patientId) as any

    return (
      <div className="max-w-4xl mx-auto py-6">
        <SessionNoteForm
          mode="edit"
          initialData={sessionNote}
          patientId={sessionNote.patientId}
          patientName={`${patient.firstName} ${patient.lastName}`}
          treatmentPlans={patient.treatmentPlans || []}
        />
      </div>
    )
  } catch (error: any) {
    notFound()
  }
}
