import { auth } from '@/lib/auth/auth-config'
import { redirect } from 'next/navigation'
import { hasRole } from '@/lib/auth/permissions'
import {
  getPatientStats,
  getTreatmentPlanStats,
  getStaffPerformance,
  getAIReviewStats,
} from '@/actions/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/reports/stat-card'
import {
  Users,
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  Sparkles,
} from 'lucide-react'

export default async function ReportsPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // Only ORG_ADMIN and CLINICAL_DIRECTOR can view reports
  if (!hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR'])) {
    redirect('/dashboard')
  }

  const [patientStats, treatmentPlanStats, staffPerformance, aiReviewStats] =
    await Promise.all([
      getPatientStats(),
      getTreatmentPlanStats(),
      getStaffPerformance(),
      getAIReviewStats(),
    ])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="mt-2 text-gray-600">
          Track performance and compliance metrics across your organization
        </p>
      </div>

      {/* Patient Statistics */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Patient Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {!patientStats.error && (
            <>
              <StatCard
                title="Total Patients"
                value={patientStats.totalPatients || 0}
                icon={<Users className="h-6 w-6 text-blue-600" />}
                color="blue"
              />
              <StatCard
                title="Active Patients"
                value={patientStats.activePatients || 0}
                icon={<CheckCircle className="h-6 w-6 text-green-600" />}
                color="green"
              />
              <StatCard
                title="Inactive Patients"
                value={patientStats.inactivePatients || 0}
                icon={<Clock className="h-6 w-6 text-yellow-600" />}
                color="yellow"
              />
              <StatCard
                title="Discharged"
                value={patientStats.discharged || 0}
                icon={<TrendingUp className="h-6 w-6 text-gray-600" />}
                color="gray"
              />
            </>
          )}
        </div>
      </div>

      {/* Treatment Plan Statistics */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Treatment Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {!treatmentPlanStats.error && (
            <>
              <StatCard
                title="Total Plans"
                value={treatmentPlanStats.totalPlans || 0}
                icon={<FileText className="h-6 w-6 text-blue-600" />}
                color="blue"
              />
              <StatCard
                title="Draft Plans"
                value={treatmentPlanStats.draft || 0}
                icon={<FileText className="h-6 w-6 text-gray-600" />}
                color="gray"
              />
              <StatCard
                title="Approved Plans"
                value={treatmentPlanStats.approved || 0}
                icon={<CheckCircle className="h-6 w-6 text-green-600" />}
                color="green"
              />
              <StatCard
                title="Avg Review Time"
                value={`${treatmentPlanStats.avgReviewDays || 0} days`}
                icon={<Clock className="h-6 w-6 text-yellow-600" />}
                color="yellow"
              />
            </>
          )}
        </div>

        {!treatmentPlanStats.error && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Plans by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Draft</span>
                  <span className="font-semibold">{treatmentPlanStats.draft || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pending BCBA Review</span>
                  <span className="font-semibold">
                    {treatmentPlanStats.pendingBcbaReview || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pending Director Review</span>
                  <span className="font-semibold">
                    {treatmentPlanStats.pendingDirectorReview || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Approved</span>
                  <span className="font-semibold">{treatmentPlanStats.approved || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active</span>
                  <span className="font-semibold">{treatmentPlanStats.active || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Rejected</span>
                  <span className="font-semibold">{treatmentPlanStats.rejected || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Staff Performance */}
      {!staffPerformance.error && staffPerformance.staffStats && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Staff Performance</h2>
          <Card>
            <CardHeader>
              <CardTitle>Treatment Plans Created by Staff</CardTitle>
            </CardHeader>
            <CardContent>
              {staffPerformance.staffStats.length === 0 ? (
                <p className="text-sm text-gray-500">No data available</p>
              ) : (
                <div className="space-y-3">
                  {staffPerformance.staffStats.map((staff: any) => (
                    <div key={staff.userId} className="flex justify-between items-center">
                      <span className="text-sm text-gray-900">{staff.name}</span>
                      <span className="font-semibold">{staff.plansCreated}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Review Statistics */}
      {!aiReviewStats.error && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Review Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              title="AI Reviews Requested"
              value={aiReviewStats.totalAIReviews || 0}
              icon={<Sparkles className="h-6 w-6 text-purple-600" />}
              color="purple"
            />
            <StatCard
              title="Acceptance Rate"
              value={`${aiReviewStats.acceptanceRate || 0}%`}
              icon={<CheckCircle className="h-6 w-6 text-green-600" />}
              color="green"
            />
          </div>
        </div>
      )}
    </div>
  )
}
