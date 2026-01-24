import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth-config'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { getOrganizationBranding } from '@/actions/organization'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // Fetch organization branding for white-label support
  const organization = await getOrganizationBranding()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userRole={session.user.currentOrg?.role || 'RBT'}
        organization={organization}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={session.user} organization={organization} />

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
