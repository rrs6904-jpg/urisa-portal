import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'

interface ErpLoginPageProps {
  searchParams: Promise<{
    redirectTo?: string
    error?: string
  }>
}

export default async function ErpLoginPage({ searchParams }: ErpLoginPageProps) {
  const { redirectTo, error } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">URISA ERP</h1>
            <p className="mt-1 text-sm text-gray-500">
              Usa tu misma cuenta del portal
            </p>
          </div>

          <Suspense fallback={<div className="h-40 animate-pulse rounded-md bg-gray-100" />}>
            <LoginForm redirectTo={redirectTo} error={error} />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
