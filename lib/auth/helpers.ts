import { redirect } from 'next/navigation'
import { createClient } from '../supabase/server'
import { buildDefaultPermissions } from './permissions'
import type {
  ModuleKey,
  ModulePermission,
  Profile,
  SessionContext,
  UserRole,
} from '../../types/auth'

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function getCurrentProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, created_at, updated_at')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return data as Profile
}

export async function getUserModulePermissions(
  userId: string,
  role: UserRole
): Promise<ModulePermission[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_module_permissions')
    .select('user_id, module, can_view, can_create, can_edit')
    .eq('user_id', userId)
  if (error || !data || data.length === 0) {
    return buildDefaultPermissions(role, userId)
  }
  return data as ModulePermission[]
}

export async function requireAuth(currentPath?: string): Promise<SessionContext> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    const qs = currentPath
      ? `?redirectTo=${encodeURIComponent(currentPath)}`
      : ''
    redirect(`/login${qs}`)
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (profileError || !profileData) {
    redirect('/unauthorized?reason=no-profile')
  }

  const profile = profileData as Profile

  if (!profile.is_active) {
    await supabase.auth.signOut()
    redirect('/unauthorized?reason=inactive')
  }

  const { data: permsData, error: permsError } = await supabase
    .from('user_module_permissions')
    .select('user_id, module, can_view, can_create, can_edit')
    .eq('user_id', user.id)

  const permissions: ModulePermission[] =
    !permsError && permsData && permsData.length > 0
      ? (permsData as ModulePermission[])
      : buildDefaultPermissions(profile.role, user.id)

  return {
    user: { id: user.id, email: user.email ?? '' },
    profile,
    permissions,
  }
}

export async function requireRole(
  allowedRoles: UserRole[],
  currentPath?: string
): Promise<SessionContext> {
  const session = await requireAuth(currentPath)
  if (!allowedRoles.includes(session.profile.role)) {
    redirect('/unauthorized?reason=unauthorized')
  }
  return session
}

export async function requireModuleAccess(
  module: ModuleKey,
  currentPath?: string
): Promise<SessionContext> {
  const session = await requireAuth(currentPath)
  const permission = session.permissions.find((p) => p.module === module)
  if (!permission?.can_view) {
    redirect(
      `/unauthorized?reason=no-permissions&module=${encodeURIComponent(module)}`
    )
  }
  return session
}
