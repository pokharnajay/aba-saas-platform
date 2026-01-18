'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSessionNote, updateSessionNote } from '@/actions/session-notes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, FileText, Calendar, Clock } from 'lucide-react'

interface SessionNoteFormProps {
  mode: 'create' | 'edit'
  initialData?: any
  patientId: number
  patientName: string
  treatmentPlans?: any[]
}

const SESSION_TYPES = [
  { value: 'THERAPY', label: 'Therapy' },
  { value: 'ASSESSMENT', label: 'Assessment' },
  { value: 'PARENT_TRAINING', label: 'Parent Training' },
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'OTHER', label: 'Other' },
]

const SESSION_STATUSES = [
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
]

export function SessionNoteForm({
  mode,
  initialData,
  patientId,
  patientName,
  treatmentPlans = [],
}: SessionNoteFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [sessionType, setSessionType] = useState(initialData?.sessionType || 'THERAPY')
  const [sessionStatus, setSessionStatus] = useState(initialData?.sessionStatus || 'COMPLETED')
  const [sessionDate, setSessionDate] = useState(
    initialData?.sessionDate
      ? new Date(initialData.sessionDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [sessionDuration, setSessionDuration] = useState(initialData?.sessionDuration?.toString() || '')
  const [treatmentPlanId, setTreatmentPlanId] = useState(
    initialData?.treatmentPlanId?.toString() || treatmentPlans.find((p) => p.status === 'ACTIVE')?.id.toString() || ''
  )
  const [sessionNotes, setSessionNotes] = useState(initialData?.sessionNotes || '')
  const [parentFeedback, setParentFeedback] = useState(initialData?.parentFeedback || '')
  const [nextSessionPlan, setNextSessionPlan] = useState(initialData?.nextSessionPlan || '')
  const [staffSignature, setStaffSignature] = useState(initialData?.staffSignature || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const data = {
        patientId,
        treatmentPlanId: treatmentPlanId ? parseInt(treatmentPlanId) : null,
        sessionType,
        sessionStatus,
        sessionDate,
        sessionDuration: sessionDuration ? parseInt(sessionDuration) : null,
        sessionNotes,
        goalProgress: [],
        behaviorsObserved: [],
        interventionsUsed: [],
        dataCollected: [],
        parentFeedback,
        nextSessionPlan,
        staffSignature,
      }

      const result =
        mode === 'create'
          ? await createSessionNote(data)
          : await updateSessionNote(initialData?.id!, data)

      if (result.error) {
        setError(result.error)
      } else if (result.sessionNoteId) {
        router.push(`/patients/${patientId}`)
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'create' ? 'Add Session Note' : 'Edit Session Note'}
          </h1>
          <p className="text-gray-600 mt-1">Patient: {patientName}</p>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {mode === 'create' ? 'Save Session Note' : 'Update Session Note'}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Session Details */}
      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Session Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sessionDate">Session Date *</Label>
              <Input
                id="sessionDate"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="sessionDuration">
                <Clock className="inline h-4 w-4 mr-1" />
                Duration (minutes)
              </Label>
              <Input
                id="sessionDuration"
                type="number"
                value={sessionDuration}
                onChange={(e) => setSessionDuration(e.target.value)}
                placeholder="e.g., 60"
                min="1"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sessionType">Session Type *</Label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sessionStatus">Status *</Label>
              <Select value={sessionStatus} onValueChange={setSessionStatus}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {treatmentPlans.length > 0 && (
            <div>
              <Label htmlFor="treatmentPlan">Treatment Plan</Label>
              <Select value={treatmentPlanId} onValueChange={setTreatmentPlanId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select treatment plan (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {treatmentPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.title} (v{plan.version}) - {plan.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Notes */}
      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Session Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label htmlFor="sessionNotes">Session Notes</Label>
            <Textarea
              id="sessionNotes"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Describe what happened during the session, observations, progress, challenges, etc."
              rows={6}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="parentFeedback">Parent/Guardian Feedback</Label>
            <Textarea
              id="parentFeedback"
              value={parentFeedback}
              onChange={(e) => setParentFeedback(e.target.value)}
              placeholder="Any feedback from parent or guardian"
              rows={3}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="nextSessionPlan">Next Session Plan</Label>
            <Textarea
              id="nextSessionPlan"
              value={nextSessionPlan}
              onChange={(e) => setNextSessionPlan(e.target.value)}
              placeholder="Plan for the next session, goals to focus on, etc."
              rows={3}
              className="mt-1.5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Signature */}
      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle>Sign Off</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div>
            <Label htmlFor="staffSignature">Staff Signature</Label>
            <Input
              id="staffSignature"
              value={staffSignature}
              onChange={(e) => setStaffSignature(e.target.value)}
              placeholder="Type your full name to sign"
              className="mt-1.5"
            />
            <p className="text-xs text-gray-500 mt-1">
              By typing your name, you are electronically signing this session note.
            </p>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
