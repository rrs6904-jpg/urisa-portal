'use client'

import { useTransition } from 'react'
import { logoutAction } from '../../lib/auth/actions'

interface LogoutButtonProps {
  collapsed?: boolean
}

export function LogoutButton({ collapsed = false }: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await logoutAction()
    })
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      title="Cerrar sesión"
      aria-label="Cerrar sesión"
      className={[
        'flex w-full items-center rounded-md px-3 py-2 text-sm font-medium',
        'text-gray-600 transition-colors duration-150',
        'hover:bg-gray-100 hover:text-gray-900',
        'disabled:cursor-not-allowed disabled:opacity-50',
        collapsed ? 'justify-center' : 'justify-start gap-3',
      ].join(' ')}
    >
      <svg
        className="h-5 w-5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      {!collapsed && (
        <span>{isPending ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
      )}
    </button>
  )
}
