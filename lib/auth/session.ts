import { redirect } from 'next/navigation'
import { createClient } from '../supabase/server'
import { buildDefaultPermissions } from './permissions'
import type {
  ModulePermission,
  Profile,
  SessionContext,
  UserRole,
} from '../../types/auth'

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient()

  // Step 1: Verify authenticated user — never use getSession()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return null
  }

  // Step 2: Load profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (profileError || !profileData) {
    redirect('/unauthorized?reason=no-profile')
  }

  const profile = profileData as Profile

  // Step 3: Guard inactive accounts
  if (!profile.is_active) {
    redirect('/unauthorized?reason=inactive')
  }

  // Step 4: Load module permissions — fall back to role defaults if none assigned
  const { data: permsData, error: permsError } = await supabase
    .from('user_module_permissions')
    .select('user_id, module, can_view, can_create, can_edit')
    .eq('user_id', user.id)

  const permissions: ModulePermission[] =
    !permsError && permsData && permsData.length > 0
      ? (permsData as ModulePermission[])
      : buildDefaultPermissions(profile.role as UserRole, user.id)

  return {
    user: {
      id: user.id,
      email: user.email ?? '',
    },
    profile,
    permissions,
  }
}
