import { requireModuleAccess } from '../../../lib/auth/helpers'
import { canWrite } from '../../../lib/auth/permissions'

export default async function FinancePage() {
  const session = await requireModuleAccess('finance')
  const hasWrite = canWrite(session.permissions, 'finance')

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            finance
          </span>
          {hasWrite && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              escritura habilitada
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Costos, márgenes y reportes financieros operativos.
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-900">
          Módulo en desarrollo
        </h2>
        <p className="mt-1 max-w-sm text-sm text-gray-500">
          Análisis de costos, márgenes por canal y reportes financieros
          consolidados. Disponible en PARTE D del proyecto.
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
