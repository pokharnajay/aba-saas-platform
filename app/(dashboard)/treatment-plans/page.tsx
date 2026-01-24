import { auth } from '@/lib/auth/auth-config'
import { redirect } from 'next/navigation'
import { getTreatmentPlans } from '@/actions/treatment-plans'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { decryptPatientPHI } from '@/lib/services/encryption'
import { canCreateTreatmentPlan } from '@/lib/auth/permissions'
import { PLAN_STATUS_LABELS } from '@/lib/utils/constants'

export default async function TreatmentPlansPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const plans = await getTreatmentPlans()
  const canCreate = canCreateTreatmentPlan(session)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Treatment Plans</h1>
          <p className="mt-2 text-gray-600">
            {canCreate
              ? 'Manage treatment plans for your patients'
              : 'View treatment plans for your assigned patients'}
          </p>
        </div>

        {canCreate && (
          <Link href="/treatment-plans/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Treatment Plan
            </Button>
          </Link>
        )}
      </div>

      {plans.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No treatment plans yet</h3>
            <p className="mt-1 text-gray-500">
              {canCreate
                ? 'Get started by creating a new treatment plan'
                : 'Treatment plans will appear here once created by your supervisor'}
            </p>
            {canCreate && (
              <div className="mt-6">
                <Link href="/treatment-plans/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Treatment Plan
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const decryptedPatient = decryptPatientPHI(plan.patient as any)
            return (
              <Link key={plan.id} href={`/treatment-plans/${plan.id}`}>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">{plan.title}</h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
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
                              : plan.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {PLAN_STATUS_LABELS[plan.status] || plan.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        Patient: {decryptedPatient.firstName} {decryptedPatient.lastName} (
                        {plan.patient.patientCode})
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Version {plan.version} • Created by {plan.createdBy.firstName}{' '}
                        {plan.createdBy.lastName} •{' '}
                        {new Date(plan.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
