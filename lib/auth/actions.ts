'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../supabase/server'

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

  const appsmithBaseUrl = process.env.NEXT_PUBLIC_APPSMITH_APP_URL

  if (!appsmithBaseUrl) {
    redirect('/login?error=appsmith-url-missing')
  }

  const separator = appsmithBaseUrl.includes('?') ? '&' : '?'
  const appsmithTargetUrl = `${appsmithBaseUrl}${separator}email=${encodeURIComponent(email)}`

  redirect(appsmithTargetUrl)
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}