'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { applyTemplateToPatient } from '@/actions/templates'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Loader2 } from 'lucide-react'
import { decrypt } from '@/lib/services/encryption'

interface UseTemplateDialogProps {
  templateId: number
  patients: any[]
}

export function UseTemplateDialog({ templateId, patients }: UseTemplateDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApplyTemplate = async () => {
    if (!selectedPatientId) {
      setError('Please select a patient')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await applyTemplateToPatient(templateId, selectedPatientId)

      if (result.error) {
        setError(result.error)
      } else if (result.treatmentPlanId) {
        setOpen(false)
        router.push(`/treatment-plans/${result.treatmentPlanId}`)
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FileText className="w-4 h-4 mr-2" />
          Use Template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply Template to Patient</DialogTitle>
          <DialogDescription>
            Select a patient to create a new treatment plan from this template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="patient">Select Patient *</Label>
            <Select
              value={selectedPatientId?.toString() || 'none'}
              onValueChange={(value) =>
                setSelectedPatientId(value === 'none' ? null : parseInt(value))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select patient</SelectItem>
                {patients.map((patient) => {
                  const firstName = decrypt(patient.firstName)
                  const lastName = decrypt(patient.lastName)
                  return (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {firstName} {lastName}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
                setError(null)
                setSelectedPatientId(null)
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleApplyTemplate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Treatment Plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
