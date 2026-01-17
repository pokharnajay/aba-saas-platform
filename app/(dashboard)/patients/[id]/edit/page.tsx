import { auth } from '@/lib/auth/auth-config'
import { redirect, notFound } from 'next/navigation'
import { getPatient, getAssignableStaff } from '@/actions/patients'
import { PatientForm } from '@/components/patients/patient-form'
import { canEditPatient } from '@/lib/auth/permissions'

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const resolvedParams = await params
  const patientId = parseInt(resolvedParams.id)
  if (isNaN(patientId)) {
    notFound()
  }

  try {
    const patient = await getPatient(patientId) as any

    // Check permissions
    if (!canEditPatient(session, patient)) {
      redirect(`/patients/${patientId}`)
    }

    const assignableStaff = await getAssignableStaff()

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Patient</h1>
          <p className="mt-2 text-gray-600">
            {patient.firstName} {patient.lastName} ({patient.patientCode})
          </p>
        </div>

        <PatientForm
          mode="edit"
          initialData={{
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: patient.dateOfBirth,
            ssn: patient.ssn || undefined,
            address: typeof patient.address === 'object' && patient.address
              ? patient.address
              : { street: '', city: '', state: '', zipCode: '' },
            phone: patient.phone || undefined,
            email: patient.email || undefined,
            parentGuardian: typeof patient.parentGuardian === 'object' && patient.parentGuardian
              ? patient.parentGuardian
              : { name: '', relationship: '', phone: '', email: '' },
            emergencyContact: typeof patient.emergencyContact === 'object' && patient.emergencyContact
              ? patient.emergencyContact
              : { name: '', relationship: '', phone: '' },
            diagnosis: typeof patient.diagnosis === 'object' && patient.diagnosis
              ? patient.diagnosis
              : {},
            allergies: Array.isArray(patient.allergies) ? patient.allergies : [],
            medications: Array.isArray(patient.medications) ? patient.medications : [],
            insuranceInfo: typeof patient.insuranceInfo === 'object' && patient.insuranceInfo
              ? patient.insuranceInfo
              : { provider: '', policyNumber: '', groupNumber: '' },
            assignedBCBAId: patient.assignedBCBAId || undefined,
            assignedRBTId: patient.assignedRBTId || undefined,
            enrollmentDate: patient.enrollmentDate || undefined,
          }}
          assignableStaff={assignableStaff}
        />
      </div>
    )
  } catch (error: any) {
    if (error.message.includes('permission')) {
      redirect('/patients')
    }
    notFound()
  }
}
