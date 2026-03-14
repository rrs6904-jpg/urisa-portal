import { requireModuleAccess } from '../../../lib/auth/helpers'
import { canWrite } from '../../../lib/auth/permissions'

export default async function SalesPage() {
  const session = await requireModuleAccess('sales')
  const hasWrite = canWrite(session.permissions, 'sales')

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
            sales
          </span>
          {hasWrite && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              escritura habilitada
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Actividad comercial y desempeño de ventas.
        </p>
      </div>
    </div>
  )
}
