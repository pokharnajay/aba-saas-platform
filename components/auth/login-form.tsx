'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginAction } from '@/actions/auth'
import { AlertCircle } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Check for URL-based errors (e.g., no_access, timeout)
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const subdomain = searchParams.get('subdomain')
    const timeout = searchParams.get('timeout')

    if (errorParam === 'no_access') {
      setUrlError(`You don't have access to this organization${subdomain ? ` (${subdomain})` : ''}. Please use your organization's correct URL to log in.`)
    } else if (timeout === 'true') {
      setUrlError('Your session has expired due to inactivity. Please log in again.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await loginAction(email, password)

      if (result?.error) {
        setError(result.error)
      } else {
        // Redirect to the user's organization subdomain
        if (result?.subdomain) {
          const currentHost = window.location.host
          const protocol = window.location.protocol

          // Build the subdomain URL
          let redirectUrl: string
          if (currentHost.includes('localhost')) {
            // Development: subdomain.localhost:3000
            const port = currentHost.split(':')[1] || '3000'
            redirectUrl = `${protocol}//${result.subdomain}.localhost:${port}/dashboard`
          } else if (currentHost.includes('ngrok')) {
            // Ngrok: subdomain.randomname.ngrok-free.app
            const parts = currentHost.split('.')
            const ngrokBase = parts.slice(-3).join('.') // randomname.ngrok-free.app
            redirectUrl = `${protocol}//${result.subdomain}.${ngrokBase}/dashboard`
          } else {
            // Production: subdomain.domain.com
            const parts = currentHost.split('.')
            const baseDomain = parts.slice(-2).join('.') // domain.com
            redirectUrl = `${protocol}//${result.subdomain}.${baseDomain}/dashboard`
          }

          window.location.href = redirectUrl
        } else {
          // Fallback if no subdomain (shouldn't happen normally)
          router.push('/dashboard')
          router.refresh()
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      {/* URL-based error messages */}
      {urlError && (
        <div className="flex items-start gap-2 p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{urlError}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs text-blue-600 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  )
}
