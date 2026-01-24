import { auth } from '@/lib/auth/auth-config'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { getPatient } from '@/actions/patients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Edit, FileText } from 'lucide-react'
import { canEditPatient, canCreateTreatmentPlan, getCurrentRole } from '@/lib/auth/permissions'
import { SessionNotesList } from '@/components/session-notes/session-notes-list'
import { PLAN_STATUS_LABELS } from '@/lib/utils/constants'

export default async function PatientDetailPage({
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
    const canEdit = canEditPatient(session, patient)
    const canCreatePlan = canCreateTreatmentPlan(session)
    const userRole = getCurrentRole(session)
    const canCreateSessionNote = ['RBT', 'BT', 'BCBA', 'CLINICAL_MANAGER', 'ORG_ADMIN'].includes(userRole || '')

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="mt-2 text-gray-600">Patient Code: {patient.patientCode}</p>
          </div>

          <div className="flex gap-3">
            {canEdit && (
              <Link href={`/patients/${patient.id}/edit`}>
                <Button>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Patient
                </Button>
              </Link>
            )}
            {canCreatePlan && (
              <Link href={`/treatment-plans/new?patientId=${patient.id}`}>
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  New Treatment Plan
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  patient.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : patient.status === 'INACTIVE'
                    ? 'bg-gray-100 text-gray-800'
                    : patient.status === 'DISCHARGED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {patient.status}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assigned BCBA</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.assignedBCBA ? (
                <p className="text-sm">
                  {patient.assignedBCBA.firstName} {patient.assignedBCBA.lastName}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Not assigned</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assigned RBT/BT</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.assignedRBT ? (
                <p className="text-sm">
                  {patient.assignedRBT.firstName} {patient.assignedRBT.lastName}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Not assigned</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                <p className="text-sm">
                  {patient.dateOfBirth
                    ? new Date(patient.dateOfBirth).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Enrollment Date</p>
                <p className="text-sm">
                  {patient.enrollmentDate
                    ? new Date(patient.enrollmentDate).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patient.address && typeof patient.address === 'object' && (
              <div>
                <p className="text-sm font-medium text-gray-500">Address</p>
                <p className="text-sm">
                  {[
                    patient.address.street,
                    patient.address.city,
                    patient.address.state,
                    patient.address.zipCode,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'N/A'}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patient.phone && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="text-sm">{patient.phone}</p>
                </div>
              )}
              {patient.email && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-sm">{patient.email}</p>
                </div>
              )}
            </div>
            {patient.parentGuardian && typeof patient.parentGuardian === 'object' && (
              <div>
                <p className="text-sm font-medium text-gray-500">Parent/Guardian</p>
                <p className="text-sm">
                  {patient.parentGuardian.name}
                  {patient.parentGuardian.relationship && ` (${patient.parentGuardian.relationship})`}
                </p>
                {patient.parentGuardian.phone && (
                  <p className="text-sm text-gray-600">Phone: {patient.parentGuardian.phone}</p>
                )}
                {patient.parentGuardian.email && (
                  <p className="text-sm text-gray-600">Email: {patient.parentGuardian.email}</p>
                )}
              </div>
            )}
            {patient.emergencyContact && typeof patient.emergencyContact === 'object' && (
              <div>
                <p className="text-sm font-medium text-gray-500">Emergency Contact</p>
                <p className="text-sm">
                  {patient.emergencyContact.name}
                  {patient.emergencyContact.relationship && ` (${patient.emergencyContact.relationship})`}
                </p>
                {patient.emergencyContact.phone && (
                  <p className="text-sm text-gray-600">Phone: {patient.emergencyContact.phone}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clinical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patient.diagnosis && typeof patient.diagnosis === 'object' && Object.keys(patient.diagnosis).length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500">Diagnosis</p>
                {patient.diagnosis.primary && (
                  <p className="text-sm"><span className="font-medium">Primary:</span> {patient.diagnosis.primary}</p>
                )}
                {patient.diagnosis.secondary && (
                  <p className="text-sm"><span className="font-medium">Secondary:</span> {patient.diagnosis.secondary}</p>
                )}
                {patient.diagnosis.notes && (
                  <p className="text-sm text-gray-600 mt-1">{patient.diagnosis.notes}</p>
                )}
              </div>
            )}
            {patient.allergies && patient.allergies.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500">Allergies</p>
                <p className="text-sm">{patient.allergies.join(', ')}</p>
              </div>
            )}
            {patient.medications && Array.isArray(patient.medications) && patient.medications.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500">Medications</p>
                <p className="text-sm whitespace-pre-wrap">
                  {patient.medications.map((med: any) =>
                    typeof med === 'string' ? med : (med.notes || med.name || JSON.stringify(med))
                  ).join('\n')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Treatment Plan */}
        {(() => {
          const activePlan = patient.treatmentPlans?.find((p: any) => p.status === 'ACTIVE')
          return activePlan ? (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                  Current Treatment Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/treatment-plans/${activePlan.id}`}
                  className="block p-4 bg-white border border-green-300 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-lg text-gray-900">{activePlan.title}</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Created by:</span>{' '}
                          {activePlan.createdBy
                            ? `${activePlan.createdBy.firstName} ${activePlan.createdBy.lastName}`
                            : 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Version:</span> {activePlan.version} •{' '}
                          <span className="font-medium">Started:</span>{' '}
                          {new Date(activePlan.createdAt).toLocaleDateString()}
                        </p>
                        {activePlan.sessionFrequency && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Frequency:</span> {activePlan.sessionFrequency}
                          </p>
                        )}
                        {activePlan.reviewCycle && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Review Cycle:</span> {activePlan.reviewCycle}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-600 text-white">
                        ACTIVE
                      </span>
                      {activePlan.aiReviewed && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          AI Reviewed
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ) : null
        })()}

        {/* Treatment Plan History */}
        <Card>
          <CardHeader>
            <CardTitle>Treatment Plan History</CardTitle>
          </CardHeader>
          <CardContent>
            {patient.treatmentPlans && patient.treatmentPlans.length > 0 ? (
              <div className="space-y-2">
                {patient.treatmentPlans.map((plan: any) => (
                  <Link
                    key={plan.id}
                    href={`/treatment-plans/${plan.id}`}
                    className={`block p-3 border rounded-md hover:bg-gray-50 transition-colors ${
                      plan.status === 'ACTIVE'
                        ? 'border-green-300 bg-green-50/50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{plan.title}</p>
                        <p className="text-sm text-gray-500">
                          Version {plan.version} •{' '}
                          {new Date(plan.createdAt).toLocaleDateString()}
                          {plan.createdBy && (
                            <> • by {plan.createdBy.firstName} {plan.createdBy.lastName}</>
                          )}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ml-3 ${
                          plan.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : plan.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-800'
                            : plan.status === 'DRAFT'
                            ? 'bg-gray-100 text-gray-800'
                            : plan.status === 'PENDING_BCBA_REVIEW'
                            ? 'bg-yellow-100 text-yellow-800'
                            : plan.status === 'PENDING_CLINICAL_DIRECTOR'
                            ? 'bg-orange-100 text-orange-800'
                            : plan.status === 'INACTIVE'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {PLAN_STATUS_LABELS[plan.status] || plan.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No treatment plans yet</p>
                {canCreatePlan && (
                  <Link href={`/treatment-plans/new?patientId=${patient.id}`}>
                    <Button>Create First Treatment Plan</Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Notes Section */}
        <SessionNotesList patientId={patient.id} canCreate={canCreateSessionNote} />
      </div>
    )
  } catch (error: any) {
    if (error.message.includes('permission')) {
      redirect('/patients')
    }
    notFound()
  }
}
