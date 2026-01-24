'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createStaffMember } from '@/actions/users'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Loader2, Copy, CheckCircle, AlertCircle } from 'lucide-react'

// Schema for staff creation - NO password field (auto-generated)
const createStaffSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  role: z.enum(['CLINICAL_MANAGER', 'BCBA', 'RBT', 'BT']),
})

type CreateStaffFormData = z.infer<typeof createStaffSchema>

// Role display labels
const ROLE_LABELS: Record<string, string> = {
  CLINICAL_MANAGER: 'Clinical Manager',
  BCBA: 'BCBA',
  RBT: 'RBT',
  BT: 'BT (Behavior Technician)',
}

interface CreateStaffDialogProps {
  // Current user's role determines which roles they can create
  currentUserRole: string
}

export function CreateStaffDialog({ currentUserRole }: CreateStaffDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Success state - shows generated password
  const [success, setSuccess] = useState<{
    userName: string
    generatedPassword: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CreateStaffFormData>({
    resolver: zodResolver(createStaffSchema),
  })

  // Determine which roles the current user can create
  const getAllowedRoles = (): string[] => {
    // Normalize role (handle CLINICAL_DIRECTOR as CLINICAL_MANAGER)
    const normalizedRole = currentUserRole === 'CLINICAL_DIRECTOR' ? 'CLINICAL_MANAGER' : currentUserRole

    if (normalizedRole === 'ORG_ADMIN') {
      // ORG_ADMIN can create all staff roles
      return ['CLINICAL_MANAGER', 'BCBA', 'RBT', 'BT']
    }

    if (normalizedRole === 'CLINICAL_MANAGER') {
      // CLINICAL_MANAGER can only create BCBA and RBT/BT (not other Clinical Managers)
      return ['BCBA', 'RBT', 'BT']
    }

    // Other roles cannot create staff
    return []
  }

  const allowedRoles = getAllowedRoles()

  const onSubmit = async (data: CreateStaffFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createStaffMember(data)

      if (result.error) {
        setError(result.error)
      } else if (result.success && result.generatedPassword) {
        // Show success with generated password
        setSuccess({
          userName: `${data.firstName} ${data.lastName}`,
          generatedPassword: result.generatedPassword,
        })
        reset()
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyPassword = async () => {
    if (success?.generatedPassword) {
      await navigator.clipboard.writeText(success.generatedPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setSuccess(null)
    setError(null)
    setCopied(false)
    reset()
  }

  // Don't render if user can't create staff
  if (allowedRoles.length === 0) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose()
      else setOpen(true)
    }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Create Staff Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {success ? (
          // Success view - show generated password
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                Account Created Successfully
              </DialogTitle>
              <DialogDescription>
                Staff account has been created for {success.userName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Important: Save this password now
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      This temporary password will only be shown once. Please share it securely with the staff member.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border rounded-lg p-4">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">
                  Temporary Password
                </Label>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 bg-white border rounded px-3 py-2 font-mono text-lg select-all">
                    {success.generatedPassword}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyPassword}
                    title="Copy password"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
                )}
              </div>

              <p className="text-sm text-gray-600">
                The staff member should log in with their email and this temporary password.
                Only administrators can reset passwords if needed.
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </>
        ) : (
          // Form view
          <>
            <DialogHeader>
              <DialogTitle>Create Staff Account</DialogTitle>
              <DialogDescription>
                Add a new team member to your organization. A secure password will be automatically generated.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" {...register('firstName')} />
                  {errors.firstName && (
                    <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" {...register('lastName')} />
                  {errors.lastName && (
                    <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input id="phone" type="tel" {...register('phone')} placeholder="(555) 123-4567" />
              </div>

              <div>
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={watch('role') || ''}
                  onValueChange={(value) => setValue('role', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role] || role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-600 mt-1">{errors.role.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {currentUserRole === 'CLINICAL_MANAGER' || currentUserRole === 'CLINICAL_DIRECTOR'
                    ? 'As a Clinical Manager, you can create BCBA and RBT/BT accounts.'
                    : 'As an Organization Admin, you can create all staff roles.'}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  A secure password will be automatically generated. You'll see it after creating the account.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
