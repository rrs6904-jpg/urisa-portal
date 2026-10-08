'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../supabase/server'
import { redirectToAppsmith } from './appsmith'
import { isOpaqueToken } from '../erp/token'

function safeErpAuthorizeRedirect(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null

  let parsed: URL
  try {
    parsed = new URL(value, 'https://portal.urisacompresores.com')
  } catch {
    return null
  }

  if (
    parsed.origin !== 'https://portal.urisacompresores.com' ||
    parsed.pathname !== '/erp/authorize'
  ) {
    return null
  }

  const nonce = parsed.searchParams.get('nonce')
  if (!isOpaqueToken(nonce)) return null

  return `/erp/authorize?nonce=${encodeURIComponent(nonce)}`
}

export async function loginAction(formData: FormData) {
  const supabase = await createClient()

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    redirect('/login?error=unauthorized')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.session) {
    redirect('/login?error=unauthorized')
  }

  const erpRedirect = safeErpAuthorizeRedirect(formData.get('redirectTo'))
  if (erpRedirect) redirect(erpRedirect)

  await redirectToAppsmith()
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
