import { auth } from '@/lib/auth/auth-config'
import { redirect } from 'next/navigation'
import { hasRole } from '@/lib/auth/permissions'
import { TemplateEditor } from '@/components/templates/template-editor'

export default async function NewTemplatePage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  if (!hasRole(session, ['BCBA', 'CLINICAL_DIRECTOR', 'ORG_ADMIN'])) {
    redirect('/templates')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create Template</h1>
        <p className="mt-2 text-gray-600">
          Create a reusable template for treatment plans
        </p>
      </div>

      <TemplateEditor mode="create" />
    </div>
  )
}
