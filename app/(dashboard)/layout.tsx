import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/auth-config'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { getOrganizationBranding } from '@/actions/organization'
import { validateSubdomain } from '@/lib/subdomain/validate'
import { SubdomainRedirect } from '@/components/subdomain-redirect'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // ============================================
  // SUBDOMAIN VALIDATION (Database check)
  // ============================================
  const headersList = await headers()
  const subdomain = headersList.get('x-subdomain')

  // If no subdomain (base domain access), redirect to user's organization subdomain
  if (!subdomain) {
    const userOrgs = (session.user as any).organizations || []
    if (userOrgs.length > 0) {
      const primaryOrg = userOrgs[0]
      return <SubdomainRedirect subdomain={primaryOrg.subdomain} />
    }
    // User has no organizations - redirect to error page
    redirect('/subdomain-not-found?reason=no_access')
  }

  // Validate subdomain against the database
  const validation = await validateSubdomain(subdomain)

  if (!validation.valid) {
    // Invalid subdomain - redirect to error page with reason parameter
    redirect('/subdomain-not-found?reason=invalid')
  }

  // Verify the authenticated user belongs to this organization
  const userOrgs = (session.user as any).organizations || []
  const hasAccess = userOrgs.some(
    (org: { subdomain: string }) => org.subdomain.toLowerCase() === subdomain.toLowerCase()
  )

  if (!hasAccess) {
    // User doesn't belong to this organization - redirect to error page with reason parameter
    redirect('/subdomain-not-found?reason=no_access')
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
