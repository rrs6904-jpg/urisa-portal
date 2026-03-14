import Link from 'next/link'
import type { Metadata } from 'next'
import type { AuthErrorCode } from '@/types/auth'

export const metadata: Metadata = {
  title: 'Acceso no autorizado | URISA Dashboard',
}

interface ReasonContent {
  title: string
  description: string
  showContactAdmin: boolean
  showLoginButton: boolean
  showDashboardButton: boolean
}

const REASON_CONTENT: Record<AuthErrorCode, ReasonContent> = {
  'no-profile': {
    title: 'Perfil no encontrado',
    description:
      'Tu cuenta no tiene un perfil configurado en el sistema. Esto puede deberse a un error durante la creación de la cuenta.',
    showContactAdmin: true,
    showLoginButton: false,
    showDashboardButton: false,
  },
  inactive: {
    title: 'Cuenta desactivada',
    description:
      'Tu cuenta fue desactivada por un administrador. Si necesitas reactivarla, comunícate con el equipo de soporte.',
    showContactAdmin: true,
    showLoginButton: false,
    showDashboardButton: false,
  },
  'no-permissions': {
    title: 'Sin permisos para este módulo',
    description:
      'Tu rol no incluye acceso a este módulo. Si necesitas acceso, solicítalo al administrador del sistema.',
    showContactAdmin: true,
    showLoginButton: false,
    showDashboardButton: true,
  },
  unauthorized: {
    title: 'Acceso no autorizado',
    description:
      'No tienes permiso para acceder a esta sección. Si crees que es un error, contacta al administrador.',
    showContactAdmin: false,
    showLoginButton: false,
    showDashboardButton: true,
  },
  'session-expired': {
    title: 'Sesión expirada',
    description:
      'Tu sesión expiró por inactividad. Inicia sesión nuevamente para continuar.',
    showContactAdmin: false,
    showLoginButton: true,
    showDashboardButton: false,
  },
}

const DEFAULT_CONTENT: ReasonContent = {
  title: 'Acceso denegado',
  description: 'No tienes autorización para ver esta página.',
  showContactAdmin: false,
  showLoginButton: false,
  showDashboardButton: true,
}

interface UnauthorizedPageProps {
  searchParams: Promise<{
    reason?: string
    module?: string
  }>
}

export default async function UnauthorizedPage({
  searchParams,
}: UnauthorizedPageProps) {
  const { reason, module: moduleName } = await searchParams

  const content =
    reason && Object.prototype.hasOwnProperty.call(REASON_CONTENT, reason)
      ? REASON_CONTENT[reason as AuthErrorCode]
      : DEFAULT_CONTENT

  const hasPrimaryAction =
    content.showDashboardButton || content.showLoginButton

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-gray-900">{content.title}</h1>

          {moduleName && (
            <span className="mt-2 inline-block rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-700">
              Módulo: {moduleName}
            </span>
          )}

          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            {content.description}
          </p>

          <div className="mt-8 flex flex-col gap-3">
            {content.showDashboardButton && (
              <Link
                href="/dashboard"
                className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Ir al Dashboard
              </Link>
            )}

            {content.showLoginButton && (
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Iniciar sesión
              </Link>
            )}

            {content.showContactAdmin && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-left">
                <p className="text-sm text-amber-800">
                  <span className="font-medium">Acción requerida:</span>{' '}
                  Contacta al administrador del sistema para resolver este
                  problema.
                </p>
              </div>
            )}

            {!hasPrimaryAction && (
              <Link
                href="/dashboard"
                className="inline-flex w-full items-center justify-center rounded-md bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                ← Volver al inicio
              </Link>
            )}
          </div>

          {reason && (
            <p className="mt-6 text-xs text-gray-300">Código: {reason}</p>
          )}
        </div>
      </div>
    </main>
  )
}
