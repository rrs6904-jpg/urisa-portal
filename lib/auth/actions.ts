'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function isSafeRedirect(path: string | null): boolean {
  if (!path) return false
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (path.startsWith('/login')) return false
  if (path.startsWith('/unauthorized')) return false
  return true
}

export async function loginAction(formData: FormData): Promise<void> {
  const emailEntry = formData.get('email')
  const passwordEntry = formData.get('password')
  const redirectToEntry = formData.get('redirectTo')

  const email =
    typeof emailEntry === 'string' ? emailEntry.trim() : null
  const password =
    typeof passwordEntry === 'string' ? passwordEntry : null
  const redirectTo =
    typeof redirectToEntry === 'string' ? redirectToEntry : null

  if (!email || !password) {
    redirect('/login?error=unauthorized')
  }

  const supabase = await createClient()

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({ email, password })

  if (authError || !authData.user) {
    redirect('/login?error=unauthorized')
  }

  const userId = authData.user.id

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, is_active')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    await supabase.auth.signOut()
    redirect('/login?error=no-profile')
  }

  if (!profile.is_active) {
    await supabase.auth.signOut()
    redirect('/login?error=inactive')
  }

  redirect(isSafeRedirect(redirectTo) ? (redirectTo as string) : '/dashboard')
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
