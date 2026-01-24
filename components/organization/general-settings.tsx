'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updateOrganization } from '@/actions/organization'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, Building2 } from 'lucide-react'
import Image from 'next/image'

const updateOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  billingEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
})

type UpdateOrganizationFormData = z.infer<typeof updateOrganizationSchema>

interface GeneralSettingsProps {
  organization: {
    id: number
    name: string
    subdomain: string
    logoPath?: string | null
    primaryColor?: string | null
  }
}

export function GeneralSettings({ organization }: GeneralSettingsProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(organization.logoPath || null)

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

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo file must be less than 5MB')
      return
    }

    if (!['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      setError('Logo must be a JPG, PNG, SVG, or WebP image')
      return
    }

    setIsUploadingLogo(true)
    setError(null)

    try {
      // Show preview immediately
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload the file
      const formData = new FormData()
      formData.append('logo', file)

      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to upload logo')
        setLogoPreview(organization.logoPath || null)
        return
      }

      // Update preview with actual path
      setLogoPreview(result.logoPath)
      setSuccess(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to upload logo')
      setLogoPreview(organization.logoPath || null)
    } finally {
      setIsUploadingLogo(false)
    }
  }

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
    <div className="space-y-6">
      {/* Logo Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div
              onClick={() => !isUploadingLogo && fileInputRef.current?.click()}
              className={`w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-colors ${
                isUploadingLogo
                  ? 'border-gray-300 bg-gray-50 cursor-wait'
                  : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
              }`}
            >
              {isUploadingLogo ? (
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              ) : logoPreview ? (
                <Image
                  src={logoPreview}
                  alt="Organization logo"
                  width={96}
                  height={96}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-2">
                  <Building2 className="w-8 h-8 text-gray-400 mx-auto" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/svg+xml,image/webp"
                onChange={handleLogoChange}
                className="hidden"
                disabled={isUploadingLogo}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
              >
                {isUploadingLogo ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                JPG, PNG, SVG or WebP. Max 5MB.
              </p>
              <p className="text-xs text-gray-500">
                This logo will appear in the sidebar and on reports.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Information Card */}
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
    </div>
  )
}
