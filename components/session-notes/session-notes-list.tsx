'use client'

import { useState, useEffect } from 'react'
import { getSessionNotes } from '@/actions/session-notes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Calendar, Clock, User, FileText } from 'lucide-react'
import Link from 'next/link'

interface SessionNotesListProps {
  patientId: number
  canCreate?: boolean
}

export function SessionNotesList({ patientId, canCreate = false }: SessionNotesListProps) {
  const [sessionNotes, setSessionNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNotes() {
      try {
        const result = await getSessionNotes(patientId)
        if (result.error) {
          setError(result.error)
        } else if (result.sessionNotes) {
          setSessionNotes(result.sessionNotes)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch session notes')
      } finally {
        setLoading(false)
      }
    }

    fetchNotes()
  }, [patientId])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Session Notes
          </CardTitle>
          {canCreate && (
            <Link href={`/session-notes/new?patientId=${patientId}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Session Note
              </Button>
            </Link>
          )}
        </div>
        <p className="text-sm text-gray-600">
          Track therapy sessions and patient progress
        </p>
      </CardHeader>
      <CardContent>
        {sessionNotes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No session notes yet</p>
            {canCreate && (
              <Link href={`/session-notes/new?patientId=${patientId}`}>
                <Button>Add First Session Note</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sessionNotes.map((note) => (
              <Link
                key={note.id}
                href={`/session-notes/${note.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <p className="font-semibold text-gray-900">
                        {new Date(note.sessionDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      {note.sessionDuration && (
                        <>
                          <Clock className="h-4 w-4 text-gray-500 ml-2" />
                          <p className="text-sm text-gray-600">{note.sessionDuration} min</p>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <p className="text-sm text-gray-600">
                        {note.createdBy.firstName} {note.createdBy.lastName}
                      </p>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 ml-2">
                        {note.sessionType}
                      </span>
                    </div>

                    {note.treatmentPlan && (
                      <p className="text-xs text-gray-500 mb-2">
                        Plan: {note.treatmentPlan.title} (v{note.treatmentPlan.version})
                      </p>
                    )}

                    {note.sessionNotes && (
                      <p className="text-sm text-gray-700 line-clamp-2 mt-2">
                        {note.sessionNotes}
                      </p>
                    )}

                    {note.goalProgress && Array.isArray(note.goalProgress) && note.goalProgress.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        {note.goalProgress.length} goal(s) tracked
                      </p>
                    )}
                  </div>

                  <span
                    className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ml-3 ${
                      note.sessionStatus === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : note.sessionStatus === 'IN_PROGRESS'
                        ? 'bg-yellow-100 text-yellow-800'
                        : note.sessionStatus === 'SCHEDULED'
                        ? 'bg-blue-100 text-blue-800'
                        : note.sessionStatus === 'CANCELLED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {note.sessionStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
