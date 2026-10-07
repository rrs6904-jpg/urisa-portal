import { redirect } from 'next/navigation'
import { createClient } from '../supabase/server'

// Validates the current identity and active profile at each entry point.
export async function redirectToAppsmith(): Promise<never> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('is_active').eq('id', user.id).single()
  if (profileError || !profile || profile.is_active !== true || !user.email) {
    redirect('/unauthorized')
  }

  const configuredUrl = process.env.NEXT_PUBLIC_APPSMITH_APP_URL
  let target: URL | undefined
  try {
    if (configuredUrl) target = new URL(configuredUrl)
  } catch {
    // Fail closed for missing or invalid deployment configuration.
  }
  if (!target || target.protocol !== 'https:' || target.username || target.password) {
    redirect('/unauthorized')
  }

  // Compatibility parameter only: Appsmith must validate identity independently.
  target.searchParams.set('email', user.email)
  redirect(target.toString())
}
