import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const response = NextResponse.redirect(
    new URL('https://portal.urisacompresores.com/login'),
    302,
  )
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
