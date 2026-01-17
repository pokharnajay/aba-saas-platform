import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    isIndependentClinician: boolean
    organizations: {
      id: number
      name: string
      subdomain: string
      role: string
      features: any
    }[]
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      firstName: string
      lastName: string
      isIndependentClinician: boolean
      organizations: {
        id: number
        name: string
        subdomain: string
        role: string
        features: any
      }[]
      currentOrgId: number | null
      currentOrg: {
        id: number
        name: string
        subdomain: string
        role: string
        features: any
      } | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    firstName: string
    lastName: string
    isIndependentClinician: boolean
    organizations: {
      id: number
      name: string
      subdomain: string
      role: string
      features: any
    }[]
    currentOrgId: number | null
  }
}
