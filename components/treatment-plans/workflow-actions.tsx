'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  submitForReview,
  approveTreatmentPlan,
  rejectTreatmentPlan,
  requestAIReview,
} from '@/actions/treatment-plans'
import { CheckCircle, XCircle, Send, Sparkles, Loader2 } from 'lucide-react'

interface WorkflowActionsProps {
  planId: number
  status: string
  canApprove: boolean
  canReject: boolean
  canSubmit: boolean
  canAIReview: boolean
}

export function WorkflowActions({
  planId,
  status,
  canApprove,
  canReject,
  canSubmit,
  canAIReview,
}: WorkflowActionsProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmitForReview = async () => {
    setIsSubmitting(true)
    setError(null)
    const result = await submitForReview(planId)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
    setIsSubmitting(false)
  }

  const handleApprove = async () => {
    setIsSubmitting(true)
    setError(null)
    const result = await approveTreatmentPlan(planId)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
    setIsSubmitting(false)
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason')
      return
    }
    setIsSubmitting(true)
    setError(null)
    const result = await rejectTreatmentPlan(planId, rejectionReason)
    if (result.error) {
      setError(result.error)
    } else {
      setShowRejectForm(false)
      setRejectionReason('')
      router.refresh()
    }
    setIsSubmitting(false)
  }

  const handleAIReview = async () => {
    setIsSubmitting(true)
    setError(null)
    const result = await requestAIReview(planId)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {canSubmit && (
          <Button onClick={handleSubmitForReview} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit for Review
          </Button>
        )}

        {canApprove && (
          <Button onClick={handleApprove} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Approve
          </Button>
        )}

        {canReject && (
          <Button
            variant="outline"
            onClick={() => setShowRejectForm(!showRejectForm)}
            disabled={isSubmitting}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
        )}

        {canAIReview && (
          <Button variant="outline" onClick={handleAIReview} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Request AI Review
          </Button>
        )}
      </div>

      {showRejectForm && (
        <div className="border border-gray-200 rounded p-4 space-y-3">
          <div>
            <label className="text-sm font-medium">Rejection Reason *</label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide detailed reason for rejection..."
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleReject} disabled={isSubmitting} size="sm">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Rejection
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectForm(false)
                setRejectionReason('')
              }}
              size="sm"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
