import { auth } from '@/lib/auth/auth-config'
import { redirect, notFound } from 'next/navigation'
import { hasRole } from '@/lib/auth/permissions'
import { getTemplate } from '@/actions/templates'
import { TemplateEditor } from '@/components/templates/template-editor'

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  if (!hasRole(session, ['BCBA', 'CLINICAL_DIRECTOR', 'ORG_ADMIN'])) {
    redirect('/templates')
  }

  const resolvedParams = await params
  const templateId = parseInt(resolvedParams.id)
  if (isNaN(templateId)) {
    notFound()
  }

  try {
    const template = await getTemplate(templateId)

    // Check if user can edit
    if (
      template.createdById !== parseInt(session.user.id) &&
      !hasRole(session, ['ORG_ADMIN', 'CLINICAL_DIRECTOR'])
    ) {
      redirect('/templates')
    }

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Template</h1>
          <p className="mt-2 text-gray-600">Modify the template details and content</p>
        </div>

        <TemplateEditor mode="edit" initialData={template} templateId={template.id} />
      </div>
    )
  } catch (error: any) {
    notFound()
  }
}
