import { auth } from '@/lib/auth/auth-config'
import { redirect } from 'next/navigation'
import { hasRole } from '@/lib/auth/permissions'
import { getTemplates } from '@/actions/templates'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'

export default async function TemplatesPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // Only BCBA, CLINICAL_DIRECTOR, and ORG_ADMIN can access templates
  if (!hasRole(session, ['BCBA', 'CLINICAL_DIRECTOR', 'ORG_ADMIN'])) {
    redirect('/dashboard')
  }

  const templates = await getTemplates()

  const canCreate = hasRole(session, ['BCBA', 'CLINICAL_DIRECTOR', 'ORG_ADMIN'])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Treatment Plan Templates</h1>
          <p className="mt-2 text-gray-600">Reusable templates for treatment plans</p>
        </div>

        {canCreate && (
          <Link href="/templates/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </Link>
        )}
      </div>

      {templates.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new template.
            </p>
            {canCreate && (
              <div className="mt-6">
                <Link href="/templates/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Link key={template.id} href={`/templates/${template.id}`}>
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="flex items-start justify-between">
                  <FileText className="h-8 w-8 text-blue-600" />
                  {template.isPublic && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Public
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {template.name}
                </h3>
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {template.description || 'No description provided'}
                </p>
                <div className="mt-4 text-xs text-gray-500">
                  Created by {template.createdBy.firstName} {template.createdBy.lastName}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  {new Date(template.createdAt).toLocaleDateString()}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
