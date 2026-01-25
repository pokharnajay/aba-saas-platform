import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { validateSubdomain } from '@/lib/subdomain/validate'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ============================================
  // SUBDOMAIN VALIDATION (Database check)
  // ============================================
  const headersList = await headers()
  const subdomain = headersList.get('x-subdomain')

  // If we have a subdomain, validate it against the database
  if (subdomain) {
    const validation = await validateSubdomain(subdomain)

    if (!validation.valid) {
      // Invalid subdomain - redirect to error page with reason parameter
      redirect('/subdomain-not-found?reason=invalid')
    }
  }

  return <>{children}</>
}
