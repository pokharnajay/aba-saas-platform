import { auth } from '@/lib/auth/auth-config'
import { redirect, notFound } from 'next/navigation'
import { getTreatmentPlan } from '@/actions/treatment-plans'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Edit, Sparkles } from 'lucide-react'
import { canEditTreatmentPlan, canApproveTreatmentPlan, canRejectTreatmentPlan, canRequestAIReview } from '@/lib/auth/permissions'
import { decryptPatientPHI } from '@/lib/services/encryption'
import { WorkflowActions } from '@/components/treatment-plans/workflow-actions'

export default async function TreatmentPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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
    const decryptedPatient = decryptPatientPHI(plan.patient as any)
    const canEdit = canEditTreatmentPlan(session, plan)
    const canApprove = canApproveTreatmentPlan(session, plan)
    const canReject = canRejectTreatmentPlan(session, plan)
    const canAIReview = canRequestAIReview(session, plan)

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{plan.title}</h1>
            <p className="mt-2 text-gray-600">
              Patient: {decryptedPatient.firstName} {decryptedPatient.lastName} ({plan.patient.patientCode}) • Version {plan.version}
            </p>
          </div>

          <div className="flex gap-3">
            {canEdit && (
              <Link href={`/treatment-plans/${plan.id}/edit`}>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Status & Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Current Status:</span>
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${
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
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {plan.status.replace(/_/g, ' ')}
              </span>
            </div>

            <WorkflowActions
              planId={plan.id}
              status={plan.status}
              canApprove={canApprove}
              canReject={canReject}
              canSubmit={plan.createdById === parseInt(session.user.id) && plan.status === 'DRAFT'}
              canAIReview={canAIReview}
            />

            {plan.rejectionReason && (
              <div className="bg-red-50 border border-red-200 p-4 rounded">
                <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                <p className="text-sm text-red-600 mt-1">{plan.rejectionReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Plan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Session Frequency:</span> {plan.sessionFrequency || 'Not specified'}
              </div>
              <div>
                <span className="font-medium">Review Cycle:</span> {plan.reviewCycle || 'Not specified'}
              </div>
              <div>
                <span className="font-medium">Effective Date:</span>{' '}
                {plan.effectiveDate ? new Date(plan.effectiveDate).toLocaleDateString() : 'Not set'}
              </div>
              <div>
                <span className="font-medium">Expiry Date:</span>{' '}
                {plan.expiryDate ? new Date(plan.expiryDate).toLocaleDateString() : 'Not set'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Created By:</span> {plan.createdBy.firstName}{' '}
                {plan.createdBy.lastName}
              </div>
              {plan.reviewedBy && (
                <div>
                  <span className="font-medium">Reviewed By:</span> {plan.reviewedBy.firstName}{' '}
                  {plan.reviewedBy.lastName}
                </div>
              )}
              {plan.approvedBy && (
                <div>
                  <span className="font-medium">Approved By:</span> {plan.approvedBy.firstName}{' '}
                  {plan.approvedBy.lastName}
                </div>
              )}
              {plan.approvedAt && (
                <div>
                  <span className="font-medium">Approved At:</span>{' '}
                  {new Date(plan.approvedAt).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {plan.additionalNotes && (
          <Card>
            <CardHeader>
              <CardTitle>Treatment Plan Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: plan.additionalNotes }}
              />
            </CardContent>
          </Card>
        )}

        {plan.aiReviews && plan.aiReviews.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <CardTitle>AI Review</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {plan.aiReviews[0].overallScore && (
                  <div>
                    <span className="font-medium">Overall Score:</span> {plan.aiReviews[0].overallScore}
                    /100
                  </div>
                )}
                {plan.aiReviews[0].overallFeedback && (
                  <div>
                    <span className="font-medium">Feedback:</span>
                    <p className="mt-1 text-gray-700">{plan.aiReviews[0].overallFeedback}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Comments ({plan.comments?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {plan.comments && plan.comments.length > 0 ? (
              <div className="space-y-4">
                {plan.comments.map((comment: any) => (
                  <div key={comment.id} className="border-l-2 border-gray-200 pl-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">
                        {comment.user.firstName} {comment.user.lastName}
                      </span>
                      <span className="text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{comment.commentText}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No comments yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  } catch (error: any) {
    if (error.message.includes('permission')) {
      redirect('/treatment-plans')
    }
    notFound()
  }
}
