import type { ModuleKey, ModulePermission, UserRole } from '../../types/auth'

const ALL_MODULE_KEYS: ModuleKey[] = [
  'admin',
  'catalogs',
  'finance',
  'inventory',
  'production',
  'sales',
]

export function buildDefaultPermissions(
  role: UserRole,
  userId: string
): ModulePermission[] {
  const permissions: ModulePermission[] = ALL_MODULE_KEYS.map((module) => ({
    user_id: userId,
    module,
    can_view: false,
    can_create: false,
    can_edit: false,
  }))

  const grant = (
    module: ModuleKey,
    can_view = true,
    can_create = false,
    can_edit = false
  ) => {
    const item = permissions.find((p) => p.module === module)
    if (!item) return
    item.can_view = can_view
    item.can_create = can_create
    item.can_edit = can_edit
  }

  switch (role) {
    case 'admin':
      ALL_MODULE_KEYS.forEach((module) => grant(module, true, true, true))
      break

    case 'director':
      grant('catalogs', true, false, false)
      grant('finance', true, false, false)
      grant('inventory', true, false, false)
      grant('production', true, false, false)
      grant('sales', true, false, false)
      break

    case 'production':
      grant('production', true, true, true)
      grant('inventory', true, false, false)
      break

    case 'finance':
      grant('finance', true, true, true)
      grant('inventory', true, false, false)
      grant('sales', true, false, false)
      break

    case 'readonly':
      grant('catalogs', true, false, false)
      grant('finance', true, false, false)
      grant('inventory', true, false, false)
      grant('production', true, false, false)
      grant('sales', true, false, false)
      break
  }

  return permissions
}

export function hasPermission(
  permissions: ModulePermission[],
  module: ModuleKey
): boolean {
  return permissions.some((p) => p.module === module && p.can_view)
}

export function canWrite(
  permissions: ModulePermission[],
  module: ModuleKey
): boolean {
  return permissions.some(
    (p) => p.module === module && (p.can_create || p.can_edit)
  )
}