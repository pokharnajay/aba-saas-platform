'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { patientSchema } from '@/lib/validations/patient'
import { createPatient, updatePatient } from '@/actions/patients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, X } from 'lucide-react'
import { z } from 'zod'

type PatientFormData = z.infer<typeof patientSchema>

interface PatientFormProps {
  initialData?: Partial<PatientFormData> & { id?: number }
  mode: 'create' | 'edit'
  assignableStaff: Array<{
    id: number
    fullName: string
    role: string
  }>
}

export function PatientForm({ initialData, mode, assignableStaff }: PatientFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allergies, setAllergies] = useState<string[]>(initialData?.allergies || [])
  const [newAllergy, setNewAllergy] = useState('')

  const bcbaList = assignableStaff.filter((s) => s.role === 'BCBA')
  const rbtList = assignableStaff.filter((s) => s.role === 'RBT' || s.role === 'BT')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      ...initialData,
      address: initialData?.address || { street: '', city: '', state: '', zipCode: '' },
      parentGuardian: initialData?.parentGuardian || { name: '', relationship: '', phone: '', email: '' },
      emergencyContact: initialData?.emergencyContact || { name: '', relationship: '', phone: '' },
      diagnosis: initialData?.diagnosis || {},
      allergies: initialData?.allergies || [],
      medications: initialData?.medications || [],
    },
  })

  const addAllergy = () => {
    if (newAllergy.trim()) {
      const updated = [...allergies, newAllergy.trim()]
      setAllergies(updated)
      setValue('allergies', updated)
      setNewAllergy('')
    }
  }

  const removeAllergy = (index: number) => {
    const updated = allergies.filter((_, i) => i !== index)
    setAllergies(updated)
    setValue('allergies', updated)
  }

  const onSubmit = async (data: PatientFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Ensure allergies are included
      data.allergies = allergies

      const result =
        mode === 'create'
          ? await createPatient(data)
          : await updatePatient(initialData?.id!, data)

      if (result.error) {
        setError(result.error)
      } else if (result.patientId) {
        router.push(`/patients/${result.patientId}`)
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
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
              {errors.dateOfBirth && (
                <p className="text-sm text-red-600 mt-1">{errors.dateOfBirth.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="ssn">SSN (Optional)</Label>
              <Input id="ssn" placeholder="XXX-XX-XXXX" {...register('ssn')} />
              {errors.ssn && (
                <p className="text-sm text-red-600 mt-1">{errors.ssn.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address.street">Street Address</Label>
            <Input id="address.street" {...register('address.street')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="address.city">City</Label>
              <Input id="address.city" {...register('address.city')} />
            </div>

            <div>
              <Label htmlFor="address.state">State</Label>
              <Input id="address.state" {...register('address.state')} />
            </div>

            <div>
              <Label htmlFor="address.zipCode">ZIP Code</Label>
              <Input id="address.zipCode" {...register('address.zipCode')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" {...register('phone')} />
              {errors.phone && (
                <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parent/Guardian Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="parentGuardian.name">Name</Label>
              <Input id="parentGuardian.name" {...register('parentGuardian.name')} />
            </div>

            <div>
              <Label htmlFor="parentGuardian.relationship">Relationship</Label>
              <Select
                value={watch('parentGuardian.relationship') || ''}
                onValueChange={(value) => setValue('parentGuardian.relationship', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">Mother</SelectItem>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="guardian">Legal Guardian</SelectItem>
                  <SelectItem value="grandparent">Grandparent</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="parentGuardian.phone">Phone</Label>
              <Input id="parentGuardian.phone" type="tel" {...register('parentGuardian.phone')} />
            </div>

            <div>
              <Label htmlFor="parentGuardian.email">Email</Label>
              <Input id="parentGuardian.email" type="email" {...register('parentGuardian.email')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="emergencyContact.name">Name</Label>
              <Input id="emergencyContact.name" {...register('emergencyContact.name')} />
            </div>

            <div>
              <Label htmlFor="emergencyContact.relationship">Relationship</Label>
              <Input id="emergencyContact.relationship" {...register('emergencyContact.relationship')} />
            </div>

            <div>
              <Label htmlFor="emergencyContact.phone">Phone</Label>
              <Input id="emergencyContact.phone" type="tel" {...register('emergencyContact.phone')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clinical Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="diagnosis.primary">Primary Diagnosis</Label>
            <Input
              id="diagnosis.primary"
              placeholder="e.g., Autism Spectrum Disorder"
              {...register('diagnosis.primary')}
            />
          </div>

          <div>
            <Label htmlFor="diagnosis.secondary">Secondary Diagnosis (if any)</Label>
            <Input
              id="diagnosis.secondary"
              {...register('diagnosis.secondary')}
            />
          </div>

          <div>
            <Label htmlFor="diagnosis.notes">Diagnosis Notes</Label>
            <Textarea
              id="diagnosis.notes"
              placeholder="Additional clinical notes..."
              {...register('diagnosis.notes')}
            />
          </div>

          <div>
            <Label>Allergies</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                placeholder="Add allergy"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addAllergy()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addAllergy}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {allergies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {allergies.map((allergy, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                  >
                    {allergy}
                    <button
                      type="button"
                      onClick={() => removeAllergy(index)}
                      className="hover:bg-red-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="medications">Current Medications</Label>
            <Textarea
              id="medications"
              placeholder="List current medications with dosage..."
              onChange={(e) => {
                // Parse as simple text, store as array with single entry for now
                const value = e.target.value
                setValue('medications', value ? [{ notes: value }] : [])
              }}
              defaultValue={
                initialData?.medications?.map((m: any) => m.notes || m.name || JSON.stringify(m)).join('\n') || ''
              }
            />
          </div>

          <div>
            <Label htmlFor="insuranceInfo.provider">Insurance Provider</Label>
            <Input id="insuranceInfo.provider" {...register('insuranceInfo.provider')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="insuranceInfo.policyNumber">Policy Number</Label>
              <Input id="insuranceInfo.policyNumber" {...register('insuranceInfo.policyNumber')} />
            </div>

            <div>
              <Label htmlFor="insuranceInfo.groupNumber">Group Number</Label>
              <Input id="insuranceInfo.groupNumber" {...register('insuranceInfo.groupNumber')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assignedBCBAId">Assigned BCBA</Label>
              <Select
                value={watch('assignedBCBAId')?.toString() || 'none'}
                onValueChange={(value) =>
                  setValue('assignedBCBAId', value === 'none' ? undefined : parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select BCBA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {bcbaList.map((bcba) => (
                    <SelectItem key={bcba.id} value={bcba.id.toString()}>
                      {bcba.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assignedRBTId">Assigned RBT/BT</Label>
              <Select
                value={watch('assignedRBTId')?.toString() || 'none'}
                onValueChange={(value) =>
                  setValue('assignedRBTId', value === 'none' ? undefined : parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select RBT/BT" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {rbtList.map((rbt) => (
                    <SelectItem key={rbt.id} value={rbt.id.toString()}>
                      {rbt.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="enrollmentDate">Enrollment Date</Label>
            <Input id="enrollmentDate" type="date" {...register('enrollmentDate')} />
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
          {mode === 'create' ? 'Create Patient' : 'Update Patient'}
        </Button>
      </div>
    </form>
  )
}
