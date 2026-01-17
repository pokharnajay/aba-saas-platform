import { prisma } from '@/lib/db/prisma'
import { decrypt } from './encryption'

// OpenRouter API client
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_API_KEY = process.env.OPEN_ROUTER_API_KEY
const AI_MODEL = 'openai/gpt-4o-mini' // Cost-effective and fast

const SYSTEM_PROMPT = `You are an expert Board Certified Behavior Analyst (BCBA) with 15+ years reviewing ABA treatment plans for children with Autism Spectrum Disorder.

Analyze against:
1. BACB Ethics Code compliance
2. Evidence-based ABA practices
3. Goal measurability (observable, specific criteria)
4. FBA alignment
5. Age-appropriateness
6. Data collection validity
7. Safety assessment

RULES:
- DO NOT modify the plan
- ONLY provide suggestions with rationale
- Reference ABA principles
- Flag safety concerns as HIGH severity

OUTPUT JSON FORMAT:
{
  "overall_score": 0.0-1.0,
  "confidence_score": 0.0-1.0,
  "risk_flags": [{
    "flag": "string",
    "severity": "high|medium|low",
    "description": "string",
    "recommendation": "string"
  }],
  "suggestions": [{
    "field": "goals|behaviors|interventions|dataCollectionMethods",
    "index": number | null,
    "sub_field": "string" | null,
    "current_value": "string",
    "suggestion": "string",
    "reason": "string",
    "priority": "high|medium|low",
    "aba_principle": "string",
    "example": "string"
  }],
  "compliance_flags": [{
    "regulation": "string",
    "issue": "string",
    "recommendation": "string",
    "severity": "critical|high|medium|low"
  }],
  "strengths": ["string"],
  "overall_feedback": "string"
}`

interface AIReviewParams {
  treatmentPlanId: number
  reviewType: 'DRAFT_REVIEW' | 'CLINICAL_REVIEW' | 'COMPLIANCE_REVIEW'
  userId: number
}

export async function reviewTreatmentPlan({
  treatmentPlanId,
  reviewType,
  userId
}: AIReviewParams) {
  const startTime = Date.now()

  // Get treatment plan with patient context
  const plan = await prisma.treatmentPlan.findUnique({
    where: { id: treatmentPlanId },
    include: {
      patient: true,
      organization: true
    }
  })

  if (!plan) {
    throw new Error('Treatment plan not found')
  }

  // Check if AI feature enabled
  const features = plan.organization.features as any
  if (!features.aiReviewer) {
    throw new Error('AI reviewer not enabled for organization')
  }

  // Calculate patient age
  const dob = new Date(decrypt(plan.patient.dateOfBirthEncrypted))
  const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

  // Get previous plans count
  const previousPlansCount = await prisma.treatmentPlan.count({
    where: {
      patientId: plan.patientId,
      id: { not: plan.id },
      status: { in: ['APPROVED', 'ACTIVE', 'ARCHIVED'] }
    }
  })

  // Build user prompt
  const userPrompt = `
PATIENT CONTEXT:
- Age: ${age.toFixed(1)} years old
- Diagnosis: ${JSON.stringify(plan.patient.diagnosis, null, 2)}
- Treatment History: ${previousPlansCount > 0 ? `${previousPlansCount} previous plans` : 'First treatment plan'}

TREATMENT PLAN TO REVIEW:
Version: ${plan.version}
Title: ${plan.title}

GOALS (${(plan.goals as any[]).length}):
${JSON.stringify(plan.goals, null, 2)}

BEHAVIORS (${(plan.behaviors as any[]).length}):
${JSON.stringify(plan.behaviors, null, 2)}

INTERVENTIONS (${(plan.interventions as any[]).length}):
${JSON.stringify(plan.interventions, null, 2)}

DATA COLLECTION METHODS (${(plan.dataCollectionMethods as any[]).length}):
${JSON.stringify(plan.dataCollectionMethods, null, 2)}

SESSION DETAILS:
- Frequency: ${plan.sessionFrequency || 'Not specified'}
- Review Cycle: ${plan.reviewCycle || 'Not specified'}

REVIEW TYPE: ${reviewType}

${getReviewTypeInstructions(reviewType)}

Provide comprehensive feedback in the JSON format specified.
`

  try {
    // Call OpenRouter API
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
        'X-Title': 'ABA SAAS Platform'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`)
    }

    const completion = await response.json()
    const endTime = Date.now()
    const duration = endTime - startTime

    // Parse AI response
    const aiResult = JSON.parse(completion.choices[0].message.content)

    // Calculate cost (GPT-4o-mini pricing via OpenRouter)
    const promptTokens = completion.usage?.prompt_tokens || 0
    const completionTokens = completion.usage?.completion_tokens || 0
    // GPT-4o-mini: $0.15/1M input, $0.60/1M output
    const cost = (promptTokens * 0.15 / 1000000) + (completionTokens * 0.60 / 1000000)

    // Save AI review
    const aiReview = await prisma.aIReview.create({
      data: {
        treatmentPlanId: plan.id,
        organizationId: plan.organizationId,
        aiModel: AI_MODEL,
        reviewType,
        overallScore: aiResult.overall_score,
        confidenceScore: aiResult.confidence_score,
        riskFlags: aiResult.risk_flags,
        suggestions: aiResult.suggestions,
        complianceFlags: aiResult.compliance_flags || [],
        strengths: aiResult.strengths || [],
        overallFeedback: aiResult.overall_feedback,
        reviewDurationMs: duration,
        promptTokens,
        completionTokens,
        totalCost: cost,
        reviewedById: userId
      }
    })

    // Update treatment plan
    await prisma.treatmentPlan.update({
      where: { id: plan.id },
      data: {
        aiReviewed: true
      }
    })

    return aiReview
  } catch (error) {
    console.error('AI review failed:', error)
    throw new Error('AI review failed: ' + (error as Error).message)
  }
}

function getReviewTypeInstructions(reviewType: string): string {
  const instructions = {
    DRAFT_REVIEW: `
FOCUS FOR DRAFT REVIEW:
- Basic completeness
- Obvious errors or missing elements
- Formatting clarity
- Be educational and supportive (for RBT/BT)`,

    CLINICAL_REVIEW: `
FOCUS FOR CLINICAL REVIEW:
- Clinical accuracy and evidence-base
- Goal measurability and appropriateness
- Intervention effectiveness and safety
- Data collection validity
- Best practices alignment
- Comprehensive review for BCBA approval`,

    COMPLIANCE_REVIEW: `
FOCUS FOR COMPLIANCE REVIEW:
- BACB Ethics Code compliance
- HIPAA considerations
- Documentation completeness
- Legal/regulatory requirements
- Informed consent elements
- Final check before approval`
  }

  return instructions[reviewType as keyof typeof instructions] || instructions.CLINICAL_REVIEW
}
