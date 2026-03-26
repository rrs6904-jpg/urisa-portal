import { Suspense } from 'react'
import type { Metadata } from 'next'
import LoginForm from '../../components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Iniciar sesión | URISA Dashboard',
}

interface LoginPageProps {
  searchParams: Promise<{
    redirectTo?: string
    error?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirectTo, error } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              URISA Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Sistema de gestión operativa
            </p>
          </div>

          <Suspense
            fallback={
              <div className="space-y-5">
                <div className="h-9 w-full animate-pulse rounded-md bg-gray-100" />
                <div className="h-9 w-full animate-pulse rounded-md bg-gray-100" />
                <div className="h-10 w-full animate-pulse rounded-md bg-blue-100" />
              </div>
            }
          >
            <LoginForm redirectTo={redirectTo} error={error} />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          URISA Compresores &copy; {new Date().getFullYear()}
        </p>
      </div>
    </main>
  )
}
