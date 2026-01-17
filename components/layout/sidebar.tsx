'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  FileText,
  BookTemplate,
  GraduationCap,
  BarChart3,
  Settings,
  Home,
  UsersRound,
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
    roles: ['BCBA', 'CLINICAL_DIRECTOR', 'ORG_ADMIN'],
  },
  {
    name: 'Team',
    href: '/team',
    icon: UsersRound,
    roles: ['ORG_ADMIN', 'HR_MANAGER', 'CLINICAL_DIRECTOR'],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['ORG_ADMIN', 'CLINICAL_DIRECTOR'],
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

interface SidebarProps {
  userRole: string
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles) return true
    return item.roles.includes(userRole)
  })

  return (
    <div className="flex flex-col w-64 bg-gray-900 text-white">
      <div className="flex items-center justify-center h-16 bg-gray-800">
        <h1 className="text-xl font-bold">ABA Platform</h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
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
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
