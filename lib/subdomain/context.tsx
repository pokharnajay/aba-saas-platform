'use client'

import { createContext, useContext, ReactNode } from 'react'

interface Organization {
  id: number
  name: string
  status: string
  logoPath: string | null
  primaryColor: string | null
}

interface SubdomainContextType {
  subdomain: string | null
  organization: Organization | null
}

const SubdomainContext = createContext<SubdomainContextType>({
  subdomain: null,
  organization: null,
})

interface SubdomainProviderProps {
  children: ReactNode
  value: SubdomainContextType
}

export function SubdomainProvider({ children, value }: SubdomainProviderProps) {
  return (
    <SubdomainContext.Provider value={value}>
      {children}
    </SubdomainContext.Provider>
  )
}

/**
 * Hook to access subdomain and organization data
 * Returns null values if not in a subdomain context
 */
export function useSubdomain() {
  const context = useContext(SubdomainContext)
  return context
}

/**
 * Hook to get the current organization
 * Throws if not in a valid subdomain context
 */
export function useOrganization() {
  const { organization } = useContext(SubdomainContext)
  if (!organization) {
    throw new Error('useOrganization must be used within a valid subdomain context')
  }
  return organization
}
