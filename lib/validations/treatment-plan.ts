import { z } from 'zod'

const goalSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Goal description is required'),
  targetBehavior: z.string().min(1, 'Target behavior is required'),
  baseline: z.string().optional(),
  criteria: z.string().min(1, 'Criteria is required'),
  timeline: z.string().optional(),
  status: z.enum(['active', 'completed', 'discontinued']).default('active'),
})

const behaviorSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Behavior name is required'),
  definition: z.string().min(1, 'Definition is required'),
  function: z.string().optional(),
  antecedents: z.string().optional(),
  consequences: z.string().optional(),
  frequency: z.string().optional(),
})

const interventionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Intervention name is required'),
  description: z.string().min(1, 'Description is required'),
  targetBehavior: z.string().optional(),
  procedures: z.string().optional(),
  materials: z.string().optional(),
  schedule: z.string().optional(),
})

const dataCollectionMethodSchema = z.object({
  id: z.string(),
  method: z.string().min(1, 'Method is required'),
  description: z.string().optional(),
  frequency: z.string().optional(),
  targetBehavior: z.string().optional(),
})

export const treatmentPlanSchema = z.object({
  patientId: z.number(),
  title: z.string().min(1, 'Title is required').max(255),
  goals: z.array(goalSchema).min(1, 'At least one goal is required'),
  behaviors: z.array(behaviorSchema).default([]),
  interventions: z.array(interventionSchema).default([]),
  dataCollectionMethods: z.array(dataCollectionMethodSchema).default([]),
  sessionFrequency: z.string().optional(),
  reviewCycle: z.string().optional(),
  additionalNotes: z.string().optional(),
  effectiveDate: z.date().optional().nullable(),
  expiryDate: z.date().optional().nullable(),
})

export type TreatmentPlanInput = z.infer<typeof treatmentPlanSchema>
export type GoalInput = z.infer<typeof goalSchema>
export type BehaviorInput = z.infer<typeof behaviorSchema>
export type InterventionInput = z.infer<typeof interventionSchema>
export type DataCollectionMethodInput = z.infer<typeof dataCollectionMethodSchema>
