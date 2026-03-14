'use client'

import { useTransition } from 'react'
import { loginAction } from '@/lib/auth/actions'
import type { AuthErrorCode } from '@/types/auth'

interface LoginFormProps {
  redirectTo?: string
  error?: string
}

const ERROR_MESSAGES: Record<AuthErrorCode | string, string> = {
  unauthorized:
    'Credenciales incorrectas. Verifica tu correo y contraseña.',
  'no-profile':
    'Tu cuenta no tiene un perfil configurado. Contacta al administrador.',
  inactive:
    'Tu cuenta está desactivada. Contacta al administrador.',
  'no-permissions':
    'Tu cuenta no tiene permisos asignados. Contacta al administrador.',
  'session-expired':
    'Tu sesión expiró. Por favor inicia sesión nuevamente.',
}

export function LoginForm({ redirectTo, error }: LoginFormProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await loginAction(formData)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {redirectTo && (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      )}

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3"
        >
          <p className="text-sm text-red-700">
            {ERROR_MESSAGES[error] ?? 'Error inesperado. Intenta nuevamente.'}
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor="login-email"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Correo electrónico
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Contraseña
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth={4}
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Iniciando sesión...
          </>
        ) : (
          'Iniciar sesión'
        )}
      </button>
    </form>
  )
}
