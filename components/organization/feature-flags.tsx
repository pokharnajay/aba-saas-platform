'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateFeatureFlags } from '@/actions/organization'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface FeatureFlagsProps {
  organization: {
    features: any
  }
}

export function FeatureFlags({ organization }: FeatureFlagsProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const features = (organization.features as any) || {}
  const [aiReviewerEnabled, setAiReviewerEnabled] = useState(
    features.aiReviewerEnabled || false
  )
  const [trainingModulesEnabled, setTrainingModulesEnabled] = useState(
    features.trainingModulesEnabled || false
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await updateFeatureFlags({
        aiReviewerEnabled,
        trainingModulesEnabled,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Flags</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
              Feature flags updated successfully
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="aiReviewer" className="text-base font-medium">
                  AI Treatment Plan Reviewer
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  Enable AI-powered review and suggestions for treatment plans using GPT-4
                </p>
              </div>
              <div className="ml-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={aiReviewerEnabled}
                  onClick={() => setAiReviewerEnabled(!aiReviewerEnabled)}
                  className={`${
                    aiReviewerEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      aiReviewerEnabled ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="trainingModules" className="text-base font-medium">
                  Training Modules
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  Enable staff training and certification tracking system
                </p>
              </div>
              <div className="ml-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={trainingModulesEnabled}
                  onClick={() => setTrainingModulesEnabled(!trainingModulesEnabled)}
                  className={`${
                    trainingModulesEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      trainingModulesEnabled ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
