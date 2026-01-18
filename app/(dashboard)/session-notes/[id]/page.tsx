import { auth } from '@/lib/auth/auth-config'
import { redirect, notFound } from 'next/navigation'
import { getSessionNote } from '@/actions/session-notes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Edit, Calendar, Clock, User, FileText, CheckCircle } from 'lucide-react'

export default async function SessionNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const resolvedParams = await params
  const sessionNoteId = parseInt(resolvedParams.id)
  if (isNaN(sessionNoteId)) {
    notFound()
  }

  try {
    const result = await getSessionNote(sessionNoteId)

    if (result.error) {
      redirect('/patients')
    }

    const sessionNote = result.sessionNote!

    const canEdit = sessionNote.createdById === parseInt(session.user.id)

    return (
      <div className="max-w-4xl mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/patients/${sessionNote.patientId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Patient
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Session Note</h1>
              <p className="text-gray-600 mt-1">
                {sessionNote.patient.firstName} {sessionNote.patient.lastName} ({sessionNote.patient.patientCode})
              </p>
            </div>
          </div>
          {canEdit && (
            <Link href={`/session-notes/${sessionNote.id}/edit`}>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
        </div>

        {/* Session Details */}
        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Session Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Session Date</p>
                <p className="text-base font-semibold text-gray-900">
                  {new Date(sessionNote.sessionDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {sessionNote.sessionDuration && (
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    <Clock className="inline h-4 w-4 mr-1" />
                    Duration
                  </p>
                  <p className="text-base font-semibold text-gray-900">{sessionNote.sessionDuration} minutes</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Session Type</p>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 inline-block mt-1">
                  {sessionNote.sessionType}
                </span>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium inline-block mt-1 ${
                    sessionNote.sessionStatus === 'COMPLETED'
                      ? 'bg-green-100 text-green-800'
                      : sessionNote.sessionStatus === 'IN_PROGRESS'
                      ? 'bg-yellow-100 text-yellow-800'
                      : sessionNote.sessionStatus === 'SCHEDULED'
                      ? 'bg-blue-100 text-blue-800'
                      : sessionNote.sessionStatus === 'CANCELLED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {sessionNote.sessionStatus.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  <User className="inline h-4 w-4 mr-1" />
                  Therapist
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {sessionNote.createdBy.firstName} {sessionNote.createdBy.lastName}
                </p>
              </div>

              {sessionNote.treatmentPlan && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Treatment Plan</p>
                  <Link
                    href={`/treatment-plans/${sessionNote.treatmentPlan.id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {sessionNote.treatmentPlan.title} (v{sessionNote.treatmentPlan.version})
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Session Notes */}
        {sessionNote.sessionNotes && (
          <Card>
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Session Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap text-gray-700">{sessionNote.sessionNotes}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Parent Feedback */}
        {sessionNote.parentFeedback && (
          <Card>
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle>Parent/Guardian Feedback</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="whitespace-pre-wrap text-gray-700">{sessionNote.parentFeedback}</p>
            </CardContent>
          </Card>
        )}

        {/* Next Session Plan */}
        {sessionNote.nextSessionPlan && (
          <Card>
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle>Next Session Plan</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="whitespace-pre-wrap text-gray-700">{sessionNote.nextSessionPlan}</p>
            </CardContent>
          </Card>
        )}

        {/* Signature */}
        {sessionNote.staffSignature && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="bg-green-100 border-b border-green-200">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                Signed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">Staff Signature</p>
                  <p className="text-lg font-semibold text-gray-900 italic">{sessionNote.staffSignature}</p>
                </div>
                {sessionNote.signedAt && (
                  <div>
                    <p className="text-sm text-gray-600">
                      Signed on{' '}
                      {new Date(sessionNote.signedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                Created on {new Date(sessionNote.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div>
                Last updated {new Date(sessionNote.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  } catch (error: any) {
    notFound()
  }
}
