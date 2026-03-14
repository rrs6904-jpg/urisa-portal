import Link from 'next/link'
import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth/helpers'

export const metadata: Metadata = {
  title: 'Administración | URISA Dashboard',
}

const ADMIN_SECTIONS = [
  {
    title: 'Usuarios',
    description: 'Gestión de cuentas, activación y desactivación de usuarios.',
    icon: 'users',
  },
  {
    title: 'Roles y permisos',
    description: 'Asignación de roles y configuración de permisos por módulo.',
    icon: 'shield',
  },
  {
    title: 'Auditoría del sistema',
    description: 'Registro de acciones administrativas y cambios de configuración.',
    icon: 'log',
  },
  {
    title: 'Configuración general',
    description: 'Parámetros globales del sistema URISA Compresores.',
    icon: 'cog',
  },
]

export default async function AdminPage() {
  const session = await requireRole(['admin'])

  const displayName = session.profile.full_name ?? session.user.email

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="flex h-16 items-center border-b border-gray-200 bg-white px-6">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
          <span className="text-sm font-bold text-white">U</span>
        </div>
        <span className="ml-3 text-sm font-semibold text-gray-900">
          URISA — Administración
        </span>

        <div className="flex flex-1 items-center justify-end gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Volver al Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight text-gray-900">
                {displayName}
              </p>
              <p className="text-xs leading-tight text-gray-500">
                Administrador
              </p>
            </div>
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600"
              aria-hidden="true"
            >
              <span className="text-xs font-semibold text-white">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Page header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Administración del sistema
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestión de usuarios, roles, permisos y configuración global de
              URISA Compresores.
            </p>
          </div>
        </div>

        {/* Access badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5">
          <svg
            className="h-3.5 w-3.5 text-blue-600"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-medium text-blue-700">
            Acceso restringido — solo administradores
          </span>
        </div>

        {/* Sections grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {ADMIN_SECTIONS.map((section) => (
            <div
              key={section.title}
              className="flex flex-col rounded-xl border border-dashed border-gray-300 bg-white p-6"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <AdminSectionIcon icon={section.icon} />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">
                {section.title}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                {section.description}
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                <span className="text-xs text-amber-600">
                  Pendiente de implementación
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Placeholder notice */}
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <svg
              className="h-7 w-7 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900">
            Panel de administración en desarrollo
          </h2>
          <p className="mt-1 max-w-sm mx-auto text-sm text-gray-500">
            La gestión completa de usuarios, roles y permisos estará disponible
            en PARTE D del proyecto.
          </p>
        </div>
      </div>
    </div>
  )
}

function AdminSectionIcon({ icon }: { icon: string }) {
  const cls = 'h-5 w-5 text-gray-400'

  switch (icon) {
    case 'users':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    case 'shield':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    case 'log':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    case 'cog':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    default:
      return null
  }
}
