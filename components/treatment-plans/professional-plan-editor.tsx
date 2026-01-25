'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createTreatmentPlan, updateTreatmentPlan, requestAIReview } from '@/actions/treatment-plans'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { TiptapEditor } from '@/components/editor/tiptap-editor'
import type { Editor } from '@tiptap/react'

// Feature flag for gradual rollout - set to true to use new Tiptap editor
const USE_TIPTAP_EDITOR = true
import { AIReviewSidebar } from '@/components/editor/ai-review-sidebar'
import {
  Loader2,
  Save,
  Sparkles,
  FileText,
  User,
  Calendar,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PatientOption {
  id: number
  firstName: string
  lastName: string
  patientCode: string
}

interface ProfessionalPlanEditorProps {
  initialData?: any
  mode: 'create' | 'edit'
  patients?: PatientOption[]
  preselectedPatientId?: number
  existingAIReview?: any
}

const SESSION_FREQUENCIES = [
  '1x per week',
  '2x per week',
  '3x per week',
  '4x per week',
  '5x per week',
  'Daily',
  'As needed',
]

const REVIEW_CYCLES = [
  'Monthly',
  'Quarterly',
  'Every 6 months',
  'Annually',
]

export function ProfessionalPlanEditor({
  initialData,
  mode,
  patients = [],
  preselectedPatientId,
  existingAIReview,
}: ProfessionalPlanEditorProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRequestingReview, setIsRequestingReview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiReview, setAIReview] = useState<any>(existingAIReview || null)
  const [showAISidebar, setShowAISidebar] = useState(false)
  const editorRef = useRef<any>(null)

  // Form state
  const [patientId, setPatientId] = useState<string>(
    preselectedPatientId?.toString() || initialData?.patientId?.toString() || ''
  )
  const [title, setTitle] = useState(initialData?.title || '')
  const [sessionFrequency, setSessionFrequency] = useState(initialData?.sessionFrequency || '')
  const [reviewCycle, setReviewCycle] = useState(initialData?.reviewCycle || '')
  const [effectiveDate, setEffectiveDate] = useState(
    initialData?.effectiveDate ? new Date(initialData.effectiveDate).toISOString().split('T')[0] : ''
  )
  const [expiryDate, setExpiryDate] = useState(
    initialData?.expiryDate ? new Date(initialData.expiryDate).toISOString().split('T')[0] : ''
  )
  const [planContent, setPlanContent] = useState(initialData?.additionalNotes || '')

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const data = {
        patientId: parseInt(patientId),
        title,
        goals: [],
        behaviors: [],
        interventions: [],
        dataCollectionMethods: [],
        sessionFrequency,
        reviewCycle,
        additionalNotes: planContent,
        effectiveDate,
        expiryDate,
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

  // Request AI Review
  const handleRequestAIReview = async () => {
    if (!initialData?.id) {
      setError('You need to save plan once to start AI Review')
      return
    }

    setIsRequestingReview(true)
    try {
      const result = await requestAIReview(initialData.id, 'CLINICAL_REVIEW')
      if (result.error) {
        setError(result.error)
      } else if (result.review) {
        setAIReview(result.review)
        setShowAISidebar(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request AI review')
    } finally {
      setIsRequestingReview(false)
    }
  }

  // Apply AI suggestion
  const handleApplySuggestion = (suggestion: any) => {
    if (suggestion.suggestion && editorRef.current) {
      const editor = editorRef.current

      if (USE_TIPTAP_EDITOR) {
        // Tiptap editor - use chain commands
        const suggestionHTML = `<p><br></p><p>${suggestion.suggestion.replace(/\n/g, '</p><p>')}</p>`
        editor.chain()
          .focus('end')
          .insertContent(suggestionHTML)
          .run()
      } else {
        // Quill editor - append HTML
        const currentHTML = planContent
        const suggestionHTML = `<p><br></p><p>${suggestion.suggestion.replace(/\n/g, '</p><p>')}</p>`
        const newContent = currentHTML + suggestionHTML

        // Update the content
        setPlanContent(newContent)

        // Focus editor after a short delay
        setTimeout(() => {
          if (editor.root) {
            editor.root.focus()
            // Scroll to bottom
            editor.root.scrollTop = editor.root.scrollHeight
          }
        }, 100)
      }
    }
  }

  // Store editor reference when ready
  const handleEditorReady = (editor: any) => {
    editorRef.current = editor
  }

  const selectedPatient = patients.find((p) => p.id.toString() === patientId)

  return (
    <div className="flex h-full">
      {/* Main Editor */}
      <div className={cn('flex-1 overflow-auto', showAISidebar && 'mr-96')}>
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  {mode === 'create' ? 'Create Treatment Plan' : 'Edit Treatment Plan'}
                </h1>
                {selectedPatient && (
                  <p className="text-sm text-slate-500 mt-1">
                    <User className="inline h-4 w-4 mr-1" />
                    {selectedPatient.firstName} {selectedPatient.lastName} ({selectedPatient.patientCode})
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {mode === 'create' ? 'Save Plan' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Form Content */}
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Basic Information
                </CardTitle>
                <CardDescription>Core details about the treatment plan</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {mode === 'create' && (
                  <div>
                    <Label htmlFor="patient" className="text-sm font-medium text-slate-700">
                      Patient <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={patientId}
                      onValueChange={setPatientId}
                      disabled={!!preselectedPatientId}
                    >
                      <SelectTrigger className="mt-1.5">
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
                  <Label htmlFor="title" className="text-sm font-medium text-slate-700">
                    Treatment Plan Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Initial ABA Treatment Plan - Communication Focus"
                    className="mt-1.5"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-slate-700">
                      <Clock className="inline h-4 w-4 mr-1" />
                      Session Frequency
                    </Label>
                    <Select value={sessionFrequency} onValueChange={setSessionFrequency}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {SESSION_FREQUENCIES.map((freq) => (
                          <SelectItem key={freq} value={freq}>
                            {freq}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      Review Cycle
                    </Label>
                    <Select value={reviewCycle} onValueChange={setReviewCycle}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select review cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        {REVIEW_CYCLES.map((cycle) => (
                          <SelectItem key={cycle} value={cycle}>
                            {cycle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="effectiveDate" className="text-sm font-medium text-slate-700">
                      Effective Date
                    </Label>
                    <Input
                      id="effectiveDate"
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="expiryDate" className="text-sm font-medium text-slate-700">
                      Expiry Date
                    </Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Treatment Plan Content - Main Editor */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Treatment Plan Content
                </CardTitle>
                <CardDescription>
                  Write the complete treatment plan including goals, interventions, and any other relevant information
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {USE_TIPTAP_EDITOR ? (
                  <TiptapEditor
                    content={planContent}
                    onChange={setPlanContent}
                    placeholder="Write your treatment plan here. Include goals, objectives, interventions, data collection methods, and any other relevant clinical information..."
                    onEditorReady={handleEditorReady}
                    onAIReview={mode === 'edit' && initialData?.id ? handleRequestAIReview : undefined}
                    isAIReviewLoading={isRequestingReview}
                    documentTitle={title || 'Treatment Plan'}
                    showExportButtons={true}
                  />
                ) : (
                  <RichTextEditor
                    content={planContent}
                    onChange={setPlanContent}
                    placeholder="Write your treatment plan here. Include goals, objectives, interventions, data collection methods, and any other relevant clinical information..."
                    onEditorReady={handleEditorReady}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </form>
      </div>

      {/* AI Review Sidebar */}
      {showAISidebar && aiReview && (
        <AIReviewSidebar
          review={aiReview}
          onClose={() => setShowAISidebar(false)}
          onApplySuggestion={handleApplySuggestion}
          onRequestReview={handleRequestAIReview}
          isLoading={isRequestingReview}
        />
      )}

      {/* AI Review Button - Always show, but behavior differs by mode */}
      {!showAISidebar && (
        <button
          onClick={aiReview ? () => setShowAISidebar(true) : handleRequestAIReview}
          disabled={isRequestingReview}
          className="fixed right-4 bottom-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={aiReview ? 'Show AI Review' : mode === 'create' ? 'Save plan first to request AI review' : 'Request AI Review'}
        >
          {isRequestingReview ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Sparkles className="h-6 w-6" />
          )}
        </button>
      )}
    </div>
  )
}
