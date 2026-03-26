'use client'

import { useTransition } from 'react'
import { loginAction } from '../../lib/auth/actions'
import type { AuthErrorCode } from '../../types/auth'

interface LoginFormProps {
  redirectTo?: string
  error?: AuthErrorCode | string
}

export default function LoginForm({
  redirectTo,
  error,
}: LoginFormProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await loginAction(formData)
        })
      }}
      className="space-y-4"
    >
      <input
        type="hidden"
        name="redirectTo"
        value={redirectTo ?? '/dashboard'}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Correo electrónico
        </label>
        <input
          type="email"
          name="email"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Contraseña
        </label>
        <input
          type="password"
          name="password"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600">
          {error === 'unauthorized' && 'Correo o contraseña incorrectos.'}
          {error === 'no-profile' && 'Tu cuenta no tiene perfil configurado.'}
          {error === 'inactive' && 'Tu cuenta está desactivada.'}
          {error !== 'unauthorized' &&
            error !== 'no-profile' &&
            error !== 'inactive' &&
            'No fue posible iniciar sesión.'}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isPending ? 'Ingresando...' : 'Iniciar sesión'}
      </button>
    </form>
  )
}