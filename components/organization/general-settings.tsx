'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updateOrganization } from '@/actions/organization'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

const updateOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  billingEmail: z.string().email('Invalid email address').optional(),
})

type UpdateOrganizationFormData = z.infer<typeof updateOrganizationSchema>

interface GeneralSettingsProps {
  organization: {
    id: number
    name: string
    subdomain: string
  }
}

export function GeneralSettings({ organization }: GeneralSettingsProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateOrganizationFormData>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: organization.name,
      billingEmail: '',
    },
  })

  const onSubmit = async (data: UpdateOrganizationFormData) => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await updateOrganization(data)

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
        <CardTitle>General Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
              Settings updated successfully
            </div>
          )}

          <div>
            <Label htmlFor="name">Organization Name *</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="subdomain">Subdomain (Read-only)</Label>
            <Input id="subdomain" value={organization.subdomain} disabled />
            <p className="text-xs text-gray-500 mt-1">
              Your organization subdomain cannot be changed
            </p>
          </div>

          <div>
            <Label htmlFor="billingEmail">Billing Email</Label>
            <Input id="billingEmail" type="email" {...register('billingEmail')} />
            {errors.billingEmail && (
              <p className="text-sm text-red-600 mt-1">{errors.billingEmail.message}</p>
            )}
          </div>

          <div className="flex justify-end">
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
