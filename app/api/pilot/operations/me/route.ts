import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const headers = { 'Cache-Control': 'no-store, private' }
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers })

    // No actor, role, or email from the URL/body; the RPC derives it from auth.uid().
    const { data, error: permissionError } = await supabase.rpc('pilot_operations_identity')
    if (permissionError) {
      const denied = permissionError.code === '42501'
      return NextResponse.json({ error: denied ? 'access_denied' : 'backend_unavailable' },
        { status: denied ? 403 : 503, headers })
    }
    if (!data) return NextResponse.json({ error: 'access_denied' }, { status: 403, headers })
    return NextResponse.json({ pilot: true, read_only: true, actor: data }, { headers })
  } catch {
    return NextResponse.json({ error: 'backend_unavailable' }, { status: 503, headers })
  }
}
