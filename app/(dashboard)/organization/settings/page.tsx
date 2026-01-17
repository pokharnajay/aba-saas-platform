import { auth } from '@/lib/auth/auth-config'
import { redirect } from 'next/navigation'
import { hasRole } from '@/lib/auth/permissions'
import { getOrganizationSettings } from '@/actions/organization'
import { OrganizationSettingsTabs } from '@/components/organization/settings-tabs'

export default async function OrganizationSettingsPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // Only ORG_ADMIN can access organization settings
  if (!hasRole(session, ['ORG_ADMIN'])) {
    redirect('/dashboard')
  }

  const organization = await getOrganizationSettings()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your organization's configuration and preferences
        </p>
      </div>

      <OrganizationSettingsTabs organization={organization} />
    </div>
  )
}
