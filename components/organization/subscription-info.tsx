'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface SubscriptionInfoProps {
  organization: {
    subscriptionPlan: string
    maxUsers: number
    maxPatients: number
    createdAt: Date
  }
}

export function SubscriptionInfo({ organization }: SubscriptionInfoProps) {
  const subscriptionPlans = {
    STARTER: {
      name: 'Starter',
      color: 'bg-gray-100 text-gray-800',
      features: ['Up to 10 users', 'Up to 50 patients', 'Basic reporting', 'Email support'],
    },
    PROFESSIONAL: {
      name: 'Professional',
      color: 'bg-blue-100 text-blue-800',
      features: [
        'Up to 50 users',
        'Up to 500 patients',
        'Advanced analytics',
        'AI reviewer',
        'Priority support',
      ],
    },
    ENTERPRISE: {
      name: 'Enterprise',
      color: 'bg-purple-100 text-purple-800',
      features: [
        'Unlimited users',
        'Unlimited patients',
        'Custom integrations',
        'Dedicated support',
        'SLA guarantee',
      ],
    },
  }

  const currentPlan =
    subscriptionPlans[organization.subscriptionPlan as keyof typeof subscriptionPlans] ||
    subscriptionPlans.STARTER

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${currentPlan.color}`}>
              {currentPlan.name}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Max Users</label>
              <p className="text-2xl font-bold text-gray-900">{organization.maxUsers}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Max Patients</label>
              <p className="text-2xl font-bold text-gray-900">{organization.maxPatients}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Member Since</label>
            <p className="text-sm text-gray-900">
              {new Date(organization.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {currentPlan.features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <svg
                  className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
