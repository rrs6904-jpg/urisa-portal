type RpcResult<T> = {
  data: T | null
  error: { message?: string; code?: string } | null
}

function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!value) throw new Error('Missing Supabase URL')
  return value.replace(/\/$/, '')
}

function secretKey(): string {
  const value = process.env.URISA_SUPABASE_SECRET_KEY
  if (!value || !value.startsWith('sb_secret_')) {
    throw new Error('Missing or invalid URISA_SUPABASE_SECRET_KEY')
  }
  return value
}

export async function serverRpc<T>(
  name:
    | 'erp_issue_login_code'
    | 'erp_exchange_login_code'
    | 'erp_validate_session'
    | 'erp_revoke_session'
    | 'erp_bind_appsmith_token'
    | 'erp_refresh_appsmith_token_v1'
    | 'erp_validate_session_rolling_v1'
    | 'erp_general_issue_login_code_v1'
    | 'erp_general_bind_appsmith_token_v1'
    | 'erp_general_validate_rolling_v1',
  body: Record<string, unknown>,
): Promise<RpcResult<T>> {
  const key = secretKey()

  const response = await fetch(`${supabaseUrl()}/rest/v1/rpc/${name}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    let message = 'RPC failed'
    try {
      const payload = await response.json()
      message = typeof payload?.message === 'string' ? payload.message : message
    } catch {}
    return { data: null, error: { message, code: String(response.status) } }
  }

  return { data: (await response.json()) as T, error: null }
}
