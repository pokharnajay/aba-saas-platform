'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  Users,
  FileText,
  BookTemplate,
  BarChart3,
  Settings,
  Home,
  UsersRound,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface NavigationItem {
  name: string
  href: string
  icon: any
  roles?: string[]
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Patients', href: '/patients', icon: Users },
  { name: 'Treatment Plans', href: '/treatment-plans', icon: FileText },
  {
    name: 'Templates',
    href: '/templates',
    icon: BookTemplate,
    roles: ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'],
  },
  {
    name: 'Team',
    href: '/team',
    icon: UsersRound,
    roles: ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['ORG_ADMIN', 'CLINICAL_MANAGER', 'CLINICAL_DIRECTOR'],
  },
  {
    name: 'Organization',
    href: '/organization/settings',
    icon: Settings,
    roles: ['ORG_ADMIN'],
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: UsersRound,
  },
]

interface OrganizationBranding {
  name: string
  logoPath?: string | null
  primaryColor?: string | null
}

interface SidebarProps {
  userRole: string
  organization?: OrganizationBranding | null
}

export function Sidebar({ userRole, organization }: SidebarProps) {
  const pathname = usePathname()

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles) return true
    return item.roles.includes(userRole)
  })

  // Use organization's primary color for active states if available
  const primaryColor = organization?.primaryColor || '#1f2937' // default gray-800

  return (
    <div className="flex flex-col w-64 bg-gray-900 text-white">
      {/* Organization Branding Header */}
      <div className="flex items-center justify-center h-20 bg-gray-800 px-4 border-b border-gray-700">
        {organization?.logoPath ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative rounded-lg overflow-hidden bg-white flex items-center justify-center">
              <Image
                src={organization.logoPath}
                alt={organization.name}
                fill
                className="object-contain p-1"
              />
            </div>
            <span className="text-lg font-semibold truncate max-w-[140px]">
              {organization.name}
            </span>
          </div>
        ) : organization?.name ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-semibold truncate max-w-[140px]">
              {organization.name}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-semibold">ABA Platform</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
              style={isActive && organization?.primaryColor ? {
                backgroundColor: organization.primaryColor,
              } : undefined}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User Role Badge */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Role</span>
          <span className="text-xs font-medium px-2 py-1 rounded bg-gray-700 text-gray-200">
            {userRole === 'ORG_ADMIN' ? 'Admin' :
             userRole === 'CLINICAL_MANAGER' || userRole === 'CLINICAL_DIRECTOR' ? 'Clinical Manager' :
             userRole}
          </span>
        </div>
      </div>
    </div>
  )
}
