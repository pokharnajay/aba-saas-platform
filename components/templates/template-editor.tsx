'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createTemplate, updateTemplate } from '@/actions/templates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  goalsJson: z.string().optional(),
  behaviorsJson: z.string().optional(),
  interventionsJson: z.string().optional(),
  dataCollectionMethodsJson: z.string().optional(),
  isPublic: z.boolean().optional(),
})

type TemplateFormData = z.infer<typeof templateSchema>

interface TemplateEditorProps {
  mode: 'create' | 'edit'
  initialData?: any
  templateId?: number
}

export function TemplateEditor({ mode, initialData, templateId }: TemplateEditorProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const templateContent = initialData?.templateContent || {}

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      goalsJson: templateContent.goals
        ? JSON.stringify(templateContent.goals, null, 2)
        : '',
      behaviorsJson: templateContent.behaviors
        ? JSON.stringify(templateContent.behaviors, null, 2)
        : '',
      interventionsJson: templateContent.interventions
        ? JSON.stringify(templateContent.interventions, null, 2)
        : '',
      dataCollectionMethodsJson: templateContent.dataCollectionMethods
        ? JSON.stringify(templateContent.dataCollectionMethods, null, 2)
        : '',
      isPublic: initialData?.isPublic || false,
    },
  })

  const onSubmit = async (data: TemplateFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Parse JSON fields
      const templateContent: any = {}

      if (data.goalsJson) {
        try {
          templateContent.goals = JSON.parse(data.goalsJson)
        } catch {
          setError('Invalid JSON in Goals field')
          setIsSubmitting(false)
          return
        }
      }

      if (data.behaviorsJson) {
        try {
          templateContent.behaviors = JSON.parse(data.behaviorsJson)
        } catch {
          setError('Invalid JSON in Behaviors field')
          setIsSubmitting(false)
          return
        }
      }

      if (data.interventionsJson) {
        try {
          templateContent.interventions = JSON.parse(data.interventionsJson)
        } catch {
          setError('Invalid JSON in Interventions field')
          setIsSubmitting(false)
          return
        }
      }

      if (data.dataCollectionMethodsJson) {
        try {
          templateContent.dataCollectionMethods = JSON.parse(data.dataCollectionMethodsJson)
        } catch {
          setError('Invalid JSON in Data Collection Methods field')
          setIsSubmitting(false)
          return
        }
      }

      const result =
        mode === 'create'
          ? await createTemplate({
              name: data.name,
              description: data.description,
              templateContent,
              isPublic: data.isPublic,
            })
          : await updateTemplate(templateId!, {
              name: data.name,
              description: data.description,
              templateContent,
              isPublic: data.isPublic,
            })

      if ('error' in result && result.error) {
        setError(result.error)
      } else if ('templateId' in result && result.templateId) {
        router.push(`/templates/${result.templateId}`)
        router.refresh()
      } else if ('success' in result && result.success) {
        router.push(`/templates/${templateId}`)
        router.refresh()
      } else {
        router.push('/templates')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
          <div>
            <Label htmlFor="name">Template Name *</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} rows={3} />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={watch('isPublic')}
              onChange={(e) => setValue('isPublic', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
              Make this template public (available to all organizations)
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="goalsJson">Goals (JSON format)</Label>
            <Textarea
              id="goalsJson"
              {...register('goalsJson')}
              rows={6}
              placeholder='[{"description": "Improve communication", "target": "80% accuracy", "masteryCriteria": "3 consecutive sessions"}]'
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label htmlFor="behaviorsJson">Behaviors (JSON format)</Label>
            <Textarea
              id="behaviorsJson"
              {...register('behaviorsJson')}
              rows={6}
              placeholder='[{"name": "Aggression", "definition": "...", "frequency": "..."}]'
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label htmlFor="interventionsJson">Interventions (JSON format)</Label>
            <Textarea
              id="interventionsJson"
              {...register('interventionsJson')}
              rows={6}
              placeholder='[{"name": "Token Economy", "description": "...", "frequency": "..."}]'
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label htmlFor="dataCollectionMethodsJson">
              Data Collection Methods (JSON format)
            </Label>
            <Textarea
              id="dataCollectionMethodsJson"
              {...register('dataCollectionMethodsJson')}
              rows={6}
              placeholder='[{"method": "Frequency Count", "schedule": "Daily", "tool": "Paper"}]'
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Create Template' : 'Update Template'}
        </Button>
      </div>
    </form>
  )
}
