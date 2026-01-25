'use client'

import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface SubdomainRedirectProps {
  subdomain: string
}

export function SubdomainRedirect({ subdomain }: SubdomainRedirectProps) {
  useEffect(() => {
    const currentHost = window.location.host
    const protocol = window.location.protocol
    const pathname = window.location.pathname

    let redirectUrl: string

    if (currentHost.includes('localhost')) {
      // Development: subdomain.localhost:3000
      const port = currentHost.split(':')[1] || '3000'
      redirectUrl = `${protocol}//${subdomain}.localhost:${port}${pathname}`
    } else if (currentHost.includes('ngrok')) {
      // Ngrok: subdomain.randomname.ngrok-free.app
      const parts = currentHost.split('.')
      const ngrokBase = parts.slice(-3).join('.') // randomname.ngrok-free.app
      redirectUrl = `${protocol}//${subdomain}.${ngrokBase}${pathname}`
    } else {
      // Production: subdomain.domain.com
      const parts = currentHost.split('.')
      const baseDomain = parts.slice(-2).join('.') // domain.com
      redirectUrl = `${protocol}//${subdomain}.${baseDomain}${pathname}`
    }

    window.location.href = redirectUrl
  }, [subdomain])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to your organization...</p>
      </div>
    </div>
  )
}
