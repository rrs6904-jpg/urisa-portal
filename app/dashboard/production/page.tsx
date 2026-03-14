import { requireModuleAccess } from '../../../lib/auth/helpers'
import { canWrite } from '../../../lib/auth/permissions'

export default async function ProductionPage() {
  const session = await requireModuleAccess('production')
  const hasWrite = canWrite(session.permissions, 'production')

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Producción</h1>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            production
          </span>
          {hasWrite && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              escritura habilitada
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Gestión de órdenes y líneas de producción de URISA Compresores.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <svg
            className="h-7 w-7 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-900">
          Módulo en desarrollo
        </h2>
        <p className="mt-1 max-w-sm text-sm text-gray-500">
          Órdenes de producción, líneas activas y seguimiento de avance.
          Disponible en PARTE D del proyecto.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
          <span className="text-xs font-medium text-amber-700">
            Pendiente de implementación
          </span>
        </div>
      </div>
    </div>
  )
}
