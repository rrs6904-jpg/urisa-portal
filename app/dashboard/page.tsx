import Link from 'next/link'
import { requireAuth } from '../../lib/auth/helpers'

const MODULES = [
  {
    key: 'production',
    label: 'Production',
    href: '/dashboard/production',
    description: 'Production KPIs and operational records.',
  },
  {
    key: 'sales',
    label: 'Sales',
    href: '/dashboard/sales',
    description: 'Sales activity and commercial performance.',
  },
  {
    key: 'inventory',
    label: 'Inventory',
    href: '/dashboard/inventory',
    description: 'Finished goods and inventory snapshots.',
  },
  {
    key: 'finance',
    label: 'Finance',
    href: '/dashboard/finance',
    description: 'Financial indicators and cash snapshots.',
  },
  {
    key: 'catalogs',
    label: 'Catalogs',
    href: '/dashboard/catalogs',
    description: 'Base catalogs and system configuration.',
  },
]

export default async function DashboardPage() {
  const session = await requireAuth()

  const displayName = session.profile.full_name ?? session.user.email
  const roleLabel = session.profile.role ?? 'user'

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {displayName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Active role:{' '}
          <span className="font-medium text-gray-700">{roleLabel}</span>
        </p>
      </div>

      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Available modules
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((mod) => (
            <Link
              key={mod.key}
              href={mod.href}
              className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-150 hover:border-blue-200 hover:shadow-md"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {mod.key}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900 transition-colors duration-150 group-hover:text-blue-700">
                {mod.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                {mod.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}