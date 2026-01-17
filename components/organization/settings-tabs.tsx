'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GeneralSettings } from './general-settings'
import { FeatureFlags } from './feature-flags'
import { SubscriptionInfo } from './subscription-info'
import { AuditLogsView } from './audit-logs-view'

interface OrganizationSettingsTabsProps {
  organization: {
    id: number
    name: string
    subdomain: string
    subscriptionPlan: string
    maxUsers: number
    maxPatients: number
    features: any
    createdAt: Date
  }
}

export function OrganizationSettingsTabs({ organization }: OrganizationSettingsTabsProps) {
  const [activeTab, setActiveTab] = useState('general')

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'features', label: 'Features' },
    { id: 'subscription', label: 'Subscription' },
    { id: 'audit', label: 'Audit Logs' },
  ]

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'general' && <GeneralSettings organization={organization} />}
        {activeTab === 'features' && <FeatureFlags organization={organization} />}
        {activeTab === 'subscription' && <SubscriptionInfo organization={organization} />}
        {activeTab === 'audit' && <AuditLogsView />}
      </div>
    </div>
  )
}
