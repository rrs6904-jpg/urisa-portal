import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getSessionContext } from '../../lib/auth/session'
import { LogoutButton } from '../../components/auth/LogoutButton'

interface DashboardLayoutProps {
  children: ReactNode
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await getSessionContext()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              URISA Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              {session.profile.full_name ?? session.user.email}
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  )
}