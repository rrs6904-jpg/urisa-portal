import { requireModuleAccess } from '../../../lib/auth/helpers'
import { canWrite } from '../../../lib/auth/permissions'

export default async function CatalogsPage() {
  const session = await requireModuleAccess('catalogs')
  const hasWrite = canWrite(session.permissions, 'catalogs')

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Catálogos</h1>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
            catalogs
          </span>
          {hasWrite && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              escritura habilitada
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Productos, canales de venta y configuración base del sistema.
        </p>
      </div>
    </div>
  )
}