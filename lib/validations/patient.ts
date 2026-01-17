import { z } from 'zod'

export const patientSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  ssn: z.string().optional().nullable(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional().nullable(),
  parentGuardian: z.object({
    name: z.string().optional(),
    relationship: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
  }).optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  emergencyContact: z.object({
    name: z.string().optional(),
    relationship: z.string().optional(),
    phone: z.string().optional(),
  }).optional().nullable(),
  insuranceInfo: z.object({
    provider: z.string().optional(),
    policyNumber: z.string().optional(),
    groupNumber: z.string().optional(),
  }).optional().nullable(),
  diagnosis: z.record(z.string(), z.any()).default({}),
  allergies: z.array(z.string()).default([]),
  medications: z.array(z.any()).default([]),
  assignedBCBAId: z.number().optional().nullable(),
  assignedRBTId: z.number().optional().nullable(),
  enrollmentDate: z.string().optional().nullable(),
})

export type PatientInput = z.infer<typeof patientSchema>
