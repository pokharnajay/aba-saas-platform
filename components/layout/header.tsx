'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationDropdown } from '@/components/layout/notification-dropdown'
import { logoutAction } from '@/actions/auth'
import { useRouter } from 'next/navigation'

interface OrganizationBranding {
  name: string
  logoPath?: string | null
  primaryColor?: string | null
}

interface HeaderProps {
  user: {
    firstName: string
    lastName: string
    email: string
    currentOrg: {
      name: string
      role: string
    } | null
  }
  organization?: OrganizationBranding | null
}

export function Header({ user, organization }: HeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await logoutAction()
    router.push('/login')
    router.refresh()
  }

  // Use organization branding name, fallback to currentOrg name
  const displayName = organization?.name || user.currentOrg?.name || 'Dashboard'

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {displayName}
        </h2>
      </div>

      <div className="flex items-center space-x-4">
        <NotificationDropdown />

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>

          <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
