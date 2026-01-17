'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTreatmentPlan, updateTreatmentPlan } from '@/actions/treatment-plans'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface TreatmentPlanFormProps {
  initialData?: any
  mode: 'create' | 'edit'
  patients?: Array<{ id: number; firstName: string; lastName: string; patientCode: string }>
  preselectedPatientId?: number
}

export function TreatmentPlanForm({
  initialData,
  mode,
  patients = [],
  preselectedPatientId,
}: TreatmentPlanFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    patientId: preselectedPatientId || initialData?.patientId || '',
    title: initialData?.title || '',
    goals: initialData?.goals ? JSON.stringify(initialData.goals, null, 2) : '[]',
    behaviors: initialData?.behaviors ? JSON.stringify(initialData.behaviors, null, 2) : '[]',
    interventions: initialData?.interventions ? JSON.stringify(initialData.interventions, null, 2) : '[]',
    dataCollectionMethods: initialData?.dataCollectionMethods
      ? JSON.stringify(initialData.dataCollectionMethods, null, 2)
      : '[]',
    sessionFrequency: initialData?.sessionFrequency || '',
    reviewCycle: initialData?.reviewCycle || '',
    additionalNotes: initialData?.additionalNotes || '',
    effectiveDate: initialData?.effectiveDate
      ? new Date(initialData.effectiveDate).toISOString().split('T')[0]
      : '',
    expiryDate: initialData?.expiryDate
      ? new Date(initialData.expiryDate).toISOString().split('T')[0]
      : '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const data = {
        patientId: parseInt(formData.patientId as string),
        title: formData.title,
        goals: JSON.parse(formData.goals),
        behaviors: JSON.parse(formData.behaviors),
        interventions: JSON.parse(formData.interventions),
        dataCollectionMethods: JSON.parse(formData.dataCollectionMethods),
        sessionFrequency: formData.sessionFrequency,
        reviewCycle: formData.reviewCycle,
        additionalNotes: formData.additionalNotes,
        effectiveDate: formData.effectiveDate,
        expiryDate: formData.expiryDate,
      }

      const result =
        mode === 'create'
          ? await createTreatmentPlan(data)
          : await updateTreatmentPlan(initialData?.id!, data)

      if (result.error) {
        setError(result.error)
      } else if (result.planId) {
        router.push(`/treatment-plans/${result.planId}`)
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
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === 'create' && (
            <div>
              <Label htmlFor="patientId">Patient *</Label>
              <Select
                value={formData.patientId.toString()}
                onValueChange={(value) => setFormData({ ...formData, patientId: value })}
                disabled={!!preselectedPatientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {patient.firstName} {patient.lastName} ({patient.patientCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="title">Treatment Plan Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sessionFrequency">Session Frequency</Label>
              <Input
                id="sessionFrequency"
                placeholder="e.g., 3 times per week"
                value={formData.sessionFrequency}
                onChange={(e) => setFormData({ ...formData, sessionFrequency: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="reviewCycle">Review Cycle</Label>
              <Input
                id="reviewCycle"
                placeholder="e.g., Every 6 months"
                value={formData.reviewCycle}
                onChange={(e) => setFormData({ ...formData, reviewCycle: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="effectiveDate">Effective Date</Label>
              <Input
                id="effectiveDate"
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goals (JSON Format)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.goals}
            onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
            className="font-mono text-sm min-h-[120px]"
            placeholder='[{"goal": "Improve communication", "target": "90% accuracy", "mastery": "3 consecutive sessions"}]'
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Behaviors (JSON Format)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.behaviors}
            onChange={(e) => setFormData({ ...formData, behaviors: e.target.value })}
            className="font-mono text-sm min-h-[120px]"
            placeholder='[{"behavior": "Tantrums", "frequency": "Daily", "intensity": "Moderate"}]'
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interventions (JSON Format)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.interventions}
            onChange={(e) => setFormData({ ...formData, interventions: e.target.value })}
            className="font-mono text-sm min-h-[120px]"
            placeholder='[{"intervention": "Positive reinforcement", "technique": "Token economy", "schedule": "Variable ratio"}]'
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Collection Methods (JSON Format)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.dataCollectionMethods}
            onChange={(e) =>
              setFormData({ ...formData, dataCollectionMethods: e.target.value })
            }
            className="font-mono text-sm min-h-[120px]"
            placeholder='[{"method": "ABC recording", "frequency": "Per session", "tool": "Paper forms"}]'
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.additionalNotes}
            onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
            className="min-h-[100px]"
            placeholder="Any additional notes or observations..."
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Create Treatment Plan' : 'Update Treatment Plan'}
        </Button>
      </div>
    </form>
  )
}
