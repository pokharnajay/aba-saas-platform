import { auth } from '@/lib/auth/auth-config'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserProfileForm } from '@/components/profile/user-profile-form'

export default async function ProfilePage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-2 text-gray-600">Manage your personal information and settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <UserProfileForm user={session.user} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <p className="text-sm text-gray-900">{session.user.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Role</label>
            <p className="text-sm text-gray-900">
              {session.user.currentOrg?.role?.replace(/_/g, ' ') || 'Unknown'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Organization</label>
            <p className="text-sm text-gray-900">{session.user.currentOrg?.name || 'Unknown'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
