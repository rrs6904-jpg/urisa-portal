// Diagnostic policy only. This module does NOT proxy or authorize live Appsmith traffic.
export const STAGE_PAGES = Object.freeze({
  '6aca7db6ca8e986ee7957afe': 'Home',
  '6aca842aca8e986ee7958031': 'Operations',
})
export const STAGE_PERMISSION_ACTIONS = Object.freeze({
  '6aca8e6fca8e986ee7958050': 'Home',
  '6aca8e6fca8e986ee7958062': 'Operations',
})
export const STAGE_QUARANTINED_ACTIONS = Object.freeze([
  '6aca8e6fca8e986ee7958060', // between
  '6aca8e6fca8e986ee7958048', // cats
  '6aca8e6fca8e986ee7958066', // close_day
  '6aca8e6fca8e986ee795804b', // closures
  '6aca8e6fca8e986ee7958070', // comment
  '6aca8e6fca8e986ee795805d', // create
  '6aca8e6fca8e986ee795804f', // events
  '6aca8e6fca8e986ee7958075', // feed
  '6aca8e6fca8e986ee7958071', // kpis
  '6aca8e6fca8e986ee795806c', // me
  '6aca8e6fca8e986ee7958061', // update
])
export type VerifiedGrant = { appsmith_page: string | null; can_view: boolean }
export type Candidate = { method?: unknown; target?: unknown; actionId?: unknown; viewMode?: unknown }
type Verdict = {
  diagnostic_only: true; execution_allowed: false;
  resource_permission: boolean; reason: string; page?: string;
}
const verdict = (reason: string, resource_permission = false, page?: string): Verdict => ({
  diagnostic_only: true, execution_allowed: false, resource_permission, reason,
  ...(page ? { page } : {}),
})
const lookup = (table: Record<string, string>, key: string): string | undefined =>
  Object.hasOwn(table, key) ? table[key] : undefined

/** grants must come from the server's freshly validated HttpOnly session, never from input. */
export function evaluateStageCandidate(input: Candidate, grants: readonly VerifiedGrant[] | null): Verdict {
  if (!grants || !grants.some(g => g.can_view === true && !!g.appsmith_page)) {
    return verdict('SESSION_OR_GRANTS_INVALID')
  }
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      typeof input.target !== 'string' || typeof input.method !== 'string') {
    return verdict('INVALID_CANDIDATE')
  }
  const raw = input.target
  // Do not normalize ambiguous paths or permit alternate origins, fragments or encoded forms.
  if (raw.length > 1024 || !raw.startsWith('/') || raw.startsWith('//') ||
      /[\\%#\s]/.test(raw) || raw.includes('/../') || raw.includes('/./')) {
    return verdict('NON_CANONICAL_TARGET')
  }
  const url = new URL(raw, 'https://erp.urisacompresores.com')
  const keys = [...url.searchParams.keys()]
  if (new Set(keys).size !== keys.length) return verdict('DUPLICATE_PARAMETER')
  if (keys.some(k => !['defaultPageId', 'branchName', 'refName', 'refType', 'embed'].includes(k))) {
    return verdict('UNSUPPORTED_PARAMETER')
  }
  if (['branchName', 'refName'].some(k => url.searchParams.has(k) && url.searchParams.get(k) !== 'master') ||
      (url.searchParams.has('refType') && url.searchParams.get('refType') !== 'branch')) {
    return verdict('UNSUPPORTED_BRANCH')
  }
  let page: string | undefined
  let kind: string
  if (url.pathname === '/api/v1/actions/execute' && input.method === 'POST') {
    if (keys.length) return verdict('UNSUPPORTED_PARAMETER')
    if (input.viewMode !== true) return verdict('EDITOR_MODE_FORBIDDEN')
    if (typeof input.actionId !== 'string') return verdict('INVALID_ACTION')
    if (STAGE_QUARANTINED_ACTIONS.includes(input.actionId)) return verdict('ACTION_QUARANTINED')
    page = lookup(STAGE_PERMISSION_ACTIONS, input.actionId)
    kind = 'SERVER_SESSION_ADAPTER_REQUIRED'
  } else if (input.method === 'GET' && url.pathname === '/api/v1/consolidated-api/view') {
    if (keys.includes('embed')) return verdict('UNSUPPORTED_PARAMETER')
    page = lookup(STAGE_PAGES, url.searchParams.get('defaultPageId') || '')
    // The response also contains application-wide page metadata and JS collections.
    kind = 'RESPONSE_FILTER_REQUIRED'
  } else if (input.method === 'GET') {
    if (keys.some(k => k !== 'embed') ||
        (keys.includes('embed') && url.searchParams.get('embed') !== 'true')) {
      return verdict('UNSUPPORTED_PARAMETER')
    }
    const m = /^\/app\/urisa-erp-sso-stage\/(home|operations)-([a-f0-9]{24})$/.exec(url.pathname)
    page = m ? lookup(STAGE_PAGES, m[2]) : undefined
    if (page && m && m[1] !== page.toLowerCase()) return verdict('PAGE_SLUG_MISMATCH')
    kind = 'PERIMETER_NOT_CERTIFIED'
  } else return verdict('UNSUPPORTED_METHOD_OR_ROUTE')
  if (!page) return verdict('RESOURCE_NOT_IN_STAGE')
  const permitted = page === 'Home' || grants.some(g => g.appsmith_page === page && g.can_view === true)
  return permitted ? verdict(kind, true, page) : verdict('PAGE_DENIED', false, page)
}
