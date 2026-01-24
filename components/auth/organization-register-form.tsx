'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerAction } from '@/actions/auth'
import type { RegisterInput } from '@/lib/validations/auth'
import {
  Building2,
  User,
  Lock,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Globe,
  Phone,
  Mail
} from 'lucide-react'
import Image from 'next/image'

type Step = 1 | 2 | 3

interface FormData extends RegisterInput {
  companyWebsite?: string
  companyPhone?: string
}

export function OrganizationRegisterForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>(1)
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    organizationName: '',
    subdomain: '',
    companyWebsite: '',
    companyPhone: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value = e.target.value

    // Auto-format subdomain
    if (field === 'subdomain') {
      value = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    }

    setFormData((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo file must be less than 5MB')
        return
      }

      if (!['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'].includes(file.type)) {
        setError('Logo must be a JPG, PNG, SVG, or WebP image')
        return
      }

      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setError('')
    }
  }

  const validateStep1 = (): boolean => {
    if (!formData.organizationName.trim()) {
      setError('Organization name is required')
      return false
    }
    if (!formData.subdomain.trim()) {
      setError('Subdomain is required')
      return false
    }
    if (formData.subdomain.length < 3) {
      setError('Subdomain must be at least 3 characters')
      return false
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(formData.subdomain) && formData.subdomain.length > 2) {
      setError('Subdomain must start and end with a letter or number')
      return false
    }
    return true
  }

  const validateStep2 = (): boolean => {
    if (!formData.firstName.trim()) {
      setError('First name is required')
      return false
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required')
      return false
    }
    if (!formData.email.trim()) {
      setError('Email is required')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }
    return true
  }

  const validateStep3 = (): boolean => {
    if (!formData.password) {
      setError('Password is required')
      return false
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError('Password must contain at least one uppercase letter')
      return false
    }
    if (!/[a-z]/.test(formData.password)) {
      setError('Password must contain at least one lowercase letter')
      return false
    }
    if (!/[0-9]/.test(formData.password)) {
      setError('Password must contain at least one number')
      return false
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      setError('Password must contain at least one special character')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const nextStep = () => {
    setError('')
    if (step === 1 && validateStep1()) {
      setStep(2)
    } else if (step === 2 && validateStep2()) {
      setStep(3)
    }
  }

  const prevStep = () => {
    setError('')
    if (step > 1) {
      setStep((step - 1) as Step)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateStep3()) return

    setLoading(true)

    try {
      // TODO: Upload logo file if present
      // For now, we'll handle this in a follow-up

      const result = await registerAction({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || '',
        organizationName: formData.organizationName,
        subdomain: formData.subdomain,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'Organization', icon: Building2 },
    { number: 2, title: 'Admin Details', icon: User },
    { number: 3, title: 'Security', icon: Lock },
  ]

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, index) => (
            <div key={s.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    step >= s.number
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {step > s.number ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <s.icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`mt-2 text-sm font-medium ${
                    step >= s.number ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 rounded ${
                    step > s.number ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Organization Details */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Setup Your Organization</h2>
              <p className="text-gray-600 mt-1">
                Create your organization's profile for your ABA therapy practice
              </p>
            </div>

            {/* Logo Upload */}
            <div className="flex flex-col items-center mb-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors overflow-hidden"
              >
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt="Logo preview"
                    width={128}
                    height={128}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                    <span className="text-sm text-gray-500 mt-2 block">Upload Logo</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/svg+xml,image/webp"
                onChange={handleLogoChange}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-2">
                JPG, PNG, SVG or WebP. Max 5MB. (Optional)
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="organizationName" className="text-base font-medium">
                  Organization Name *
                </Label>
                <Input
                  id="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange('organizationName')}
                  placeholder="e.g., ABC Behavioral Health"
                  className="mt-1.5 h-12"
                  required
                />
              </div>

              <div>
                <Label htmlFor="subdomain" className="text-base font-medium">
                  Your URL *
                </Label>
                <div className="flex mt-1.5">
                  <div className="flex items-center px-4 bg-gray-100 border border-r-0 rounded-l-md text-sm text-gray-500">
                    https://
                  </div>
                  <Input
                    id="subdomain"
                    value={formData.subdomain}
                    onChange={handleChange('subdomain')}
                    placeholder="your-clinic"
                    className="rounded-none h-12"
                    required
                  />
                  <div className="flex items-center px-4 bg-gray-100 border border-l-0 rounded-r-md text-sm text-gray-500">
                    .abaplatform.app
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This will be your unique login URL. Use lowercase letters, numbers, and hyphens.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyWebsite" className="text-base font-medium">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Website (Optional)
                  </Label>
                  <Input
                    id="companyWebsite"
                    type="url"
                    value={formData.companyWebsite}
                    onChange={handleChange('companyWebsite')}
                    placeholder="https://www.yourcompany.com"
                    className="mt-1.5 h-12"
                  />
                </div>

                <div>
                  <Label htmlFor="companyPhone" className="text-base font-medium">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Business Phone (Optional)
                  </Label>
                  <Input
                    id="companyPhone"
                    type="tel"
                    value={formData.companyPhone}
                    onChange={handleChange('companyPhone')}
                    placeholder="(555) 123-4567"
                    className="mt-1.5 h-12"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Admin Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Organization Administrator</h2>
              <p className="text-gray-600 mt-1">
                You'll be the primary administrator with full control
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-base font-medium">
                  First Name *
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={handleChange('firstName')}
                  placeholder="John"
                  className="mt-1.5 h-12"
                  required
                />
              </div>

              <div>
                <Label htmlFor="lastName" className="text-base font-medium">
                  Last Name *
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={handleChange('lastName')}
                  placeholder="Smith"
                  className="mt-1.5 h-12"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-base font-medium">
                <Mail className="w-4 h-4 inline mr-1" />
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                placeholder="john@yourcompany.com"
                className="mt-1.5 h-12"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be your login email for the platform
              </p>
            </div>

            <div>
              <Label htmlFor="phone" className="text-base font-medium">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone Number (Optional)
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange('phone')}
                placeholder="(555) 123-4567"
                className="mt-1.5 h-12"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900">As the Organization Admin, you can:</h4>
              <ul className="mt-2 text-sm text-blue-800 space-y-1">
                <li>• Create and manage Clinical Managers, BCBAs, and RBT/BT accounts</li>
                <li>• Add and manage patients/clients</li>
                <li>• Customize your organization's branding and settings</li>
                <li>• Access all reports and analytics</li>
                <li>• Review and approve treatment plans</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 3: Security */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create Your Password</h2>
              <p className="text-gray-600 mt-1">
                Set a strong password to secure your account
              </p>
            </div>

            <div>
              <Label htmlFor="password" className="text-base font-medium">
                Password *
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange('password')}
                  placeholder="Create a strong password"
                  className="h-12 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-base font-medium">
                Confirm Password *
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  placeholder="Confirm your password"
                  className="h-12 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className={`flex items-center ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                  <CheckCircle2 className={`w-4 h-4 mr-2 ${formData.password.length >= 8 ? 'opacity-100' : 'opacity-30'}`} />
                  At least 8 characters
                </div>
                <div className={`flex items-center ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                  <CheckCircle2 className={`w-4 h-4 mr-2 ${/[A-Z]/.test(formData.password) ? 'opacity-100' : 'opacity-30'}`} />
                  One uppercase letter
                </div>
                <div className={`flex items-center ${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                  <CheckCircle2 className={`w-4 h-4 mr-2 ${/[a-z]/.test(formData.password) ? 'opacity-100' : 'opacity-30'}`} />
                  One lowercase letter
                </div>
                <div className={`flex items-center ${/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                  <CheckCircle2 className={`w-4 h-4 mr-2 ${/[0-9]/.test(formData.password) ? 'opacity-100' : 'opacity-30'}`} />
                  One number
                </div>
                <div className={`flex items-center ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                  <CheckCircle2 className={`w-4 h-4 mr-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'opacity-100' : 'opacity-30'}`} />
                  One special character
                </div>
                <div className={`flex items-center ${formData.password === formData.confirmPassword && formData.confirmPassword ? 'text-green-600' : 'text-gray-500'}`}>
                  <CheckCircle2 className={`w-4 h-4 mr-2 ${formData.password === formData.confirmPassword && formData.confirmPassword ? 'opacity-100' : 'opacity-30'}`} />
                  Passwords match
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <p className="text-sm font-semibold text-gray-700 mb-3">Registration Summary:</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Organization:</span>
                  <span className="font-medium">{formData.organizationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">URL:</span>
                  <span className="font-medium">{formData.subdomain}.abaplatform.app</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Admin:</span>
                  <span className="font-medium">{formData.firstName} {formData.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{formData.email}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={loading}
              className="h-12 px-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              type="button"
              onClick={nextStep}
              className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={loading}
              className="h-12 px-8 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Organization...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Create Organization
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
