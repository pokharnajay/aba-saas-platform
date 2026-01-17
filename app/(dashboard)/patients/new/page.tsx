import { auth } from '@/lib/auth/auth-config'
import { redirect } from 'next/navigation'
import { getAssignableStaff } from '@/actions/patients'
import { PatientForm } from '@/components/patients/patient-form'
import { canCreatePatient } from '@/lib/auth/permissions'

export default async function NewPatientPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // Check permissions
  if (!canCreatePatient(session)) {
    redirect('/patients')
  }

  const assignableStaff = await getAssignableStaff()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Add New Patient</h1>
        <p className="mt-2 text-gray-600">
          Enter patient information. All PHI will be encrypted.
        </p>
        {assignableStaff.length === 0 && (
          <p className="mt-2 text-amber-600 text-sm">
            Note: No BCBA or RBT staff found in your organization. Staff assignment will be optional.
          </p>
        )}
      </div>

      <PatientForm mode="create" assignableStaff={assignableStaff} />
    </div>
  )
}
