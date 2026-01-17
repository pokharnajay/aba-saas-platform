import { auth } from '@/lib/auth/auth-config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, CheckCircle, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()

  const stats = [
    {
      title: 'Total Patients',
      value: '0',
      icon: Users,
      description: 'Active patients',
    },
    {
      title: 'Treatment Plans',
      value: '0',
      icon: FileText,
      description: 'Active plans',
    },
    {
      title: 'Approved Plans',
      value: '0',
      icon: CheckCircle,
      description: 'This month',
    },
    {
      title: 'Pending Review',
      value: '0',
      icon: Clock,
      description: 'Awaiting approval',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {session?.user.firstName}!
        </h1>
        <p className="mt-2 text-gray-600">
          Here&apos;s what&apos;s happening with your organization today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon

          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Welcome to your ABA Platform!</h3>
            <p className="text-sm text-gray-600">
              This is your HIPAA-compliant platform for managing ABA therapy programs.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Quick Actions:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Add your first patient</li>
              <li>Create a treatment plan</li>
              <li>Invite team members</li>
              <li>Set up organization preferences</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
