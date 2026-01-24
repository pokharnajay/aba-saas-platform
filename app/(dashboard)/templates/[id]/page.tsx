import { auth } from '@/lib/auth/auth-config'
import { redirect, notFound } from 'next/navigation'
import { getTemplate, deleteTemplate } from '@/actions/templates'
import { getPatients } from '@/actions/patients'
import { hasRole } from '@/lib/auth/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Edit, Trash2, FileText } from 'lucide-react'
import { UseTemplateDialog } from '@/components/templates/use-template-dialog'

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const resolvedParams = await params
  const templateId = parseInt(resolvedParams.id)
  if (isNaN(templateId)) {
    notFound()
  }

  try {
    const template = await getTemplate(templateId)
    const patients = await getPatients()

    const canEdit =
      template.createdById === parseInt(session.user.id) ||
      hasRole(session, ['ORG_ADMIN', 'CLINICAL_MANAGER'])

    const templateContent = template.templateContent as any

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{template.name}</h1>
              {template.isPublic && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  Public
                </span>
              )}
            </div>
            <p className="mt-2 text-gray-600">{template.description}</p>
            <p className="mt-2 text-sm text-gray-500">
              Created by {template.createdBy.firstName} {template.createdBy.lastName} on{' '}
              {new Date(template.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex gap-2">
            <UseTemplateDialog templateId={template.id} patients={patients} />
            {canEdit && (
              <>
                <Link href={`/templates/${template.id}/edit`}>
                  <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Goals</CardTitle>
            </CardHeader>
            <CardContent>
              {templateContent.goals && templateContent.goals.length > 0 ? (
                <pre className="text-sm bg-gray-50 p-4 rounded overflow-auto">
                  {JSON.stringify(templateContent.goals, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-gray-500">No goals defined</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Behaviors</CardTitle>
            </CardHeader>
            <CardContent>
              {templateContent.behaviors && templateContent.behaviors.length > 0 ? (
                <pre className="text-sm bg-gray-50 p-4 rounded overflow-auto">
                  {JSON.stringify(templateContent.behaviors, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-gray-500">No behaviors defined</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interventions</CardTitle>
            </CardHeader>
            <CardContent>
              {templateContent.interventions && templateContent.interventions.length > 0 ? (
                <pre className="text-sm bg-gray-50 p-4 rounded overflow-auto">
                  {JSON.stringify(templateContent.interventions, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-gray-500">No interventions defined</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Collection Methods</CardTitle>
            </CardHeader>
            <CardContent>
              {templateContent.dataCollectionMethods &&
              templateContent.dataCollectionMethods.length > 0 ? (
                <pre className="text-sm bg-gray-50 p-4 rounded overflow-auto">
                  {JSON.stringify(templateContent.dataCollectionMethods, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-gray-500">No data collection methods defined</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  } catch (error: any) {
    notFound()
  }
}
