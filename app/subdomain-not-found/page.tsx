import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/auth/auth-config'

interface PageProps {
  searchParams: Promise<{ reason?: string }>
}

export default async function SubdomainNotFoundPage({ searchParams }: PageProps) {
  const params = await searchParams
  const validReasons = ['invalid', 'no_access']

  // If no valid reason parameter, redirect based on auth status
  if (!params.reason || !validReasons.includes(params.reason)) {
    const session = await auth()
    if (session) {
      redirect('/dashboard')
    } else {
      redirect('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Organization Not Found
        </h1>

        <p className="text-gray-600 mb-6">
          The organization URL you're trying to access doesn't exist or has been deactivated.
          Please check the URL and try again.
        </p>

        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact support.
          </p>

          <div className="pt-4">
            <Link href="https://abaplatform.app">
              <Button variant="outline">
                Go to Main Site
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Looking to register your organization?{' '}
            <Link href="/register" className="text-blue-600 hover:underline">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
