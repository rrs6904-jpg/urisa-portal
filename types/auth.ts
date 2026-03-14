export type UserRole =
  | 'admin'
  | 'director'
  | 'production'
  | 'finance'
  | 'readonly'

export type ModuleKey =
  | 'admin'
  | 'catalogs'
  | 'finance'
  | 'inventory'
  | 'production'
  | 'sales'

export interface ModulePermission {
  user_id: string
  module: ModuleKey
  can_view: boolean
  can_create: boolean
  can_edit: boolean
}

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SessionContext {
  user: {
    id: string
    email: string
  }
  profile: Profile
  permissions: ModulePermission[]
}