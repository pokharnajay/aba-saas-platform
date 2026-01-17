import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getPatients } from '@/actions/patients'
import { Plus } from 'lucide-react'

export default async function PatientsPage() {
  const patients = await getPatients()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
          <p className="mt-2 text-gray-600">
            Manage your patient roster
          </p>
        </div>

        <Link href="/patients/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Patient
          </Button>
        </Link>
      </div>

      {patients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No patients yet
            </h3>
            <p className="text-gray-600 mb-4">
              Get started by adding your first patient
            </p>
            <Link href="/patients/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Patient
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient: any) => (
            <Link key={patient.id} href={`/patients/${patient.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{patient.firstName} {patient.lastName}</span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      patient.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      patient.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                      patient.status === 'DISCHARGED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {patient.status}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Patient Code:</span>{' '}
                      <span className="font-medium">{patient.patientCode}</span>
                    </div>
                    {patient.assignedBCBA && (
                      <div>
                        <span className="text-gray-600">BCBA:</span>{' '}
                        <span className="font-medium">
                          {patient.assignedBCBA.firstName} {patient.assignedBCBA.lastName}
                        </span>
                      </div>
                    )}
                    {patient.dateOfBirth && (
                      <div>
                        <span className="text-gray-600">DOB:</span>{' '}
                        <span className="font-medium">
                          {new Date(patient.dateOfBirth).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
