'use client'

import { useState } from 'react'
import {
  X,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  ChevronDown,
  Check,
  XIcon,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Suggestion {
  field: string
  index: number | null
  sub_field: string | null
  current_value: string
  suggestion: string
  reason: string
  priority: 'high' | 'medium' | 'low'
  aba_principle?: string
  example?: string
}

interface RiskFlag {
  flag: string
  severity: 'high' | 'medium' | 'low'
  description: string
  recommendation: string
}

interface ComplianceFlag {
  regulation: string
  issue: string
  recommendation: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

interface AIReviewData {
  id?: number
  overallScore: number
  confidenceScore: number
  suggestions: Suggestion[]
  riskFlags: RiskFlag[]
  complianceFlags?: ComplianceFlag[]
  strengths?: string[]
  overallFeedback?: string
  createdAt?: string
}

interface AIReviewSidebarProps {
  review: AIReviewData
  onClose: () => void
  onApplySuggestion?: (suggestion: Suggestion) => void
  onRequestReview?: () => void
  isLoading?: boolean
}

export function AIReviewSidebar({
  review,
  onClose,
  onApplySuggestion,
  onRequestReview,
  isLoading = false,
}: AIReviewSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['suggestions', 'risks'])
  )
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set())

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const handleDismiss = (index: number) => {
    setDismissedSuggestions((prev) => new Set([...prev, index]))
  }

  const activeSuggestions = review.suggestions?.filter(
    (_, index) => !dismissedSuggestions.has(index)
  ) || []

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'critical':
        return 'border-red-200 bg-red-50'
      case 'medium':
        return 'border-amber-200 bg-amber-50'
      case 'low':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-slate-200 bg-slate-50'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case 'low':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4 text-slate-500" />
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900">AI Review</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-slate-600">Analyzing treatment plan...</p>
            <p className="text-xs text-slate-400">This may take a few seconds</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Score Overview */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700">Overall Score</span>
                <span className={cn('text-2xl font-bold', getScoreColor(review.overallScore))}>
                  {Math.round(review.overallScore * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={cn(
                    'h-2 rounded-full transition-all',
                    review.overallScore >= 0.8
                      ? 'bg-green-500'
                      : review.overallScore >= 0.6
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  )}
                  style={{ width: `${review.overallScore * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Confidence: {Math.round(review.confidenceScore * 100)}%
              </p>
            </div>

            {/* Overall Feedback */}
            {review.overallFeedback && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">{review.overallFeedback}</p>
              </div>
            )}

            {/* Strengths */}
            {review.strengths && review.strengths.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('strengths')}
                  className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-slate-900">Strengths</span>
                    <span className="text-xs text-slate-500">({review.strengths.length})</span>
                  </div>
                  {expandedSections.has('strengths') ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                {expandedSections.has('strengths') && (
                  <div className="mt-2 space-y-2 pl-6">
                    {review.strengths.map((strength, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-2 bg-green-50 border border-green-200 rounded"
                      >
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-green-800">{strength}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Suggestions */}
            {activeSuggestions.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('suggestions')}
                  className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-slate-900">Suggestions</span>
                    <span className="text-xs text-slate-500">({activeSuggestions.length})</span>
                  </div>
                  {expandedSections.has('suggestions') ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                {expandedSections.has('suggestions') && (
                  <div className="mt-2 space-y-3">
                    {activeSuggestions.map((suggestion, index) => (
                      <SuggestionCard
                        key={index}
                        suggestion={suggestion}
                        onApply={() => onApplySuggestion?.(suggestion)}
                        onDismiss={() => handleDismiss(review.suggestions.indexOf(suggestion))}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Risk Flags */}
            {review.riskFlags && review.riskFlags.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('risks')}
                  className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="font-medium text-slate-900">Risk Flags</span>
                    <span className="text-xs text-slate-500">({review.riskFlags.length})</span>
                  </div>
                  {expandedSections.has('risks') ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                {expandedSections.has('risks') && (
                  <div className="mt-2 space-y-2">
                    {review.riskFlags.map((risk, index) => (
                      <div
                        key={index}
                        className={cn('p-3 border rounded-lg', getPriorityColor(risk.severity))}
                      >
                        <div className="flex items-start gap-2">
                          {getPriorityIcon(risk.severity)}
                          <div>
                            <p className="font-medium text-sm text-slate-900">{risk.flag}</p>
                            <p className="text-xs text-slate-600 mt-1">{risk.description}</p>
                            <p className="text-xs text-slate-500 mt-2 italic">
                              Recommendation: {risk.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Compliance Flags */}
            {review.complianceFlags && review.complianceFlags.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('compliance')}
                  className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-slate-900">Compliance Issues</span>
                    <span className="text-xs text-slate-500">
                      ({review.complianceFlags.length})
                    </span>
                  </div>
                  {expandedSections.has('compliance') ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                {expandedSections.has('compliance') && (
                  <div className="mt-2 space-y-2">
                    {review.complianceFlags.map((flag, index) => (
                      <div
                        key={index}
                        className={cn('p-3 border rounded-lg', getPriorityColor(flag.severity))}
                      >
                        <div className="flex items-start gap-2">
                          {getPriorityIcon(flag.severity)}
                          <div>
                            <p className="font-medium text-sm text-slate-900">{flag.regulation}</p>
                            <p className="text-xs text-slate-600 mt-1">{flag.issue}</p>
                            <p className="text-xs text-slate-500 mt-2 italic">
                              {flag.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Re-analyze button */}
            {onRequestReview && (
              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={onRequestReview}
                  className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Re-analyze Plan
                </button>
              </div>
            )}

            {/* Review timestamp */}
            {review.createdAt && (
              <p className="text-xs text-slate-400 text-center pt-2">
                Last reviewed: {new Date(review.createdAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Suggestion Card Component
function SuggestionCard({
  suggestion,
  onApply,
  onDismiss,
}: {
  suggestion: Suggestion
  onApply: () => void
  onDismiss: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700'
      case 'medium':
        return 'bg-amber-100 text-amber-700'
      case 'low':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      goals: 'Goal',
      behaviors: 'Behavior',
      interventions: 'Intervention',
      dataCollectionMethods: 'Data Collection',
    }
    return labels[field] || field
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-slate-500">
                {getFieldLabel(suggestion.field)}
                {suggestion.index !== null && ` #${suggestion.index + 1}`}
              </span>
              <span className={cn('text-xs px-1.5 py-0.5 rounded', getPriorityBadge(suggestion.priority))}>
                {suggestion.priority}
              </span>
            </div>
            <p className="text-sm text-slate-900 font-medium">{suggestion.suggestion}</p>
          </div>
        </div>

        {suggestion.reason && (
          <p className="text-xs text-slate-600 mt-2">{suggestion.reason}</p>
        )}

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            {suggestion.current_value && (
              <div>
                <p className="text-xs font-medium text-slate-500">Current:</p>
                <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded mt-1">
                  {suggestion.current_value}
                </p>
              </div>
            )}
            {suggestion.aba_principle && (
              <div>
                <p className="text-xs font-medium text-slate-500">ABA Principle:</p>
                <p className="text-xs text-blue-700 mt-1">{suggestion.aba_principle}</p>
              </div>
            )}
            {suggestion.example && (
              <div>
                <p className="text-xs font-medium text-slate-500">Example:</p>
                <p className="text-xs text-slate-600 bg-green-50 p-2 rounded mt-1 italic">
                  {suggestion.example}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onDismiss}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
              title="Dismiss"
            >
              <XIcon className="h-4 w-4" />
            </button>
            <button
              onClick={onApply}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
